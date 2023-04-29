import dotenv from 'dotenv';
import { SlashCreator, FastifyServer } from 'slash-create';
import path from 'path';
import { hashMapToString } from './util/common';

let dotenvPath = path.join(process.cwd(), '.env');
if (path.parse(process.cwd()).name === 'dist') dotenvPath = path.join(process.cwd(), '..', '.env');

dotenv.config({ path: dotenvPath });

import { logger } from './util/logger';

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
  logger.info(`${ctx.user.username}#${ctx.user.discriminator} (${ctx.user.id}) ran ${commandString.join(' ')}`);
});
creator.on('commandRegister', (command) => logger.info(`Registered command ${command.commandName}`));
creator.on('commandError', (command, error) => logger.error(`Command ${command.commandName}:`, error));

creator
  .withServer(new FastifyServer())
  .registerCommandsIn(path.join(__dirname, 'commands'))
  .collectCommandIDs()
  .then(() => {
    creator.startServer();
  });
