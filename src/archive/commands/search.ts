import {
  type AutocompleteChoice,
  type AutocompleteContext,
  type CommandContext,
  type MessageOptions,
  SlashCommand,
  type SlashCreator,
} from "slash-create";

import { queryOption } from "../util/commandOptions";
import { ephemeralResponse as _ } from "../util/common";
import { command } from "&discord/markup";
import TypeNavigator from "../util/typeNavigator";

export default class SearchCommand extends SlashCommand {
  #docsCommand: SlashCommand;

  constructor(creator: SlashCreator) {
    super(creator, {
      name: "search",
      description: "Search for a documentation entry.",
      options: [queryOption],
    });
  }

  get docsCommand() {
    this.#docsCommand ??= this.creator.commands.find(
      (command) => command.commandName === "docs",
    );
    return this.#docsCommand;
  }

  async autocomplete(ctx: AutocompleteContext): Promise<AutocompleteChoice[]> {
    const { query } = ctx.options as { query: string };

    const results = TypeNavigator.fuzzyFilter(query);

    return results.map((entry) => ({
      name: `${entry.string} {score: ${entry.score}}`,
      value: entry.string,
    }));
  }

  async run(ctx: CommandContext): Promise<MessageOptions> {
    const { query } = ctx.options as { query: string };

    const [first, second = ""] = query.split(/[#$~]/);
    const subtype = TypeNavigator.typeMap.all[query];

    const commandString = ["/docs", subtype, `${subtype}: ${second || first}`];

    if (second) commandString.splice(2, 0, `class: ${first}`);

    const commandMention = command(
      ["docs", subtype],
      this.docsCommand.ids.get("global"),
    );

    return _(
      [
        `You selected \`${query}\`, this is not a entry retrieval command.`,
        "*Entries found in this command may include internal structures not included on the primary command.*",
        `> Please use \`${commandString.join(" ")}\` - ${commandMention}.`,
      ].join("\n"),
    );
  }
}
