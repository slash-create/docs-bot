import bent from 'bent';

const getText = bent('string');

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
import { buildGitHubLink, rawContentLink } from '../util/linkBuilder';
import TypeNavigator from '../util/typeNavigator';

export default class CodeCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'code',
      description: 'Get a section of code from the source repository.',
      options: [
        {
          name: 'query',
          description: 'The query to search all entries.',
          type: CommandOptionType.STRING,
          autocomplete: true,
          required: true
        }
      ]
    });
  }

  autocomplete = async ({ options }: AutocompleteContext): Promise<AutocompleteChoice[]> =>
    TypeNavigator.fuzzyFilter(options.query as string).map<AutocompleteChoice>((entry) => ({
      name: `${entry.string} {score: ${entry.score}}`,
      value: entry.string
    }));

  async run(ctx: CommandContext): Promise<MessageOptions | void | string> {
    const { query } = ctx.options;

    if (!(query in TypeNavigator.typeMap.all)) {
      return {
        content: 'Symbol not found',
        ephemeral: true
      };
    }

    const { meta } = TypeNavigator.findFirstMatch(query);
    const file = `${meta.path}/${meta.file}`;
    const res: string = await getText(`${rawContentLink}/${file}`);

    const lines = res.split('\n');
    let startLine = meta.line - 1; // slice offset
    let endLine = meta.line + this.offset;

    if (endLine > lines.length) {
      startLine -= endLine - startLine;
      endLine = lines.length;
    }

    if (startLine <= 0) startLine = 0;

    const lineSelection = lines.slice(startLine, endLine);

    let content = [
      `\`${file}\` - Lines \`${startLine + 1}\` to \`${endLine}\``,
      '```js',
      lineSelection
        .map((line, index) => `/* ${`${startLine + index + 1}`.padStart(`${endLine}`.length, ' ')} */ ${line}`)
        .join('\n'),
      '```'
    ].join('\n');

    let actualEnd = lineOffset;

    while (content.length > 2000) {
      const lines = content.split('\n');
      lines.splice(-2, 1);
      actualEnd--;
      lines[0] = `\`${file}\` - Lines \`${startLine + 1}\` to ~~\`${endLine}\`~~ \`${actualEnd}\``;
      content = lines.join('\n');
    }

    return {
      content,
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.BUTTON,
              style: ButtonStyle.LINK,
              url: buildGitHubLink(meta),
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
}
