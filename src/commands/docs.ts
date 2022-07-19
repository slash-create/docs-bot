import {
  AutocompleteChoice,
  AutocompleteContext,
  ButtonStyle,
  CommandContext,
  CommandOptionType,
  ComponentActionRow,
  ComponentType,
  EmbedField,
  MessageEmbedOptions,
  MessageOptions,
  SlashCommand,
  SlashCreator
} from 'slash-create';

import { SC_RED, standardObjects, titleCase, docsOptionFactory, shareOption } from '../util/common';
import { BASE_MDN_URL, buildDocsLink, buildGitHubLink } from '../util/linkBuilder';
import {
  CallableDescriptor,
  ChildStructureDescriptor,
  ClassDescriptor,
  FileMeta,
  TypeDescriptor,
  TypeSource,
  TypeSymbol
} from '../util/metaTypes';
import TypeNavigator from '../util/typeNavigator';

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
      case 'class': {
        let matchingKeys = TypeNavigator.fuzzyFilter(focusedOption, 'class');

        if (command === 'event')
          matchingKeys = matchingKeys.filter((value) => 'events' in TypeNavigator.getClassDescriptor(value.string));

        return matchingKeys.map((value) => ({ name: value.string, value: value.string }));
      }
      case 'typedef': {
        const results = TypeNavigator.fuzzyFilter(focusedOption, 'typedef');
        return results.map((value) => ({ name: value.string, value: value.string }));
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
      ...(options.share && {
        footer: {
          text: `Requested by ${ctx.user.username}#${ctx.user.discriminator}`,
          icon_url: ctx.user.avatarURL
        }
      })
    };

    const fragments: [string, string?] = [null, null];
    let typeMeta: FileMeta = null;

    switch (calledType) {
      case 'class':
      case 'typedef': {
        const descriptor = TypeNavigator.findFirstMatch(options[calledType]) as ClassDescriptor | TypeDescriptor;
        try {
          typeMeta = descriptor.meta;
        } catch {
          ctx.send('Entity was `null`, please check arguments.', { ephemeral: true });
          return;
        }

        Object.assign(embed, {
          title: `${descriptor.name}${'extends' in descriptor ? ` *extends \`${descriptor.extends.join('')}\`*` : ''}`,
          description: descriptor.description,
          fields: this.getClassEntityFields(descriptor, 'construct' in descriptor)
        });

        fragments[0] = descriptor.name;
        break;
      }
      default: {
        if (options[calledType] === 'null') {
          // yes... litereal null
          ctx.send('Invalid query, please check arguments.', { ephemeral: true });
          return;
        }

        const typeEntry = TypeNavigator.findFirstMatch(options.class, options[calledType]) as ChildStructureDescriptor;
        try {
          typeMeta = typeEntry.meta;
        } catch {
          ctx.send('Entity was `null`, please check arguments.', { ephemeral: true });
          return;
        }

        const combinedKey = TypeNavigator.joinKey([options.class, options[calledType]], TypeSymbol[calledType]);

        Object.assign(embed, {
          title: combinedKey,
          description: typeEntry.description
        });

        if ('type' in typeEntry)
          embed.fields.push({
            name: 'Type',
            value: this.resolveType(typeEntry.type)
          });

        if ('params' in typeEntry)
          // calledType !== 'prop'
          embed.fields.push(...this.getArgumentEntityFields(typeEntry, calledType));

        if ('returns' in typeEntry)
          // calledType === 'method'
          embed.fields.push({
            name: 'Returns',
            value: this.resolveType(typeEntry.returns)
          });

        // exact check, if typeEntry were a class i'd do instance of... maybe
        fragments[0] = options.class;
        fragments[1] = (calledType === 'event' ? 'e-' : '') + options[calledType];
      }
    }

    return {
      embeds: [embed],
      ephemeral: !options.share,
      components: this.getLinkComponents(fragments, typeMeta, calledType === 'typedef')
    };
  }

  private getLinkComponents = (target: [string, string?], meta: FileMeta, isTypedef: boolean): ComponentActionRow[] => [
    {
      type: ComponentType.ACTION_ROW,
      components: [
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
      ]
    }
  ];

  private getArgumentEntityFields = (argumentParent: CallableDescriptor, entityType: string): EmbedField[] => {
    const { params } = argumentParent;

    if (!params.length) return [];

    return params.map((argument, index) => ({
      name: index === 0 ? `${titleCase(entityType)} Arguments` : '\u200b',
      value: [
        `\`${argument.name}\` - ${this.resolveType(argument.type)} ${
          argument.default ? `= ${argument.default}` : ''
        }`.trim(),
        `${argument.description}`
      ].join('\n')
    }));
  };

  private getClassEntityFields = (classEntry: ClassDescriptor | TypeDescriptor, isClass: boolean): EmbedField[] =>
    [
      // ...('construct' in classEntry && this.getArgumentEntityFields(classEntry.construct, 'constructor')),
      'props' in classEntry && {
        name: `📏 ${isClass ? this.buildCommandMention('prop') : 'Properties'} (${classEntry.props.length})`,
        value:
          classEntry.props
            .filter((propEntry) => !propEntry.name.startsWith('_'))
            .map(({ name }) => `\`${name}\``)
            .join('\n') || 'None',
        inline: true
      },
      'methods' in classEntry && {
        name: `🔧 ${isClass ? this.buildCommandMention('method') : 'Method'} (${classEntry.methods.length})`,
        value:
          classEntry.methods
            .filter((methodEntry) => methodEntry.access !== 'private' || !methodEntry.name.startsWith('_'))
            // .map((methodEntry) => `[${methodEntry.name}](${buildDocsLink('class', className, methodEntry.name)})`)
            .map(({ name }) => `\`${name}\``)
            .join(`\n`) || 'None',
        inline: true
      },
      'events' in classEntry && {
        name: `⌚ ${isClass ? this.buildCommandMention('event') : 'Events'} (${classEntry.events.length})`,
        value:
          classEntry.events
            // implied of the existance as a a class
            // .map((eventEntry) => `[${eventEntry.name}](${buildDocsLink('class', typeEntry.name, eventEntry.name)})`)
            .map(({ name }) => `\`${name}\``)
            .join('\n') || 'None',
        inline: true
      }
    ].filter((field) => field && field.value !== 'None');

  private resolveType = (type: string[][][]): string =>
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
    `</${this.commandName} ${commandName}:${this.ids.get('global')}>`;
}
