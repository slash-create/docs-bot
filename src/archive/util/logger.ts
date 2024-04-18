import CatLoggr from "cat-loggr/ts";
import type { CommandContext, ComponentContext } from "slash-create";

import { displayUser } from "./common";

export const logger = new CatLoggr()
  .setLevel(process.env.COMMANDS_DEBUG === "true" ? "debug" : "info")
  .setGlobal();

export function logPrefix(ctx: CommandContext | ComponentContext) {
  const userString = displayUser(ctx.user);
  const messagePath = `${ctx.guildID ?? "@me"}/${ctx.channelID}${"message" in ctx ? "/" + ctx.message.id : ""
    }`;

  return `${userString} [${messagePath} {${ctx.interactionID}}]`;
}
