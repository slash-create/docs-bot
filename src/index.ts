import dotenv from 'dotenv';
import { SlashCreator, GatewayServer } from 'slash-create';
import { Client as ErisClient } from 'eris';
import path from 'path';
import CatLoggr from 'cat-loggr/ts';

let dotenvPath = path.join(process.cwd(), '.env');
if (path.parse(process.cwd()).name === 'dist') dotenvPath = path.join(process.cwd(), '..', '.env');

dotenv.config({ path: dotenvPath });

const logger = new CatLoggr().setLevel(process.env.COMMANDS_DEBUG === 'true' ? 'debug' : 'info');
const client = new ErisClient(process.env.DISCORD_BOT_TOKEN);
const creator = new SlashCreator({
  applicationID: process.env.DISCORD_APP_ID,
  publicKey: process.env.DISCORD_PUBLIC_KEY,
  token: process.env.DISCORD_BOT_TOKEN,
  serverPort: parseInt(process.env.PORT, 10) || 8020,
  serverHost: '0.0.0.0',
  client
});

creator.on('debug', (message) => logger.log(message));
creator.on('warn', (message) => logger.warn(message));
creator.on('error', (error) => logger.error(error));
creator.on('synced', () => logger.info('Commands synced!'));
creator.on('commandRun', (command, _, ctx) =>
  logger.info(`${ctx.user.username}#${ctx.user.discriminator} (${ctx.user.id}) ran command ${command.commandName}`)
);
creator.on('commandRegister', (command) => logger.info(`Registered command ${command.commandName}`));
creator.on('commandError', (command, error) => logger.error(`Command ${command.commandName}:`, error));

creator
  .withServer(
    new GatewayServer((handler) => {
      client.on('rawWS', (packet: any) => {
        if (packet.t === 'INTERACTION_CREATE') {
          handler(packet.d);
        }
      });
    })
  )
  // .startServer()
  .registerCommandsIn(path.join(__dirname, 'commands'));

// console.log(`Starting server at "localhost:${creator.options.serverPort}/interactions"`);
client.connect();
