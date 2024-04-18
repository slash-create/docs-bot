import type { TimeStyle } from "./types";

export const link = (text: string, href: string | URL, hide = false) =>
  `[${text}](${hide ? `<${href}>` : href})` as const;

export const command = (name: string[], id: string) =>
  `</${name.join(" ")}:${id}>` as const;

export const time = (dateTime: number | Date, style: TimeStyle) =>
  `<t:${Math.floor(dateTime.valueOf() / 1000)}:${style}>` as const;
