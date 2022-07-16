import { Client as ErisClient } from 'eris';
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

import { SC_RED } from '../util/common';
import { buildDocsLink, buildGitHubLink } from '../util/linkBuilder';
import {
  ChildStructureDescriptor,
  ClassDescriptor,
  EventDescriptor,
  FileMeta,
  MethodDescriptor,
  TypeDescriptor,
  TypeSource,
  TypeSymbol
} from '../util/metaTypes';
import TypeNavigator from '../util/typeNavigator';

export default class DocumentationCommand extends SlashCommand<ErisClient> {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'docs',
      description: 'Says hello to you.',
      // functionality here is derived from Eris' docs bot
      options: [
        {
          name: 'class',
          description: 'Get entry for a class.',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'class',
              description: 'The class to retrieve.',
              type: CommandOptionType.STRING,
              required: true,
              autocomplete: true
            }
          ]
        },
        {
          name: 'event',
          description: 'The event to retrieve.',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'class',
              description: 'The class to retrieve.',
              type: CommandOptionType.STRING,
              required: true,
              autocomplete: true
            },
            {
              name: 'event',
              description: 'The event to retrieve.',
              type: CommandOptionType.STRING,
              required: true,
              autocomplete: true
            }
          ]
        },
        {
          name: 'method',
          type: CommandOptionType.SUB_COMMAND,
          description: 'Get entry for a method.',
          options: [
            {
              name: 'class',
              description: 'The class to retrieve.',
              type: CommandOptionType.STRING,
              required: true,
              autocomplete: true
            },
            {
              name: 'method',
              description: 'The method to retrieve.',
              type: CommandOptionType.STRING,
              required: true,
              autocomplete: true
            }
          ]
        },
        {
          name: 'prop',
          description: 'Get entry for a class prop.',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'class',
              description: 'The class to retrieve.',
              type: CommandOptionType.STRING,
              required: true,
              autocomplete: true
            },
            {
              name: 'prop',
              description: 'The prop to retrieve.',
              type: CommandOptionType.STRING,
              required: true,
              autocomplete: true
            }
          ]
        },
        {
          name: 'typedef',
          description: 'Get entry for a type definition.',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'typedef',
              description: 'The type to retrieve.',
              type: CommandOptionType.STRING,
              required: true,
              autocomplete: true
            }
          ]
        }
      ]
    });
  }

  async autocomplete(ctx: AutocompleteContext): Promise<AutocompleteChoice[] | void> {
    const command = ctx.subcommands[0];
    const focusedOption: string = ctx.options[command][ctx.focused];

    switch (ctx.focused) {
      case 'class': {
        let matchingKeys = TypeNavigator.fuzzyFilter(focusedOption, 'class', 25);

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

  async commonAutocompleteSearch(ctx: AutocompleteContext, command: string) {
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

        console.log(entry.string, typeEntry);

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
    const calledType = ctx.subcommands[0];
    const options = ctx.options[calledType];

    const embed: MessageEmbedOptions = {
      color: SC_RED,
      fields: [],
      timestamp: new Date(ctx.invokedAt),
      footer: {
        text: `Requested by ${ctx.user.username}#${ctx.user.discriminator}`,
        icon_url: ctx.user.avatarURL
      }
    };

    const fragments: [string, string?] = [null, null];
    let typeMeta: FileMeta = null;

    switch (calledType) {
      case 'class':
      case 'typedef': {
        const descriptor = TypeNavigator.findFirstMatch(options[calledType]) as ClassDescriptor | TypeDescriptor;
        typeMeta = descriptor.meta;

        Object.assign(embed, {
          title: `${descriptor.name}${'extends' in descriptor ? ` *extends \`${descriptor.extends.join('')}\`*` : ''}`,
          fields: this.getClassEntityFields(descriptor)
        });

        fragments.push(descriptor.name);
        break;
      }
      default: {
        if (options[calledType] === 'null') {
          // yes... litereal null
          ctx.send('Invalid query.', { ephemeral: true });
          return;
        }

        const typeEntry = TypeNavigator.findFirstMatch(options.class, options[calledType]) as ChildStructureDescriptor;
        typeMeta = typeEntry.meta;

        const combinedKey = TypeNavigator.joinKey([options.class, options[calledType]], TypeSymbol[calledType]);

        Object.assign(embed, {
          title: `${combinedKey}`,
          description: typeEntry.description
        });

        if ('params' in typeEntry)
          // calledType !== 'prop'
          embed.fields = this.getArgumentEntityFields(typeEntry);

        if ('returns' in typeEntry)
          // calledType === 'method'
          embed.fields.push({
            name: 'Returns',
            value: `\`${typeEntry.returns.flat(2).join('')}\``
          });

        // exact check, if typeEntry were a class i'd do instance of... maybe
        fragments.push((calledType === 'event' ? 'e-' : '') + options[calledType]);
      }
    }

    return {
      embeds: [embed],
      components: this.getLinkComponents(fragments, typeMeta)
    };
  }

  private getLinkComponents = (target: [string, string?], typeMeta: FileMeta): ComponentActionRow[] => [
    {
      type: ComponentType.ACTION_ROW,
      components: [
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.LINK,
          url: buildDocsLink('class', ...target),
          label: 'Open Docs',
          emoji: {
            name: '📕'
          }
        },
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.LINK,
          url: buildGitHubLink(typeMeta),
          label: 'Open GitHub',
          emoji: {
            name: '📂'
          }
        }
      ]
    }
  ];

  private getArgumentEntityFields = (argumentParent: MethodDescriptor | EventDescriptor): EmbedField[] => {
    const { params } = argumentParent;

    if (!params.length) return [];

    return params.map((argument, index) => ({
      name: !index ? 'Arguments' : '\u200b',
      value: [
        `\`${argument.name}\` - ${argument.type.flat(2).join('')} ${
          argument.default ? `= ${argument.default}` : ''
        }`.trim(),
        `${argument.description}`
      ].join('\n'),
      inline: true
    }));
  };

  private getClassEntityFields = (classEntry: ClassDescriptor | TypeDescriptor): EmbedField[] =>
    [
      'props' in classEntry && {
        name: `📏 Properies (${classEntry.props.length})`,
        value:
          classEntry.props
            .filter((propEntry) => !propEntry.name.startsWith('_'))
            .map(({ name }) => `\`${name}\``)
            .join('\n') || 'None',
        inline: true
      },
      'methods' in classEntry && {
        name: `🔧 Methods (${classEntry.methods.length})`,
        value:
          classEntry.methods
            .filter((methodEntry) => methodEntry.access !== 'private' || !methodEntry.name.startsWith('_'))
            // .map((methodEntry) => `[${methodEntry.name}](${buildDocsLink('class', className, methodEntry.name)})`)
            .map(({ name }) => `\`${name}\``)
            .join(`\n`) || 'None',
        inline: true
      },
      'events' in classEntry && {
        name: `⌚ Events (${classEntry.events.length})`,
        value:
          classEntry.events
            // implied of the existance as a a class
            // .map((eventEntry) => `[${eventEntry.name}](${buildDocsLink('class', typeEntry.name, eventEntry.name)})`)
            .map(({ name }) => `\`${name}\``)
            .join('\n') || 'None',
        inline: true
      }
    ].filter((field) => field && field.value !== 'None');
}
