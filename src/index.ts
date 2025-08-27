import {
	SlashCreator,
	CommandOptionType,
	type ApplicationCommandOption,
	BunServer,
} from "slash-create";
import path from "node:path";

import { calculateContentLength, hashMapToString, titleCase } from "&common/helpers";
import registerComponents from "./components";

import { logPrefix, stringResolver } from "&console/context";
import { duration } from "&console/helpers";
import { commandTypeStrings } from "&discord/constants";
import { displayUser, getCommandInfo } from "&discord/helpers";
import RequestQuota from "&console/request-quota";
import { Provider } from "&docs/source";
import { sendPanicMessage } from "&discord/panic-message";

console.time("Startup");

export const creator = new SlashCreator({
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

	const commandString = `/${command.commandName} ${ctx.subcommands.join(
		" ",
	)} { ${hashMapToString(options, " = ", ", ", (value) =>
		stringResolver(ctx, value),
	)} }`;

	const wrappedTimer = duration();
	const res = await promise;
  const contentLength = res ? `($${calculateContentLength(res)})` : "";
	console.info(`${logPrefix(ctx)} ran ${commandString} in ${wrappedTimer()} ${contentLength}`);
});

creator.on("autocompleteInteraction", (ctx, command) => {
	const { options, focused, subCommands } = getCommandInfo<object>(ctx);

	const commandString = `/${command.commandName} ${subCommands.join(
		" ",
	)} { ${hashMapToString(options, " = ", ", ", (value) =>
		stringResolver(ctx, value),
	)} } [${focused}]`;

	console.info(`${logPrefix(ctx)} queried ${commandString}`);
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

creator.on('error', (error) => {
  console.error(error);
  sendPanicMessage(creator, `${error.message}\n\n\`\`\`${error.stack}\`\`\``).catch(() => null);
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
await Promise.allSettled(
	Provider.all.map((provider) => provider.aggregator.onReady),
);
RequestQuota.debug();

process.on("uncaughtException", async (error, origin) => {
	console.log(JSON.stringify(error));
	console.log(error);
	console.log(origin);
});

process.on("unhandledRejection", (reason, promise) => {
	console.log(reason);
});
