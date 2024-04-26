import { performance } from "node:perf_hooks";

import { measure } from "&measures/convert";

export function duration() {
	const then = performance.now();

	return () => {
		const difference = performance.now() - then;
		const result = measure(difference).from("ms").toBest();
		const valueString = offsetReplace(
			result.val.toPrecision(8),
			["0", "."],
			".",
		).padStart(9, " ");
		return `${valueString} ${result.unit}`;
	};
}

/**
 * @param text The text to trim.
 * @param charSet The set of characters to use - they don't have to be unique, just in the list.
 * @param stopAtChar The character to stop the loop at - does not have to be in `charSet` to stop the loop.
 *
 * If `stopAtChar` is a character not in `charSet`, it remains in returned text.
 * @description
 * `startAt` could be included
 */
export function offsetReplace(
	text: string,
	charSet: string[],
	stopAtChar?: string,
) {
	let count = 0;

	for (let i = text.length - 1; i >= 0; i--) {
		const char = text.at(i);

		if (!charSet.includes(char)) break;

		count++;

		if (stopAtChar && char === stopAtChar) break;
	}

	if (count === 0) return text;

	return text.substring(0, text.length - count);
}
