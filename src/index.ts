import dotenv from 'dotenv';
import { SlashCreator, FastifyServer, CommandOptionType, ApplicationCommandOption } from 'slash-create';
import path from 'path';

import { hashMapToString, titleCase } from './util/common';
import registerComponents from './components';

let dotenvPath = path.join(process.cwd(), '.env');
if (path.parse(process.cwd()).name === 'dist') dotenvPath = path.join(process.cwd(), '..', '.env');

dotenv.config({ path: dotenvPath });

import { logPrefix, logger } from './util/logger';
import { commandTypeStrings } from './util/constants';

const creator = new SlashCreator({
  applicationID: process.env.DISCORD_APP_ID,
  publicKey: process.env.DISCORD_PUBLIC_KEY,
  token: process.env.DISCORD_BOT_TOKEN,
  serverPort: parseInt(process.env.PORT, 10) || 8020,
  serverHost: '0.0.0.0'
});

creator.on('debug', (message) => logger.debug(message));
creator.on('warn', (message) => logger.warn(message));
creator.on('error', (error) => logger.error(error));
creator.on('synced', () => logger.info('Commands synced!'));

creator.on('commandRun', (command, _, ctx) => {
  const options = ctx.subcommands.reduce((target, command) => target[command], ctx.options);
  const commandString = ['/' + command.commandName, ctx.subcommands.join(' '), hashMapToString(options)];
  logger.info(`${logPrefix(ctx)} ran ${commandString.join(' ')}`);
});

creator.on('commandRegister', (command) => {
  const [typeString, typeSymbol] = commandTypeStrings[command.type];

  logger.info(`Registered command /${command.commandName} (${typeString} [${typeSymbol}])`);

  const commandPaths: Record<string, Record<string, string>> = {};

  function searchOptions(subCommand: ApplicationCommandOption, commandPath: string[] = []) {
    switch (subCommand.type) {
      case CommandOptionType.SUB_COMMAND:
      case CommandOptionType.SUB_COMMAND_GROUP: {
        if (!Array.isArray(subCommand.options) && subCommand.type === CommandOptionType.SUB_COMMAND) {
          commandPaths[commandPath.concat(subCommand.name).join(' ')] = {};
          break;
        }
        for (const childOption of subCommand.options) searchOptions(childOption, commandPath.concat(subCommand.name));
        break;
      }

      default: {
        const pathTarget =
          subCommand.name +
          (!subCommand.required ? '?' : '') +
          ('autocomplete' in subCommand && subCommand.autocomplete ? '*' : '');

        commandPaths[commandPath.join(' ')] ??= {};
        commandPaths[commandPath.join(' ')][pathTarget] = titleCase(CommandOptionType[subCommand.type].toLowerCase());
        if ('choices' in subCommand)
          commandPaths[commandPath.join(' ')][pathTarget] += `[${subCommand.choices.length}]`;
      }
    }
  }

  if (command.options) for (const option of command.options) searchOptions(option);

  for (const key in commandPaths)
    logger.info(
      `Found command path ${`/${command.commandName} ${key}`.trim()} { ${hashMapToString(commandPaths[key])} }`
    );
});

creator.on('commandError', (command, error) => logger.error(`Command ${command.commandName}:`, error));

creator.on('componentInteraction', (ctx) => {
  logger.info(`${logPrefix(ctx)} = $${ctx.customID}`);
});

registerComponents(creator);

creator.registerCommandsIn(path.join(__dirname, 'commands'));
creator
  .withServer(new FastifyServer())
  .collectCommandIDs()
  .then(() => {
    creator.startServer();
  });
