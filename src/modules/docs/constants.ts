

import { ApplicationCommandType } from 'slash-create';

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
  Promise: 'Promise',
  void: 'undefined'
};

export const BASE_MDN_URL = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects';

export const GITHUB_WEB_URL = 'https://github.com';
export const GITHUB_API_URL = 'https://api.github.com';
export const GITHUB_RAW_URL = 'https://raw.githubusercontent.com';

export const VERSION_REGEX = /v?\d\.\d+\.\d+/;
