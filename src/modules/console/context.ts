import type { CommandContext, ComponentContext } from "slash-create";

import { displayUser } from "&discord/helpers";
import { channelTypeStrings } from "&discord/constants";

export function logPrefix(ctx: CommandContext | ComponentContext) {
	const userString = displayUser(ctx.user);
	const messagePath = `${ctx.guildID ?? "@me"}/${ctx.channelID}${
		"message" in ctx ? `/${ctx.message.id}` : ""
	}`;

	const channelType = channelTypeStrings[ctx.channel.type];

	return `(${channelType}) ${userString} in #${ctx.channel.name} [${messagePath} {${ctx.interactionID}}]`;
}

export function timeScope(
	label: string,
	fn: (mark: (...args: unknown[]) => void) => void | Promise<void>,
) {
	console.time(label);

	const mark = (...args: unknown[]) => console.timeLog(label, ...args);
	const end = () => console.timeEnd(label);

	const result = fn(mark);

	if (result instanceof Promise) result.then(end);
	else end();
}
