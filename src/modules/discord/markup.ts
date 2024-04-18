import type { TimeStyle } from "./types";

/**
 *
 * @param text The text to show
 * @param href The link to target
 * @param alt
 * @param hide Whether the meta embed should be hidden
 * @returns The link markup
 */
export const link = (
  text: string,
  href: string | URL,
  alt = "",
  hide = false,
) => `[${text}](${hide ? `<${href}>` : href}${alt ? ` "${alt}"` : ""})`;

export const command = (name: string[], id: string) =>
  `</${name.join(" ")}:${id}>`;

export const time = (dateTime: number | Date, style: TimeStyle) =>
  `<t:${Math.floor(dateTime.valueOf() / 1000)}:${style}>`;
