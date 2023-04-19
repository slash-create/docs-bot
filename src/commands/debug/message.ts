import { ApplicationCommandType, CommandContext, MessageOptions, SlashCommand, SlashCreator } from 'slash-create';
import ChatDebugCommand from './chat';

export default class MessageDebugCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'Debug Message',
      type: ApplicationCommandType.MESSAGE
    });
  }

  async run(ctx: CommandContext): Promise<MessageOptions> {
    const { resolved, target_id } = ctx.data.data;

    const rawPayload = resolved.messages[target_id];

    const origin = 'guild_id' in ctx.data ? ctx.data.guild_id : '@me';
    const target_url = `https://discord.com/channels/${origin}/${ctx.data.channel_id}/${target_id}`;

    return ChatDebugCommand.resolveFinalPayload(rawPayload, 'message', target_url);
  }
}
