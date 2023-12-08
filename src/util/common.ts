import { MessageOptions, User } from 'slash-create';

export const titleCase = (input: string) => input.charAt(0).toUpperCase() + input.slice(1);

export const hashMapToString = (input: object, connector: string = ' = ', seperator: string = ', ') =>
  Object.keys(input)
    .map((key) => key + connector + input[key])
    .join(seperator);

export const plural = (n: number, one: string, more: string = one + 's') => (n === 1 ? one : more);

export const ephemeralResponse = (content: MessageOptions | string): MessageOptions => {
  // eslint-disable-next-line prettier/prettier
  return typeof content === 'string'
    ? { content, ephemeral: true }
    : { ...content, ephemeral: true };
};

export function trimContent(strings: TemplateStringsArray, ...args: any[]) {
  return String.raw(strings, ...args).replace(/\t+|\n *(?!> |\d\.|- |\* )| {2,}/gm, '');
}

export function displayUser(user: User) {
  const userName = user.globalName ?? user.username;
  const userDiscrim = user.discriminator !== '0' ? `#${user.discriminator}` : '';

  return `${userName + userDiscrim} (${user.id})`;
}

// https://stackoverflow.com/a/10952773
export function numLength(num: number) {
  return Math.ceil(Math.log10(num + 1));
}
