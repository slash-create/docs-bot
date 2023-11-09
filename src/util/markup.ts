import { TimeStyle } from './types';

export const link = (text: string, href: string | URL, hide: boolean = false) =>
  `[${text}](${hide ? `<${href}>` : href})`;

export const command = (name: string[], id: string) => `</${name.join(' ')}:${id}>`;

export const time = (dateTime: number | Date, style: TimeStyle) =>
  `<t:${Math.floor(dateTime.valueOf() / 1000)}:${style}>`;
