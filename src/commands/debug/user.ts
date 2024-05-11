import {
	ApplicationCommandType,
	type CommandContext,
	type MessageOptions,
	type SlashCreator,
} from "slash-create";

import BaseCommand from "&discord/base-command";

import ChatDebugCommand from "./chat";

export default class UserDebugCommand extends BaseCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: "Debug User",
			type: ApplicationCommandType.USER,
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
