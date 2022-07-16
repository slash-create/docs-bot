import { Client as ErisClient } from 'eris';
import fuzzy from 'fuzzy';
import {
  SlashCommand,
  CommandOptionType,
  SlashCreator,
  CommandContext,
  AutocompleteContext,
  ComponentType,
  ComponentActionRow,
  ButtonStyle,
  MessageEmbedOptions,
  EmbedField,
  AutocompleteChoice
} from 'slash-create';
import { SC_RED } from '../util/common';
import { buildDocsLink, buildGitHubLink } from '../util/linkBuilder';
import {
  AnyStructureDescriptor,
  ChildStructureDescriptor,
  ClassDescriptor,
  EventDescriptor,
  MethodDescriptor,
  TypeRoute,
  TypeSource,
  TypeSymbol
} from '../util/metaTypes';
import TypeNavigator from '../util/typeNavigator';

import { typeMap, fetchMetadata } from '../util/typeResolution';

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
        } // ,
        // {
        //  name: 'type',
        //  description: 'The type to retrieve.',
        //  type: CommandOptionType.SUB_COMMAND,
        //  options: [
        //    {
        //      name: 'type',
        //      description: 'The type to retrieve.',
        //      type: CommandOptionType.STRING,
        //      required: true,
        //      autocomplete: true
        //    }
        //  ]
        // }
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
      // case 'type': {
      //  const results = TypeNavigator.fuzzyFilter(focusedOption, 'typedef');
      //  return results.map((value) => ({ name: value.string, value: value.string }));
      // }
      case 'event':
      case 'method':
      case 'prop':
        return this.commonAutocompleteSearch(ctx);
      default: {
        return [];
      }
    }
  }

  async commonAutocompleteSearch(ctx: AutocompleteContext) {
    const options = ctx.options[ctx.subcommands[0]];
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

  async run(ctx: CommandContext) {
    const calledType = ctx.subcommands[0];
    const options = ctx.options[calledType];

    if (calledType === 'class') {
      const classEntry = TypeNavigator.getClassDescriptor(options.class);

      const embed: MessageEmbedOptions = {
        color: SC_RED,
        title: `${classEntry.name}${classEntry.extends ? ` *extends \`${classEntry.extends.join('')}\`*` : ''}`,
        description: classEntry.description,
        timestamp: new Date(ctx.invokedAt),
        fields: this.getClassEntityFields(classEntry),
        footer: {
          text: `Requested by ${ctx.user.username}#${ctx.user.discriminator}`,
          icon_url: ctx.user.avatarURL
        }
      };

      try {
        await ctx.send({
          embeds: [embed],
          components: this.getLinkComponents([classEntry.name], classEntry)
        });
      } catch (e) {
        console.log(e);
        console.log(JSON.stringify(e.response.errors.data, null, 2));
      }
    } else {
      if (options[calledType] === 'null') {
        // yes... litereal null
        return ctx.send('Invalid query.', { ephemeral: true });
      }

      const combinedKey = TypeNavigator.joinKey([options.class, options[calledType]], TypeSymbol[calledType]);

      return combinedKey;
    }
  }

  private getLinkComponents = (target: [string, string?], typeEntry: AnyStructureDescriptor): ComponentActionRow[] => [
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
          url: buildGitHubLink(typeEntry.meta),
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

  private getClassEntityFields = (classEntry: ClassDescriptor): EmbedField[] =>
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
