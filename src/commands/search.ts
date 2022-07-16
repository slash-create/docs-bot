import {
  AutocompleteChoice,
  AutocompleteContext,
  CommandContext,
  CommandOptionType,
  SlashCommand,
  SlashCreator
} from 'slash-create';

import TypeNavigator from '../util/typeNavigator';

export default class SearchCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'search',
      description: 'Search for a documentation entry.',
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

  async autocomplete(ctx: AutocompleteContext): Promise<AutocompleteChoice[]> {
    const { query } = ctx.options as { query: string };

    const results = TypeNavigator.fuzzyFilter(query);

    return results.map((entry) => ({ name: `${entry.string} {score: ${entry.score}}`, value: entry.string }));
  }

  async run(ctx: CommandContext): Promise<string> {
    await ctx.defer(true);

    const { query } = ctx.options;

    const [, first, second] = query.match(/(\w+)[#~$](\w+)/);
    const subtype = TypeNavigator.typeMap.all[query];

    return [
      `You selected \`${query}\`, this is not a entry retrieval command.`,
      '*Entries found in this command may include internal structures not included on the primary command.*',
      `> Please use \`/docs ${subtype} class: ${first}${second ? ` ${subtype}: ${second}` : ''}\`.`
    ].join('\n');
  }
}
