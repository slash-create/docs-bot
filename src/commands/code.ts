import { filter as fuzzyFilter } from 'fuzzy';

import {
  AutocompleteChoice,
  AutocompleteContext,
  ButtonStyle,
  CommandContext,
  CommandOptionType,
  ComponentType,
  MessageOptions,
  SlashCommand,
  SlashCreator
} from 'slash-create';

import { queryOption, shareOption } from '../util/common';
import fileCache from '../util/fileCache';
import { buildGitHubLink } from '../util/linkBuilder';
import TypeNavigator from '../util/typeNavigator';

export default class CodeCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'code',
      description: 'Get a section of code from the source repository.',
      options: [
        {
          name: 'entity',
          description: 'Fetch a file from a type entity.',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            queryOption,
            {
              name: 'around',
              description: 'How many lines to retrieve around the entity. (default = 3)',
              min_value: 1,
              type: CommandOptionType.INTEGER
            },
            shareOption
          ]
        },
        {
          name: 'lines',
          description: 'Fetch specific lines from the source code.',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            queryOption,
            {
              name: 'start',
              description: 'Where to select from.',
              type: CommandOptionType.INTEGER,
              min_value: 1,
              required: true
            },
            {
              name: 'end',
              description: 'Where to select to.',
              type: CommandOptionType.INTEGER,
              min_value: 1,
              required: true
            },
            shareOption
          ]
        }
      ]
    });
  }

  autocomplete = async ({ options, subcommands }: AutocompleteContext): Promise<AutocompleteChoice[]> =>
    (subcommands[0] === 'entity'
      ? TypeNavigator.fuzzyFilter(options.entity.query as string) ||
        Object.keys(TypeNavigator.typeMap.all).map((string) => ({ string, score: 0 }))
      : fuzzyFilter(options.lines.query, TypeNavigator.knownFiles) ||
        TypeNavigator.knownFiles.map((string) => ({ string, score: 0 }))
    )
      .map<AutocompleteChoice>((entry) => ({
        name: `${entry.string} ${entry.score ? `{score: ${entry.score}}` : ''}`.trim(),
        value: entry.string
      }))
      .slice(0, 25);

  async run(ctx: CommandContext): Promise<MessageOptions | void | string> {
    const subCommand = ctx.subcommands[0];
    const options = ctx.options[subCommand];

    let file: string = null,
      startLine = 0,
      endLine = Infinity;

    switch (subCommand) {
      case 'entity': {
        const { query, around = 3 } = options;

        if (!(query in TypeNavigator.typeMap.all))
          return {
            content: `Entity \`${query}\` was not found in type map.`,
            ephemeral: true
          };

        const { meta } = TypeNavigator.findFirstMatch(query);

        const buffer = Math.floor(around / 2);

        startLine = meta.line - buffer;
        endLine = meta.line + buffer;
        file = `${meta.path}/${meta.file}`;

        break;
      }

      case 'lines': {
        let { query, start, end } = options;

        if (!TypeNavigator.knownFiles.includes(query))
          return {
            content: `Could not find ${query} in known files.`,
            ephemeral: true
          };

        if (end < start) [start, end] = [end, start]; // swap if inverted

        startLine = start;
        endLine = end;
        file = query;

        break;
      }
    }

    const { body } = await fileCache.fetch(file, 'master');
    const lines = body.split('\n');

    if (startLine > lines.length) {
      return {
        ephemeral: true,
        content: [
          `**Failover:** Line selection out of bounds.`,
          `> Start Line: \`${startLine + 1}\``,
          `> Total Lines: \`${lines.length}\``
        ].join('\n')
      };
    }

    if (endLine > lines.length) {
      startLine -= endLine - startLine;
      endLine = lines.length;
    }

    if (startLine <= 1) startLine = 1;

    const lineSelection = lines.slice(startLine - 1, endLine);

    let actualStart = startLine;
    let actualEnd = endLine;
    let trimTopThisTime = false;

    let content = [
      this.generateContentHeader(file, [startLine, actualStart], [endLine, actualEnd]),
      '```js',
      lineSelection.map((line, index) => this.generateCodeLine(line, startLine + index, endLine, true)).join('\n'),
      '```'
    ].join('\n');

    // #region content trim loop
    while (content.length > 2000) {
      const lines = content.split('\n');

      // #region trim location
      if (subCommand === 'entity' && trimTopThisTime) {
        lines.splice(2, 1);
        actualStart++;
      } else {
        lines.splice(-2, 1);
        actualEnd--;
      }
      trimTopThisTime = !trimTopThisTime;
      // #endregion

      lines[0] = this.generateContentHeader(file, [startLine, actualStart], [endLine, actualEnd]);
      content = lines.join('\n');
    }
    // #endregion

    return {
      content,
      ephemeral: !options.share,
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.BUTTON,
              style: ButtonStyle.LINK,
              url: buildGitHubLink(file, [startLine, actualEnd]),
              label: 'Open GitHub',
              emoji: {
                name: '📂'
              }
            }
          ]
        }
      ]
    };
  }

  private generateCodeLine = (line: string, index: number, lastLine: number, includeNumbers: boolean) =>
    (includeNumbers ? `/* ${`${index}`.padStart(`${lastLine}`.length, ' ')} */` : '') + line;

  private generateContentHeader = (
    file: string,
    [start, actualStart]: [number, number],
    [end, actualEnd]: [number, number]
  ) => `\`${file}\` - Lines ${this.getAdjustment(start, actualStart)} to ${this.getAdjustment(end, actualEnd)}`;

  private getAdjustment = (original: number, actual?: number) =>
    !actual || original === actual ? `\`${original}\`` : `~~\`${original}\`~~ \`${actual}\``;
}
