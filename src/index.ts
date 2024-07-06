import {
	SlashCreator,
	CommandOptionType,
	type ApplicationCommandOption,
	BunServer,
	ChannelType,
} from "slash-create";
import path from "node:path";

import { hashMapToString, titleCase } from "&common/helpers";
import registerComponents from "./components";

import { logPrefix } from "&console/context";
import { duration } from "&console/helpers";
import { commandTypeStrings } from "&discord/constants";
import { displayUser } from "&discord/helpers";
import RequestQuota from "&console/request-quota";
import { Provider } from "&docs/source";

console.time("Startup");

const creator = new SlashCreator({
	applicationID: process.env.DISCORD_APP_ID,
	publicKey: process.env.DISCORD_PUBLIC_KEY,
	token: process.env.DISCORD_BOT_TOKEN,
	serverPort: Number.parseInt(process.env.PORT, 10) || 8020,
	serverHost: "0.0.0.0",
});

// creator.on('debug', (message) => console.debug(message));
// creator.on('warn', (message) => console.warn(message));
// creator.on('error', (error) => console.error(error));
// creator.on('synced', () => console.info('Commands synced!'));

creator.on("commandRun", async (command, promise, ctx) => {
	const options = ctx.subcommands.reduce(
		(target, command) => target[command],
		ctx.options,
	);
	const stringResolver = (value: string | number | boolean) => {
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
	const commandString = `/${command.commandName} ${ctx.subcommands.join(
		" ",
	)} { ${hashMapToString(options, " = ", ", ", stringResolver)} }`;
	const wrappedTimer = duration();
	await promise;
	console.info(`${logPrefix(ctx)} ran ${commandString} in ${wrappedTimer()}`);
});

creator.on("commandRegister", async (command) => {
	const [typeString, typeSymbol] = commandTypeStrings[command.type];

	console.info(`$ /${command.commandName} (${typeString} [${typeSymbol}])`);
	const commandPaths: Record<string, Record<string, string>> = {};

	function searchOptions(
		subCommand: ApplicationCommandOption,
		commandPath: string[] = [],
	) {
		switch (subCommand.type) {
			case CommandOptionType.SUB_COMMAND:
			case CommandOptionType.SUB_COMMAND_GROUP: {
				if (
					!Array.isArray(subCommand.options) &&
					subCommand.type === CommandOptionType.SUB_COMMAND
				) {
					commandPaths[commandPath.concat(subCommand.name).join(" ")] = {};
					break;
				}

				if (subCommand.options) {
					for (const childOption of subCommand.options)
						searchOptions(childOption, commandPath.concat(subCommand.name));
				}
				break;
			}

			default: {
				const pathTarget =
					subCommand.name +
					(!subCommand.required ? "?" : "") +
					("autocomplete" in subCommand && subCommand.autocomplete ? "*" : "");

				commandPaths[commandPath.join(" ")] ??= {};
				commandPaths[commandPath.join(" ")][pathTarget] = titleCase(
					CommandOptionType[subCommand.type].toLowerCase(),
				);
				if ("choices" in subCommand)
					commandPaths[commandPath.join(" ")][pathTarget] +=
						`[${subCommand.choices.length}]`;
			}
		}
	}

	if (command.options)
		for (const option of command.options) searchOptions(option);

	for (const key in commandPaths)
		console.info(
			`^ ${`/${command.commandName} ${key}`.trim()} { ${hashMapToString(
				commandPaths[key],
			)} }`,
		);
});

creator.on("commandError", (command, error) =>
	console.error(`Command ${command.commandName}:`, error),
);

creator.on("componentInteraction", (ctx) => {
	console.info(`${logPrefix(ctx)} = $${ctx.customID}`);
});

registerComponents(creator);
await creator.registerCommandsIn(path.resolve(import.meta.dir, "./commands"), [
	".ts",
]);
console.timeLog("Startup", "Commands & Components Loaded");

creator.withServer(new BunServer());
// await creator.syncGlobalCommands(true);
await creator.collectCommandIDs();
await creator.startServer();

console.timeEnd("Startup");

// Expect 2n requests to be used
// docs manifest list + latest docs manfiest for each provider
await Promise.allSettled(Provider.all.map((provider) => provider.aggregator.ready));
RequestQuota.debug();
