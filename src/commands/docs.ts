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

import { component as deleteComponent } from '../components/delete-repsonse';
import { SC_RED, standardObjects, titleCase, docsOptionFactory, shareOption } from '../util/common';
import { BASE_MDN_URL, buildDocsLink, buildGitHubLink } from '../util/linkBuilder';
import {
  AnyParentDescriptor,
  AnyStructureDescriptor,
  CallableDescriptor,
  ChildStructureDescriptor,
  ClassDescriptor,
  FileMeta,
  TypeSource,
  TypeSymbol
} from '../util/metaTypes';
import TypeNavigator from '../util/typeNavigator';
import { command } from '../util/markup';

export default class DocumentationCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'docs',
      description: 'Search documentation entries.',
      // functionality here is derived from Eris' docs bot
      options: [
        {
          name: 'class',
          description: 'Get entry for a class.',
          type: CommandOptionType.SUB_COMMAND,
          options: [docsOptionFactory('class'), shareOption]
        },
        {
          name: 'event',
          description: 'Get entry for an event.',
          type: CommandOptionType.SUB_COMMAND,
          options: [docsOptionFactory('class'), docsOptionFactory('event'), shareOption]
        },
        {
          name: 'method',
          type: CommandOptionType.SUB_COMMAND,
          description: 'Get entry for a method.',
          options: [docsOptionFactory('class'), docsOptionFactory('method'), shareOption]
        },
        {
          name: 'prop',
          description: 'Get entry for a class prop.',
          type: CommandOptionType.SUB_COMMAND,
          options: [docsOptionFactory('class'), docsOptionFactory('prop'), shareOption]
        },
        {
          name: 'typedef',
          description: 'Get entry for a type definition.',
          type: CommandOptionType.SUB_COMMAND,
          options: [docsOptionFactory('typedef'), shareOption]
        }
      ]
    });
  }

  async autocomplete(ctx: AutocompleteContext): Promise<AutocompleteChoice[] | void> {
    const command = ctx.subcommands[0];
    const focusedOption: string = ctx.options[command][ctx.focused];

    switch (ctx.focused) {
      case 'class':
      case 'typedef': {
        let matchingKeys = TypeNavigator.fuzzyFilter(focusedOption, ctx.focused);

        if (command === 'event')
          matchingKeys = matchingKeys.filter((value) => 'events' in TypeNavigator.getClassDescriptor(value.string));

        return matchingKeys.map((value) => ({ name: value.string, value: value.string }));
      }
      case 'event':
      case 'method':
      case 'prop':
        return this.commonAutocompleteSearch(ctx, command);
      default: {
        return [];
      }
    }
  }

  async commonAutocompleteSearch(ctx: AutocompleteContext, command: string): Promise<AutocompleteChoice[]> {
    const options = ctx.options[command];
    if (!options.class)
      return [
        {
          name: 'Search for a class entry first.',
          value: 'null'
        }
      ];

    const assumedPartialKey = TypeNavigator.joinKey([options.class, options[ctx.focused]], TypeSymbol[ctx.focused]);

    /**
     * argument 2: {focused} has certainty of being one of the three options selected within each subcommand
     * either the subcommand itself, or the option can be used - no difference as to the outcome (including forced type assertion)
     */
    const results = TypeNavigator.fuzzyFilter(assumedPartialKey, ctx.focused as TypeSource);
    // const classEntry = TypeNavigator.getClassDescriptor(options.class);
    return results
      .map((entry) => {
        const typeEntry = TypeNavigator.findFirstMatch(entry.string);

        const params = 'params' in typeEntry ? typeEntry.params : [];
        const hasArguments = params && params.length > 0;

        return {
          name: `${entry.string} ${hasArguments ? `(${params.length} arguments)` : ''} {score: ${entry.score}}`.trim(),
          value: typeEntry.name
        };
      })
      .filter(Boolean);
  }

  async run(ctx: CommandContext): Promise<MessageOptions | string | void> {
    // if (!this.ids.has('global')) this.ids.set('global', ctx.commandID);

    const calledType = ctx.subcommands[0];
    const options = ctx.options[calledType];

    const embed: MessageEmbedOptions = {
      color: SC_RED,
      fields: [],
      timestamp: new Date(ctx.invokedAt),
      footer: {
        text: titleCase(calledType)
      }
    };

    if (options.share) {
      embed.footer.text += ` | Requested by ${ctx.user.username}#${ctx.user.discriminator}`;
      embed.footer.icon_url = ctx.member ? ctx.member.avatarURL : ctx.user.avatarURL;
    }

    const fragments: [string, string?] = [null, null];
    let typeMeta: FileMeta = null;

    switch (calledType) {
      case 'class':
      case 'typedef': {
        const descriptor = TypeNavigator.findFirstMatch(options[calledType]) as AnyParentDescriptor;
        try {
          typeMeta = descriptor.meta;
        } catch {
          return {
            content: 'Entity was `null`, please check arguments.',
            ephemeral: true
          };
        }

        embed.fields = this.getClassEntityFields(descriptor, 'construct' in descriptor);
        embed.title = `${descriptor.name}${
          'extends' in descriptor ? ` *extends \`${descriptor.extends.join('')}\`*` : ''
        }`;

        this.addCommonFields(embed, descriptor);

        fragments[0] = descriptor.name;
        break;
      }
      default: {
        if (options[calledType] === 'null') {
          // yes... literal null
          return {
            content: 'Entity was `null`, please check arguments.',
            ephemeral: true
          };
        }

        const parentEntry = TypeNavigator.findFirstMatch(options.class) as ClassDescriptor;
        const typeEntry = TypeNavigator.findFirstMatch(options.class, options[calledType]) as ChildStructureDescriptor;
        try {
          typeMeta = typeEntry.meta;
        } catch {
          // second catch, in case the parent entry is null
          return {
            content: 'Entity not found, please check arguments.',
            ephemeral: true
          };
        }

        const combinedKey = TypeNavigator.joinKey([options.class, options[calledType]], TypeSymbol[calledType]);

        embed.title = combinedKey;

        this.addCommonFields(embed, typeEntry, parentEntry);

        // exact check, if typeEntry were a class i'd do instance of... maybe
        fragments[0] = options.class;
        fragments[1] = (calledType === 'event' ? 'e-' : '') + options[calledType];
      }
    }

    const components = this.getLinkComponents(fragments, typeMeta, calledType === 'typedef');
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
    targetDescriptor: AnyStructureDescriptor,
    parentDescriptor: AnyParentDescriptor = targetDescriptor as AnyParentDescriptor
    // implied parent of current target is itself
  ): MessageEmbedOptions {
    // embed = { ...embed };

    if ('description' in targetDescriptor)
      embed.description = this.parseDocString(targetDescriptor.description, parentDescriptor);

    if ('type' in targetDescriptor && !('params' in targetDescriptor))
      embed.fields.push({
        name: 'Type',
        value: this.resolveType(targetDescriptor.type)
      });

    if ('params' in targetDescriptor)
      embed.fields.push(...this.getArgumentEntityFields(parentDescriptor, targetDescriptor));

    if ('returns' in targetDescriptor)
      embed.fields.push({
        name: 'Returns',
        value: this.resolveType(targetDescriptor.returns)
      });

    return embed;
  }

  private getLinkComponents = (target: [string, string?], meta: FileMeta, isTypedef: boolean): AnyComponentButton[] => [
    {
      type: ComponentType.BUTTON,
      style: ButtonStyle.LINK,
      url: buildDocsLink(isTypedef ? 'typedef' : 'class', ...target),
      label: 'Open Docs',
      emoji: {
        name: '📕'
      }
    },
    {
      type: ComponentType.BUTTON,
      style: ButtonStyle.LINK,
      url: buildGitHubLink(`${meta.path}/${meta.file}`, [meta.line]),
      label: 'Open GitHub',
      emoji: {
        name: '📂'
      }
    }
  ];

  private getArgumentEntityFields = (parent: AnyParentDescriptor, argument: CallableDescriptor): EmbedField[] => {
    const { params } = argument;

    if (!params.length) return [];

    return params.map((argument, index) => ({
      name: index === 0 ? 'Arguments' : '\u200b',
      value: [
        `\`${argument.name}\` - ${this.resolveType(argument.type)} ${argument.default ? `= ${argument.default}` : ''
          }`.trim(),
        'description' in argument ? this.parseDocString(argument.description, parent) : ''
      ].join('\n')
    }));
  };

  private getClassEntityFields = (parent: AnyParentDescriptor, isClass: boolean): EmbedField[] =>
    [
      // ...('construct' in classEntry && this.getArgumentEntityFields(classEntry.construct, 'constructor')),
      'props' in parent && {
        name: `📏 ${isClass ? this.buildCommandMention('prop') : 'Properties'} (${parent.props.length})`,
        value:
          parent.props
            .filter((propEntry) => !propEntry.name.startsWith('_'))
            .map(({ name }) => `\`${name}\``)
            .join('\n') || 'None',
        inline: true
      },
      'methods' in parent && {
        name: `🔧 ${isClass ? this.buildCommandMention('method') : 'Method'} (${parent.methods.length})`,
        value:
          parent.methods
            .filter((methodEntry) => methodEntry.access !== 'private' || !methodEntry.name.startsWith('_'))
            // .map((methodEntry) => `[${methodEntry.name}](${buildDocsLink('class', className, methodEntry.name)})`)
            .map(({ name }) => `\`${name}\``)
            .join(`\n`) || 'None',
        inline: true
      },
      'events' in parent && {
        name: `⌚ ${isClass ? this.buildCommandMention('event') : 'Events'} (${parent.events.length})`,
        value:
          parent.events
            // implied of the existence as a a class
            // .map((eventEntry) => `[${eventEntry.name}](${buildDocsLink('class', typeEntry.name, eventEntry.name)})`)
            .map(({ name }) => `\`${name}\``)
            .join('\n') || 'None',
        inline: true
      }
    ].filter((field) => field && field.value !== 'None');

  private parseDocString = (docString: string, parentStruct: AnyStructureDescriptor): string =>
    docString.replace(/(?:^|{)@(?:see|link) ([^}]+)(?:}|$)/g, (_, ref) => {
      let prefix = '';

      if (['#', '~'].some((char) => ref.startsWith(char))) {
        prefix = parentStruct.name;
      }

      return this.resolveType([prefix + ref]);
    });

  private resolveType = (type: string[][][] | string[][] | string[]): string =>
    type
      .flat(2)
      .map((fragment) => {
        if (fragment in TypeNavigator.typeMap.all) return `[${fragment}](${buildDocsLink('typdef', fragment)})`;
        else if (fragment in standardObjects) return `[${fragment}](${BASE_MDN_URL}/${standardObjects[fragment]})`;
        return fragment;
      })
      .join('')
      .replace(/(<|>)/g, (brace) => `\\${brace}`);

  private buildCommandMention = (commandName: string) =>
    command([this.commandName, commandName], this.ids.get('global'));
}
