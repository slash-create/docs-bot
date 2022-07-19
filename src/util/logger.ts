import CatLoggr from 'cat-loggr/ts';

export default new CatLoggr().setLevel(process.env.COMMANDS_DEBUG === 'true' ? 'debug' : 'info');
