import {
	ApplicationIntegrationType,
	ChannelType,
	type CommandContext,
	type ComponentContext,
} from "slash-create";

import { displayUser } from "&discord/helpers";

export function logPrefix(ctx: CommandContext | ComponentContext) {
	const userString = displayUser(ctx.user);
	const messagePath = `${ctx.guildID ?? "@me"}/${ctx.channelID}${
		"message" in ctx ? `/${ctx.message.id}` : ""
	}`;

	const channelType = ChannelType[ctx.channel.type];
	const installType = ApplicationIntegrationType[ctx.context];

	return `(${channelType},${installType}) ${userString} [${messagePath} {${ctx.interactionID}}]`;
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
