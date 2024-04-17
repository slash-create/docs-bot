import { filter } from 'fuzzy';
import {
  AnyComponentButton,
  AutocompleteChoice,
  AutocompleteContext,
  ButtonStyle,
  CommandContext,
  CommandOptionType,
  ComponentType,
  EmbedField,
  MessageEmbedOptions,
  MessageOptions,
  SlashCommand,
  SlashCreator
} from 'slash-create';

import { ephemeralResponse as _ } from '&common/helpers';
import { libraryOption, queryOption, shareOption, versionOption } from '&discord/command-options';
import { displayUser, getCommandInfo } from '&discord/helpers';
import * as responses from '&discord/responses';
import { BASE_MDN_URL, VERSION_REGEX, standardObjects } from '&docs/constants';
import { TypeNavigator } from '&docs/navigator';
import { Provider } from '&docs/source';
import { AnyCallableDescriptor, AnyDescriptor, AnyStructureDescriptor } from '&docs/types';

import { component as deleteComponent } from '../components/delete-repsonse';
/**
 * /docs search query*: string, version?*: string, share?: boolean = false
 * /docs debug version?*: string
 * /docs manifest version?*: string
 */

export default class DocumentationCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'docs',
      description: 'Query documentation',
      // functionality here was derived from Eris' docs bot
      options: [
        {
          name: 'search',
          description: 'Search documentation entries.',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            libraryOption,
            queryOption,
            versionOption,
            shareOption
          ]
        }
      ]
    });
  }

  async autocomplete(ctx: AutocompleteContext): Promise<AutocompleteChoice[] | void> {
    const { options, focused, focusedOption } = getCommandInfo(ctx);

    if (!options.library && focused !== 'library') return [responses.select];

    switch (ctx.focused) {
      case 'library': {
        return filter(options.library ?? '', Provider.all, { extract: (input) => input.label })
          .map((result) => ({ name: `${result.original.label} (${result.original.docsHost})`, value: result.string }));
      }

      case 'version': {
        const provider = Provider.get(options.library);

        if (!provider) return [responses.unknown];
        if (!provider.aggregator.ready) return [responses.loading];

        const results = focusedOption
          ? provider.aggregator.filter(focusedOption)
          : provider.aggregator.all.slice(0, 20).map((version) => ({ string: version }));

        return results.map((value) => {
          let tagString: string;

          if (VERSION_REGEX.test(value.string)) tagString = 'Release';
          else if (value.string === 'master') tagString = 'Upstream';
          else if (value.string !== 'latest') tagString = 'Branch';
          else tagString = provider.aggregator.latestRelease;

          return { name: `${value.string} (${tagString})`, value: value.string };
        });
      }

      case 'query': {
        const { library, version = 'latest' } = options;

        const provider = Provider.get(library);
        if (!provider) return [responses.unknown];
        if (!provider.aggregator.ready) return [responses.loading];

        const typeNavigator = provider.aggregator.getTag(version);
        if (!typeNavigator.ready) return [responses.loading];

        return typeNavigator.filterEntity(focusedOption).map((value) => {
          return { name: `${value.string} (🧮 ${value.score})`, value: value.string };
        });
      }

      default: {
        return [];
      }
    }
  }

  async run(ctx: CommandContext): Promise<MessageOptions | string | void> {
    if (!this.ids.has('global')) this.ids.set('global', ctx.commandID);

    const [subCommand] = ctx.subcommands;
    const options = ctx.options[subCommand];

    switch (subCommand) {
      case 'search':
        return this.runSearch(ctx, options);
    }
  }

  async runSearch(ctx: CommandContext, options: DocSearchOptions): Promise<MessageOptions | string | void> {
    const provider = Provider.get(options.library);

    if (!provider) return responses.unknown.name;
    if (!provider.aggregator.ready) {
      await ctx.defer(!options.share);
      await provider.aggregator.onReady;
    }

    const typeNavigator = provider.aggregator.getTag(options.version ?? 'latest');
    if (!typeNavigator.ready) {
      await ctx.defer(!options.share);
      await typeNavigator.onReady;
    }

    const descriptor = typeNavigator.get(options.query.split('(')[0].trim());

    // yes... literal null
    if (!descriptor) return _(`Entity was \`null\`, please check arguments.`);

    const embed: MessageEmbedOptions = {
      color: provider.embedColor,
      title: `\`${descriptor.toString()}\``,
      url: typeNavigator.docsURL(descriptor),
      fields: [],
      timestamp: new Date(ctx.invokedAt),
      footer: {
        text: `${provider.label} 🏷️ ${typeNavigator.tag} (🌐 ${provider.docsHost})`,
        icon_url: provider.iconURL
      }
    };

    const fragments: [string, string?] = [descriptor.species === 'event' ? descriptor.name.replace(/^(?=\w)/, 'e-') : descriptor.name];
    if (descriptor.parent) fragments.unshift(descriptor.parent.name);

    if (descriptor.species === 'class' || descriptor.species === 'typedef') {
      embed.fields = this.getClassEntityFields(descriptor);

      if (descriptor.species === 'class' && descriptor.extends)
        embed.title += ` extends \`${descriptor.extends}\``;
    } else
      this.addCommonFields(embed, typeNavigator, descriptor);

    if (options.share) {
      embed.author = {
        name: `Requested by ${displayUser(ctx.user)}`,
        icon_url: (ctx.member ? ctx.member : ctx.user).avatarURL
      }
    }

    const components = this.getLinkComponents(typeNavigator, descriptor);
    if (options.share) components.unshift(deleteComponent);

    return {
      embeds: [embed],
      ephemeral: !options.share,
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components
        }
      ]
    };
  }

  private addCommonFields(
    embed: MessageEmbedOptions,
    navigator: TypeNavigator,
    descriptor: AnyDescriptor
    // implied parent of current target is itself
  ): MessageEmbedOptions {
    // embed = { ...embed };

    if ('description' in descriptor) embed.description = this.parseDocString(navigator, descriptor.description);

    if ('type' in descriptor && !('params' in descriptor))
      embed.fields.push({
        name: 'Type',
        value: this.resolveType(navigator, descriptor.type)
      });

    if ('params' in descriptor) embed.fields.push(...this.getArgumentEntityFields(descriptor));

    if ('returns' in descriptor)
      embed.fields.push({
        name: 'Returns',
        value: this.resolveType(navigator, descriptor.returns)
      });

    return embed;
  }

  private getLinkComponents = (
    navigator: TypeNavigator,
    descriptor: AnyDescriptor
  ): AnyComponentButton[] => [
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.LINK,
        url: navigator.docsURL(descriptor),
        label: 'Open Docs',
        emoji: {
          name: '📕'
        }
      },
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.LINK,
        url: `${navigator.baseRepoURL('blob')}/${descriptor.meta}`,
        label: 'Open GitHub',
        emoji: {
          name: '📂'
        }
      }
    ];

  private getArgumentEntityFields = (argument: AnyCallableDescriptor): EmbedField[] => {
    const { params } = argument;

    if (!params.length) return [];

    return params.map((argument, index) => ({
      name: index === 0 ? 'Arguments' : '\u200b',
      value: [
        `\`${argument.name}\` - ${this.resolveType(argument.navigator, argument.type)} ${argument.default ? `= ${argument.default}` : ''
          }`.trim(),
        'description' in argument ? this.parseDocString(argument.navigator, argument.description) : ''
      ].join('\n')
    }));
  };

  private getClassEntityFields = (parent: AnyStructureDescriptor): EmbedField[] =>
    [
      // ...('construct' in classEntry && this.getArgumentEntityFields(classEntry.construct, 'constructor')),
      'props' in parent && {
        name: `📏 Properties (${parent.props.length})`,
        value:
          parent.props
            .filter((propEntry) => !propEntry.name.startsWith('_'))
            .map(({ name }) => `\`${name}\``)
            .join('\n') || 'None',
        inline: true
      },
      'methods' in parent && {
        name: `🔧 Methods (${parent.methods.length})`,
        value:
          parent.methods
            .filter((methodEntry) => methodEntry.access !== 'private' || !methodEntry.name.startsWith('_'))
            // .map((methodEntry) => `[${methodEntry.name}](${buildDocsLink('class', className, methodEntry.name)})`)
            .map(({ name }) => `\`${name}\``)
            .join(`\n`) || 'None',
        inline: true
      },
      'events' in parent && {
        name: `⌚ Events (${parent.events.length})`,
        value:
          parent.events
            // implied of the existence as a a class
            // .map((eventEntry) => `[${eventEntry.name}](${buildDocsLink('class', typeEntry.name, eventEntry.name)})`)
            .map(({ name }) => `\`${name}\``)
            .join('\n') || 'None',
        inline: true
      }
    ].filter((field) => field && field.value !== 'None');

  private parseDocString = (navigator: TypeNavigator, docString: string): string =>
    docString.replace(/(?:^|{)@(?:see|link) ([^}]+)(?:}|$)/g, (_, ref) => {
      return this.resolveType(navigator, [ref]);
    });

  private resolveType = (navigator: TypeNavigator, type: string[][][] | string[][] | string[] | string): string => {
    return (Array.isArray(type) ? type : [type])
      .flat(2)
      .map((fragment) => {
        if (navigator.map.has(fragment))
          return `[${fragment}](${navigator.aggregator.provider.rawDocsURL(navigator.tag, 'typedef', fragment)})`;
        else if (fragment in standardObjects) return `[${fragment}](${BASE_MDN_URL}/${standardObjects[fragment]})`;
        return fragment;
      })
      .join('')
      .replace(/(<|>)/g, (brace) => `\\${brace}`);
  }
}

interface DocSearchOptions {
  library: string;
  query: string;
  version?: string;
  share?: boolean;
}
