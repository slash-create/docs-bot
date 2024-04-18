import { ApplicationCommandType } from "slash-create";

export const commandTypeStrings = {
  [ApplicationCommandType.CHAT_INPUT]: ["Chat Input", "/"],
  [ApplicationCommandType.MESSAGE]: ["Message", "*"],
  [ApplicationCommandType.USER]: ["User", "@"],
} as const;
