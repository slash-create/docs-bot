import { filter as fuzzyFilter } from 'fuzzy';

import {
  AnyComponentButton,
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

import { component as deleteComponent } from '../components/delete-repsonse';
import { lineNumbersOption, queryOption, shareOption } from '../util/commandOptions';
import fileCache from '../util/fileCache';
import { buildGitHubLink } from '../util/linkBuilder';
import TypeNavigator from '../util/typeNavigator';
import { ephemeralResponse as _, numLength, trimContent } from '../util/common';

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
            {
              name: 'offset',
              description: 'Offset the selection view.',
              type: CommandOptionType.INTEGER,
              required: false
            },
            shareOption,
            lineNumbersOption
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
            shareOption,
            lineNumbersOption
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

    const shouldHaveLineNumbers = options.line_numbers ?? false;

    let file: string = null,
      startLine = 0,
      endLine = Infinity;

    switch (subCommand) {
      case 'entity': {
        const { query, around = 3, offset = 0 } = options;

        if (!(query in TypeNavigator.typeMap.all))
          return _(`Entity \`${query}\` was not found in type map.`);

        const { meta } = TypeNavigator.findFirstMatch(query);

        startLine = meta.line - around + offset;
        endLine = meta.line + around + offset;
        file = `${meta.path}/${meta.file}`;

        break;
      }

      case 'lines': {
        let { query, start, end } = options;

        if (!TypeNavigator.knownFiles.includes(query))
          return _(`Could not find ${query} in known files.`)

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
      return _(trimContent`
          **Failover:** Line selection out of bounds.
          > Start Line: \`${startLine + 1}\`
          > Total Lines: \`${lines.length}\``);
    }

    const amendNotes = new Set<string>();

    let actualStart = startLine;
    let actualEnd = endLine;

    if (actualEnd > lines.length) {
      actualStart -= actualEnd - actualStart;
      actualEnd = lines.length;
    }

    if (actualStart <= 1) actualStart = 1;

    if (`${lines[actualStart - 1]}`.trim().length <= 0) actualStart++;
    if (`${lines[actualEnd - 1]}`.trim().length <= 0) actualEnd--;

    let commentOpen = false;

    for (let head = actualStart - 2; head >= 0; head--) {
      // Comment was opened before the initial head of the selection
      if (lines[head].indexOf('*/')) {
        commentOpen = true;
        break;
      }
    }

    const lineSelection = lines.slice(actualStart - 1, actualEnd);

    for (const [index, line] of lineSelection.entries()) {
      if (line.indexOf('/*') >= 0) commentOpen = true;
      // if (line.indexOf('*/') >= 0) commentOpen = false;

      if (!(commentOpen || shouldHaveLineNumbers)) continue;
      commentOpen = false;

      const processedLine = line.replace(/^( {2,}) \*/gm, '$1/*');

      if (processedLine === lineSelection[index]) continue;

      lineSelection[index] = processedLine;
      amendNotes.add('A comment block was altered for formatting purposes.');
    }

    // if (commentOpen) {
    //   amendNotes.add('A comment block remains open.');
    // }

    let content = [
      this.generateContentHeader(file, [startLine, actualStart], [endLine, actualEnd]),
      [...amendNotes].map((note) => `> ${note}`),
      '```ts',
      lineSelection.map((line, index) =>
        this.generateCodeLine(line, actualStart + index, actualEnd, shouldHaveLineNumbers)
      ),
      '```'
    ]
      .flat()
      .join('\n');

    // #region content trim loop
    let trimTopThisTime = false;
    let notesCount = amendNotes.size;
    while (content.length > 2000) {
      amendNotes.add('Requested content was trimmed.');
      const lines = content.split('\n');

      // #region trim location
      if (subCommand === 'entity' && trimTopThisTime) {
        lines.splice(notesCount + 2, 1);
        actualStart++;
      } else {
        lines.splice(-2, 1);
        actualEnd--;
      }
      trimTopThisTime = !trimTopThisTime;
      // #endregion

      // #region notes re-injection
      if (amendNotes.size !== notesCount) {
        const notesLines = [...amendNotes].map((note) => `> ${note}`);
        lines.splice(1, notesCount, ...notesLines);
        notesCount = amendNotes.size;
      }
      // #endregion

      lines[0] = this.generateContentHeader(file, [startLine, actualStart], [endLine, actualEnd]);
      content = lines.join('\n');
    }
    // #endregion

    const components: AnyComponentButton[] = [
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.LINK,
        url: buildGitHubLink(file, [actualStart, actualEnd]),
        label: 'Open GitHub',
        emoji: {
          name: '📂'
        }
      }
    ];

    if (options.share) components.unshift(deleteComponent);

    return {
      content,
      ephemeral: !options.share,
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components
        }
      ]
    };
  }

  private generateCodeLine = (line: string, index: number, lastLine: number, includeNumbers: boolean) =>
    (includeNumbers ? `/* ${`${index}`.padStart(numLength(lastLine), ' ')} */ ` : '') + line;

  private generateContentHeader = (
    file: string,
    [start, actualStart]: [number, number],
    [end, actualEnd]: [number, number]
  ) => `\`${file}\` - Lines ${this.getAdjustment(start, actualStart)} to ${this.getAdjustment(end, actualEnd)}`;

  private getAdjustment = (original: number, actual?: number) =>
    !actual || original === actual ? `\`${original}\`` : `~~\`${original}\`~~ \`${actual}\``;
}
