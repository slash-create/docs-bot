import { type MessageOptions, User } from "slash-create";
import type { MessageCharacterCount } from "./types";

export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export const titleCase = (input: string) =>
	input.charAt(0).toUpperCase() + input.slice(1);

export const hashMapToString = (
	input: object,
	connector = " = ",
	seperator = ", ",
	callback = (value: unknown): string => JSON.stringify(value),
) =>
	Object.keys(input)
		.map((key) => key + connector + callback(input[key]))
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

// https://stackoverflow.com/a/63671527
export function groupBy<Key extends PropertyKey, Value>(
	list: Value[],
	groupPredicate: (value: Value) => Key,
): Partial<Record<Key, Value[]>> {
	return list.reduce(
		(acc, value) => {
			const key = groupPredicate(value);

			acc[key] ??= [];
			acc[key].push(value);

			return acc;
		},
		{} as Partial<Record<Key, Value[]>>,
	);
}

export function isEmpty(val: unknown) {
	const empties: unknown[] = [null, undefined, "", Number.NaN] as const;

	return empties.includes(val);
}

export function calculateContentLength(message: MessageOptions) {
	let total = 0;

	total += message.content?.length ?? 0;

	for (const embed of message.embeds ?? []) {
		total += embed.title?.length ?? 0;
		total += embed.description?.length ?? 0;
		total += embed.url?.length ?? 0;
		total += embed.footer.text?.length ?? 0;

		for (const field of embed.fields ?? []) {
			total += field.name?.length ?? 0;
			total += field.value?.length ?? 0;
		}
	}

	return total;
}

export function debugContentLength(message: MessageOptions) {
	const totals: Partial<MessageCharacterCount> = {
		embeds: [],
	};

	totals.content = message.content?.length ?? 0;

	for (const embed of message.embeds ?? []) {
		const embedTotals: Partial<(typeof totals)["embeds"][number]> = {
			fields: [],
		};

		embedTotals.title = embed.title?.length ?? 0;
		embedTotals.description = embed.description?.length ?? 0;
		embedTotals.url = embed.url?.length ?? 0;
		embedTotals.footer = embed.footer.text?.length ?? 0;

		for (const field of embed.fields ?? []) {
			const fieldTotals: Partial<(typeof embedTotals)["fields"][number]> = {};

			fieldTotals.name = field.name?.length ?? 0;
			fieldTotals.value = field.value?.length ?? 0;
			fieldTotals.$total = fieldTotals.name + fieldTotals.value;

			embedTotals.fields.push(fieldTotals);
		}

		embedTotals.$total =
			embedTotals.title +
			embedTotals.description +
			embedTotals.url +
			embedTotals.footer +
			embedTotals.fields.reduce((acc, field) => acc + field.$total, 0);

		totals.embeds.push(embedTotals);
	}

	totals.$total =
		totals.content +
		totals.embeds.reduce((acc, embed) => acc + embed.$total, 0);

	return totals;
}

export function trimUntilAccumulatedLength(
	maxLength: number,
	strings: string[],
	addMessage: boolean,
) {
	let trimmed = 0;
	const total = () => strings.reduce((acc, str) => acc + str.length, 0);
	const getMsg = () => `... and ${trimmed} more.`;

	while (total() + getMsg().length >= maxLength) {
		trimmed++;
		strings.pop();
	}

	if (trimmed && addMessage) strings.push(getMsg());

	return strings;
}
