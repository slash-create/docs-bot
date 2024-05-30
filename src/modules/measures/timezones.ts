import { Collection } from "slash-create";
import { type FilterResult, filter } from "fuzzy";

export interface TimeZoneDetails {
	intl: string;
	short: string;
	full: string;
	toString(): string;
}

const timezones = new Collection<string, TimeZoneDetails>();

for (const timeZone of Intl.supportedValuesOf("timeZone")) {
	const i18nDateLong = new Intl.DateTimeFormat("en", {
		timeStyle: "long",
		timeZone,
	});
	const i18nDateFull = new Intl.DateTimeFormat("en", {
		timeStyle: "full",
		timeZone,
	});

	const shortTimeZone = i18nDateLong.formatToParts(new Date()).at(-1).value;
	const fullTimeZone = i18nDateFull.formatToParts(new Date()).at(-1).value;

	timezones.set(timeZone, {
		intl: timeZone,
		short: shortTimeZone,
		full: fullTimeZone,
		toString() {
			return `${timeZone} (${shortTimeZone} / ${fullTimeZone})`;
		},
	});
}

export default timezones;

export function queryTimezone(query: string): FilterResult<TimeZoneDetails>[] {
	return filter<TimeZoneDetails>(query, [...timezones.values()], {
		extract: (input) => input.toString(),
	});
}

export function offsetTimeTo(timeZone: string, date: Date) {
	const timeZoneRelativeOffset = new Date(
		date.toLocaleString("en", { timeZone }),
	);
	return new Date(
		date.valueOf() + timeZoneRelativeOffset.valueOf() - date.valueOf(),
	);
}

/**
 *
 * @param timeZone Provide as a IANA identifier.
 * @returns The timezone offset relative to UTC.
 */
export function offsetOf(timeZone) {
	const now = new Date();

	return Math.round(
		new Date(
			(now.valueOf() - offsetTimeTo(timeZone, now).valueOf()) /
				(60 * 60 * 1000) +
				now.getTimezoneOffset() / 60,
		).valueOf(),
	);
}
offsetOf("Pacific/Honolulu");
