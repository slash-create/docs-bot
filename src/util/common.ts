import { ApplicationCommandOption, ApplicationCommandOptionAutocompletable, CommandOptionType } from 'slash-create';

export const SC_RED = 15929905; // color for #F31231
export const ONE_HOUR = 1000 * 60 * 60;

export const shareOption: ApplicationCommandOption = {
  type: CommandOptionType.BOOLEAN,
  name: 'share',
  description: 'Share the outcome of your query to the channel.',
  required: false
};

export const queryOption: ApplicationCommandOption = {
  name: 'query',
  description: 'The query to search all entries.',
  type: CommandOptionType.STRING,
  autocomplete: true,
  required: true
};

export const docsOptionFactory = (option: string): ApplicationCommandOptionAutocompletable => ({
  name: option,
  description: `The ${option} to retrieve.`,
  type: CommandOptionType.STRING,
  required: true,
  autocomplete: true
});

export const titleCase = (input: string) => input.charAt(0).toUpperCase() + input.slice(1);

export const hashMapToString = (input: object, connector: string = ' = ', seperator: string = ', ') =>
  Object.keys(input)
    .map((key) => key + connector + input[key])
    .join(seperator);

export const standardObjects = {
  Object: 'Object',
  [typeof {}]: 'Object',
  Function: 'Function',
  [typeof function () {}]: 'Function',
  Boolean: 'Boolean',
  [typeof true]: 'Boolean',
  Symbol: 'Symbol',
  [typeof Symbol()]: 'Symbol',
  Error: 'Error',
  RangeError: 'RangeError',
  SyntaxError: 'SyntaxError',
  TypeError: 'TypeError',
  Number: 'Number',
  [typeof Infinity]: 'Number',
  BigInt: 'BigInt',
  [typeof 1337n]: 'BigInt',
  Date: 'Date',
  String: 'String',
  [typeof 'slash-create']: 'String',
  RegExp: 'RegExp',
  Array: 'Array',
  Map: 'Map',
  Set: 'Set',
  Promise: 'Promise'
};
