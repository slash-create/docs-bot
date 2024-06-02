import {
	ApplicationIntegrationType,
	InteractionContextType,
	SlashCommand,
	type SlashCommandOptions,
	type SlashCreator,
} from "slash-create";

export default class BaseCommand extends SlashCommand {
	constructor(creator: SlashCreator, info: SlashCommandOptions) {
		super(creator, {
			integrationTypes: [
				ApplicationIntegrationType.GUILD_INSTALL,
				ApplicationIntegrationType.USER_INSTALL,
			],
			contexts: [
				InteractionContextType.BOT_DM,
				InteractionContextType.GUILD,
				InteractionContextType.PRIVATE_CHANNEL,
			],
			...info,
		});
	}
}
