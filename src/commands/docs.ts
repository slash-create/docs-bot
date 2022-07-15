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
  EmbedField
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
  TypeSymbol
} from '../util/metaTypes';

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
        }
      ]
    });
  }

  async autocomplete(ctx: AutocompleteContext): Promise<any> {
    const command = ctx.subcommands[0];
    const focusedOption: string = ctx.options[command][ctx.focused];
    const metadata = await fetchMetadata();

    switch (ctx.focused) {
      case 'class': {
        let classDescriptors = metadata.classes;

        if (command === 'event')
          classDescriptors = classDescriptors.filter((descriptor) => descriptor.events?.length > 0);

        const matchingKeys = fuzzy.filter(focusedOption, classDescriptors, {
          extract: (input) => input.name
        });

        ctx.sendResults(
          matchingKeys
            .map(({ original, score }) => ({
              name: `${original.name} {score: ${score}}`,
              value: original.name
            }))
            .slice(0, 25)
        );
        break;
      }
      case 'event':
      case 'method':
      case 'member': {
        this.commonAutocompleteSearch(ctx);
        break;
      }
      default: {
        return [];
      }
    }
  }

  async commonAutocompleteSearch(ctx: AutocompleteContext) {
    if (!ctx.options[ctx.subcommands[0]].class) return [];

    const options = ctx.options[ctx.subcommands[0]];

    const combinedKey = this.combineKeys(ctx, ['class', ctx.focused]);

    console.log(ctx.focused, ctx.options);

    console.log(ctx.subcommands[0], combinedKey, TypeRoute[ctx.focused]);

    const metadata = await fetchMetadata();

    const classIndex = typeMap.class[options.classIndex];
    const classDescriptor = metadata.classes[classIndex];
    console.log(classDescriptor);

    const query = fuzzy.filter(combinedKey, Object.keys(classDescriptor[TypeRoute[ctx.focused]] || []));

    const results = query.map((entry) => {
      const [classIndex, typeIndex] = typeMap[TypeRoute[ctx.focused]][entry.string];
      const classEntry = metadata.classes[classIndex];
      const typeEntry: ChildStructureDescriptor = classEntry[TypeRoute[ctx.focused]][typeIndex];

      const params = 'params' in typeEntry ? typeEntry.params : [];
      const hasArguments = params.length > 0;

      const entryKey = [classEntry.name, typeEntry.name].join(TypeSymbol[ctx.focused]);

      return {
        name: `${entryKey} ${hasArguments ? `(${params.length} arguments)` : ''} {score: ${entry.score}}`.trim(),
        value: typeEntry.name
      };
    });

    ctx.sendResults(results.slice(0, 25));
  }

  combineKeys(ctx: AutocompleteContext | CommandContext, keys: [string, string?], seperator?: string): string {
    if (!keys[1]) keys[1] = ctx.subcommands[0];
    if (!seperator) seperator = TypeSymbol[keys[1]];
    const options = ctx.options[ctx.subcommands[0]];
    return keys.map((key) => options[key]).join(seperator);
  }

  async run(ctx: CommandContext) {
    const calledType = ctx.subcommands[0];
    const calledOptions = ctx.options[calledType];

    const metadata = await fetchMetadata();

    if (calledType === 'class') {
      const classIndex = typeMap.class[calledOptions.class];
      const classEntry = metadata.classes[classIndex];

      const embed: MessageEmbedOptions = {
        color: SC_RED,
        title: `${classEntry.name}${classEntry.extends ? ` *extends \`${classEntry.extends.join('')}\`*` : ''}`,
        description: [
          classEntry.description
          // classEntry.events?.length && `⌚ ${classEntry.events.length} events`,
          // classEntry.methods?.length && `🔧 ${classEntry.methods.length} methods`,
          // classEntry.props?.length && `📏 ${classEntry.props.length} props`
        ]
          // .filter(Boolean)
          .join('\n'),
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
      const combinedKey = this.combineKeys(ctx, ['class'], TypeSymbol[calledType]);

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
        `\`${argument.name}\` - ${argument.type.flat(2).join('')} ${argument.default ? `= ${argument.default}` : ''}`,
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
