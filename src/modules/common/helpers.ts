import { type MessageOptions, User } from "slash-create";

export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export const titleCase = (input: string) =>
	input.charAt(0).toUpperCase() + input.slice(1);

export const hashMapToString = (
	input: object,
	connector = " = ",
	seperator = ", ",
) =>
	Object.keys(input)
		.map((key) => key + connector + input[key])
		.join(seperator);

export const plural = (
	amount: number,
	one: string,
	more = `${one}s`,
	includeAmount = true,
) => (includeAmount ? `${amount} ` : "") + (amount === 1 ? one : more);

export const ephemeralResponse = (
	content: MessageOptions | string,
): MessageOptions => {
	// eslint-disable-next-line prettier/prettier
	return typeof content === "string"
		? { content, ephemeral: true }
		: { ...content, ephemeral: true };
};

export function trimContent(strings: TemplateStringsArray, ...args: string[]) {
	return String.raw(strings, ...args).replace(
		/\t+|\n *(?!> |\d\.|- |\* )| {2,}/gm,
		"",
	);
}

// https://stackoverflow.com/a/10952773
export function numLength(num: number) {
	return Math.ceil(Math.log10(num + 1));
}
