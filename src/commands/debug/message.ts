import {
	ApplicationCommandType,
	ApplicationIntegrationType,
	ButtonStyle,
	ComponentType,
	SlashCommand,
	type CommandContext,
	type ComponentActionRow,
	type MessageOptions,
	type SlashCreator,
} from "slash-create";

import { component as deleteComponent } from "../../components/delete-repsonse";

import ChatDebugCommand from "./chat";

export default class MessageDebugCommand extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: "Debug Message",
			type: ApplicationCommandType.MESSAGE,
			integrationTypes: [
				ApplicationIntegrationType.GUILD_INSTALL,
				ApplicationIntegrationType.USER_INSTALL,
			],
			deferEphemeral: true,
		});
	}

	async run(ctx: CommandContext): Promise<MessageOptions> {
		const { resolved, target_id } = ctx.data.data;

		const rawPayload = resolved.messages[target_id];

		const origin = "guild_id" in ctx.data ? ctx.data.guild_id : "@me";
		const target_url = `https://discord.com/channels/${origin}/${ctx.data.channel_id}/${target_id}`;

		// eslint-disable-next-line prettier/prettier
		if (ctx.targetMessage.author.id === this.creator.options.applicationID)
			this.tryDeferredAdjustment(ctx);

		return ChatDebugCommand.resolveFinalPayload(
			rawPayload,
			"message",
			target_url,
		);
	}

	private async tryDeferredAdjustment(ctx: CommandContext): Promise<void> {
		const { components } = ctx.targetMessage;

		const firstRow = components[0] as ComponentActionRow;
		const [firstComponent] = firstRow.components;

		if (
			firstComponent.type === ComponentType.BUTTON &&
			firstComponent.style !== ButtonStyle.LINK &&
			firstComponent.custom_id === deleteComponent.custom_id
		)
			return;

		const builtComponents = components.slice() as ComponentActionRow[];

		(builtComponents[0] as ComponentActionRow).components.splice(
			0,
			0,
			deleteComponent,
		);

		for (const row in builtComponents) {
			if (row === "5") return; // Injection failure

			if (builtComponents[row].components.length > 5) {
				const overflow = builtComponents[row].components.length - 5;
				const slicedComponents = builtComponents[row].components.splice(
					5,
					overflow,
				);

				if (+row + 1 === 5) break;
				if (builtComponents[+row + 1])
					builtComponents[+row + 1].components.splice(
						0,
						0,
						...slicedComponents,
					);
				else
					builtComponents.push({
						type: ComponentType.ACTION_ROW,
						components: slicedComponents,
					});
			}
		}

		await ctx.edit(ctx.targetID, {
			components: builtComponents,
		});
	}
}
