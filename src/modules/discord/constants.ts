import { ApplicationCommandType, ChannelType } from "slash-create";

export const commandTypeStrings = {
	[ApplicationCommandType.CHAT_INPUT]: ["Chat Input", "/"],
	[ApplicationCommandType.MESSAGE]: ["Message", "*"],
	[ApplicationCommandType.USER]: ["User", "@"],
} as const;

export const channelTypeStrings: Partial<Record<ChannelType, string>> = {
	[ChannelType.DM]: "Direct",
	[ChannelType.GROUP_DM]: "Group",
	[ChannelType.GUILD_CATEGORY]: "Category",
	[ChannelType.GUILD_DIRECTORY]: "Directory",
	[ChannelType.GUILD_FORUM]: "Forum",
	[ChannelType.GUILD_NEWS]: "News",
	[ChannelType.GUILD_NEWS_THREAD]: "News Thread",
	[ChannelType.GUILD_PRIVATE_THREAD]: "Private Thread",
	[ChannelType.GUILD_PUBLIC_THREAD]: "Public Thread",
	[ChannelType.GUILD_STAGE_VOICE]: "Stage",
	[ChannelType.GUILD_TEXT]: "Text",
	[ChannelType.GUILD_VOICE]: "Voice",
} as const;
