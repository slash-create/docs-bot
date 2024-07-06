import { ChannelType } from 'slash-create';
import type { AutocompleteContext, BaseInteractionContext, CommandContext, ComponentContext, MessageInteractionContext, ModalInteractionContext } from "slash-create";

import { displayUser } from "&discord/helpers";
import { channelTypeStrings } from "&discord/constants";

type AnyContext =
  | CommandContext
  | ComponentContext
  | ModalInteractionContext
  | AutocompleteContext
  | MessageInteractionContext
  | BaseInteractionContext

export function logPrefix(ctx: AnyContext) {
	const userString = displayUser(ctx.user);
	const messagePath = `${ctx.guildID ?? "@me"}/${ctx.channelID}${
		"message" in ctx ? `/${ctx.message.id}` : ""
	}`;

	const channelType = channelTypeStrings[ctx.channel.type];

	return `(${channelType}) ${userString} [${messagePath} {${ctx.interactionID}}]`;
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

export const stringResolver = (ctx: BaseInteractionContext, value: unknown) => {
  if (typeof value === "string") {
    if (ctx.users.has(value)) {
      const user = ctx.users.get(value);
      return `<${user.bot ? "App" : "User"} | @${displayUser(user)}>`;
    }
    if (ctx.channels.has(value)) {
      const channel = ctx.channels.get(value);
      return `<Channel {${ChannelType[channel.type]}} | #${channel.name} (${
        channel.id
      })>`;
    }
    if (ctx.roles.has(value)) {
      const role = ctx.roles.get(value);
      return `<Role | @${role.name} (${role.id}) 🎨 ${role.colorHex}>`;
    }
  }
  return JSON.stringify(value);
};
