import {
  ApplicationCommandType,
  type CommandContext,
  type MessageOptions,
  SlashCommand,
  type SlashCreator,
  ApplicationIntegrationType,
} from "slash-create";
import ChatDebugCommand from "./chat";

export default class UserDebugCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: "Debug User",
      type: ApplicationCommandType.USER,
      integrationTypes: [
        ApplicationIntegrationType.GUILD_INSTALL,
        ApplicationIntegrationType.USER_INSTALL
      ],
      deferEphemeral: true,
    });
  }

  async run(ctx: CommandContext): Promise<MessageOptions> {
    const { data } = ctx.data;

    const rawPayload = ChatDebugCommand.getUserTargetFrom(ctx);

    return ChatDebugCommand.resolveFinalPayload(
      rawPayload,
      "user",
      data.target_id,
    );
  }
}
