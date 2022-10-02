import CatLoggr from 'cat-loggr/ts';

// process.env.COMMANDS_DEBUG === 'true' ? 'debug' : 'info'
export const logger = new CatLoggr().setLevel('debug').setGlobal();
