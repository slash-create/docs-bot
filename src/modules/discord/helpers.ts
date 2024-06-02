import type { AutocompleteContext, CommandContext, User } from "slash-create";
import type { SharedCommandInfo } from "./types";

export function displayUser(user: User) {
	const userName = user.globalName ?? user.username;
	const userDiscrim =
		user.discriminator !== "0" ? `#${user.discriminator}` : "";

	return `${userName + userDiscrim} (${user.id})`;
}

export function getCommandInfo<T>(
	ctx: CommandContext | AutocompleteContext,
): SharedCommandInfo<T> {
	const subCommands = ctx.subcommands;
	const options = subCommands.reduce((opt, cmd) => opt[cmd], ctx.options);

	return {
		subCommands,
		options,
		...("focused" in ctx && {
			focused: ctx.focused,
			focusedOption: options[ctx.focused],
		}),
	};
}
