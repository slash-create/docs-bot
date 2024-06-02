import { randomInt } from "node:crypto";

import {
	type AutocompleteChoice,
	type AutocompleteContext,
	type CommandContext,
	CommandOptionType,
	type MessageOptions,
	SlashCommand,
	type SlashCreator,
	ApplicationIntegrationType,
} from "slash-create";

import { casual as chrono } from "chrono-node";

import { plural } from "&common/helpers";
import {
	timeOptionFactory as timeOption,
	timezoneOption,
} from "&discord/command-options";
import { time } from "&discord/markup";
import { TimeStyle } from "&discord/types";
import { resolveStarSign } from "&measures/star-sign";
import BaseCommand from "&discord/base-command";
import timezones, {
	offsetOf,
	offsetTimeTo,
	queryTimezone,
} from "&measures/timezones";
import { getCommandInfo } from "&discord/helpers";

export default class TemporalCommand extends BaseCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: "temporal",
			description: "Simplified use of Discord's time syntax.",
			deferEphemeral: true,
			options: [
				{
					name: "now",
					description: "Get the current time.",
					type: CommandOptionType.SUB_COMMAND,
          options: [
						timezoneOption,
						{
							name: "instant",
							description: [
								"The time instant to query.",
								"(default = {now})",
							].join(" "),
							type: CommandOptionType.STRING,
							required: false,
							autocomplete: true,
						}
					],
				},
				{
					name: "occurrences",
					description:
						"Get all occurrences of a day of the week for a day/month set between two specified years.",
					type: CommandOptionType.SUB_COMMAND,
					options: [
						{
							name: "weekday",
							type: CommandOptionType.INTEGER,
							description: "The day of the week to focus on.",
							choices: days.map((day, index) => ({ name: day, value: index })),
							required: true,
						},
						{
							name: "date",
							description: "The date of the month to cycle through = [1, 31].",
							type: CommandOptionType.INTEGER,
							min_value: 1,
							max_value: 31,
							required: true,
						},
						{
							name: "month",
							description: "The month of the year to cycle through.",
							type: CommandOptionType.INTEGER,
							choices: months.map((month, index) => ({
								name: month,
								value: index,
							})),
							required: true,
						},
						// Sat Sep 13 275760 is the actual limit
						// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#:~:text=relative%20to%20the%20epoch
						{
							name: "start_year",
							description: "The year to start the search from.",
							type: CommandOptionType.INTEGER,
							min_value: -265000,
							max_value: 275000,
							required: true,
						},
						{
							name: "end_year",
							description: "The year to end the search at.",
							type: CommandOptionType.INTEGER,
							min_value: -265000,
							max_value: 275000,
							required: true,
						},
						{
							name: "select",
							description: 'Selection type. (default = "first")',
							type: CommandOptionType.STRING,
							choices: [
								{ name: "First", value: "first" },
								{ name: "Last", value: "last" },
								{ name: "Random", value: "random" },
							],
						},
						{
							name: "count",
							description: "Selection count. (default = 5)",
							type: CommandOptionType.INTEGER,
							min_value: 5,
							max_value: 20,
						},
					],
				},
				{
					name: "parse",
					description: [
						"Parse string query with chrono-node parse from UTC time.",
						"(GitHub: https://github.com/wanasit/chrono)",
					].join("\n"),
					type: CommandOptionType.SUB_COMMAND,
					options: [
						{
							name: "query",
							description:
								"The query to parse (context around date strings are not provided in response).",
							type: CommandOptionType.STRING,
							required: true,
						},
						timezoneOption,
						{
							name: "instant",
							description: [
								"A time instant.",
								"If it is for the timestamp markup, add three zeros to the end.",
								"(default = {now})",
							].join(" "),
							type: CommandOptionType.STRING,
							autocomplete: true,
						},
						{
							name: "forward_date",
							description:
								"Should the parser only return results forward of the temporal instant. (default = false)",
							type: CommandOptionType.BOOLEAN,
						},
						{
							name: "select",
							description: 'Selection type. (default = "first")',
							type: CommandOptionType.STRING,
							choices: [
								{ name: "First", value: "first" },
								{ name: "Last", value: "last" },
							],
						},
						{
							name: "count",
							description: "Selection count. (default = 3)",
							type: CommandOptionType.INTEGER,
							min_value: 3,
							max_value: 15,
						},
					],
				},
				{
					name: "exact",
					description: "Construct a Discord timestamp.",
					type: CommandOptionType.SUB_COMMAND,
					options: [
						timeOption("year", { min: -265000, max: 275000 }),
						{
							name: "month",
							description: "The month of the timestamp.",
							type: CommandOptionType.INTEGER,
							choices: months.map((month, index) => ({
								name: month,
								value: index,
							})),
							required: true,
						},
						timeOption("day", { min: 1, max: 31 }),
						timeOption("hour", { min: 0, max: 23 }),
						timeOption("minute", { min: 0, max: 60 }),
						timeOption("second", { min: 0, max: 60 }),
						timezoneOption,
					],
				},
				{
					name: "snowflake",
					description: "Deconstruct a Discord snowflake.",
					type: CommandOptionType.SUB_COMMAND_GROUP,
					options: [
						{
							name: "user",
							description: "Target a user snowflake.",
							type: CommandOptionType.SUB_COMMAND,
							options: [
								{
									name: "target",
									description: "The user to target. (default = @me)",
									type: CommandOptionType.USER,
									required: false,
								},
							],
						},
						{
							name: "channel",
							description: "Target a channel snowflake.",
							type: CommandOptionType.SUB_COMMAND,
							options: [
								{
									name: "target",
									description: "The channel to target. (default = #here)",
									type: CommandOptionType.CHANNEL,
									required: false,
								},
							],
						},
						{
							name: "role",
							description: "Target a role snowflake.",
							type: CommandOptionType.SUB_COMMAND,
							options: [
								{
									name: "target",
									description: "The role to target.",
									type: CommandOptionType.ROLE,
									required: true,
								},
							],
						},
						{
							name: "guild",
							description: "Target the guild snowflake.",
							type: CommandOptionType.SUB_COMMAND,
						},
						{
							name: "input",
							description: "Target the provided input as a snowflake.",
							type: CommandOptionType.SUB_COMMAND,
							options: [
								{
									name: "target",
									description: "The input to target.",
									type: CommandOptionType.STRING,
									required: true,
									autocomplete: false,
								},
							],
						},
					],
				},
			],
		});
	}

	#showAndTell = (str: string) => `${str} (\`${str}\`)` as const;
	#stylePredicate = (style: TimeStyle) => (date: number | Date) =>
		time(date, style);

	// https://stackoverflow.com/a/15397495
	#ordinal = (n: number) => {
		if (n > 3 && n < 21) return `${n}th`;
		switch (n % 10) {
			case 1:
				return `${n}st`;
			case 2:
				return `${n}nd`;
			case 3:
				return `${n}rd`;
			default:
				return `${n}th`;
		}
	};

	#ordinalDate = (month: number, day: number) =>
		`${months[month]} ${this.#ordinal(day)}`;

	#starSignStringFor(instant: Date, action: StarSignConstruct): string {
		const starSign = resolveStarSign(instant);

		const shortSign = `${starSign.emoji} ${starSign.name} (*${starSign.latin}*)`;
		if (action & StarSignConstruct.SHORT) return shortSign;

		const { since, until } = starSign.range;
		const isEndOfSequence =
			since.month > until.month || starSign.prev.month > since.month;

		const hasRelative = action & StarSignConstruct.RELATIVE;

		const pastOffset = starSign.instant.setFullYear(
			instant.getFullYear() -
				+(isEndOfSequence && starSign.isNextMonth(instant)),
		);
		const futureOffset = starSign.next.instant.setFullYear(
			instant.getFullYear() +
				+(isEndOfSequence && starSign.isPrevMonth(instant)),
		);

		return [
			shortSign,

			`from **${this.#ordinalDate(since.month, since.day)}**`,
			hasRelative &&
				this.#showAndTell(time(pastOffset, TimeStyle.RELATIVE_TIME)),

			`to **${this.#ordinalDate(until.month, until.day)}**`,
			hasRelative &&
				this.#showAndTell(time(futureOffset, TimeStyle.RELATIVE_TIME)),
		]
			.filter(Boolean)
			.map((line) => line.trim())
			.join(" ");
	}

	async autocomplete(ctx: AutocompleteContext): Promise<AutocompleteChoice[]> {
		const { locale, focused, subcommands } = ctx;
		const options = subcommands.reduce((acc, curr) => acc[curr], ctx.options);

		const intlDate = new Intl.DateTimeFormat(locale, {
			dateStyle: "long",
			timeStyle: "long",
			timeZone: timezones.has(options.timezone) ? options.timezone : "UTC",
		});

		switch (focused) {
			case "instant": {
				// /temporal parse ... instant: integer
				const { instant: value } = options as
					| TemporalParseOptions
					| TemporalNowOptions;

				if (!value)
					return [
						{
							name: `${intlDate.format(ctx.invokedAt)} { NOW }`,
							value: ctx.invokedAt,
						},
					];

				return [
					{ name: intlDate.format(new Date(value)), value },
					{
						name: `${intlDate.format(ctx.invokedAt)} { NOW }`,
						value: ctx.invokedAt,
					},
				];
			}

			case "timezone": {
				const results = queryTimezone(options[focused] /* , locale */)
					.slice(0, 20)
					.map((timezone) => ({
						name: timezone.original.toString(),
						value: timezone.original.intl,
					}));
				console.log(results);
				return results;
			}

			default:
				return [];
		}
	}

	async run(ctx: CommandContext): Promise<MessageOptions> {
		const [parentCommand, childCommand] = ctx.subcommands;
		const options = ctx.options[parentCommand];

		let content: string;

		switch (parentCommand) {
			case "now":
				content = this.#runTemporalNow(ctx, options);
				break;

			case "occurrences":
				content = this.#runTemporalOccurrences(ctx, options);
				break;

			case "parse":
				content = this.#runTemporalParse(ctx, options);
				break;

			case "exact":
				content = this.#runTemporalExact(ctx, options);
				break;

			case "snowflake":
				content = this.#runTemporalSnowflake(
					ctx,
					childCommand,
					options[childCommand],
				);
		}

		return { content, ephemeral: true };
	}

	#runTemporalNow(ctx: CommandContext, options: TemporalNowOptions): string {
		if (options.timezone && !timezones.has(options.timezone)) {
			return `\`${options.timezone}\` is not a valid IANA timezone identifier.`;
		}

		const invokedTime = new Date(options.instant ?? ctx.invokedAt);
		const referenceString =
			"instant" in options ? "instant occured" : "command was invoked";

		const offsetTime = offsetTimeTo(options.timezone ?? "UTC", invokedTime);
		const timeZoneNote = options.timezone
			? `The provided ${referenceString.split(" ").at(0)} was offset for \`${options.timezone}\`
         with a difference of ${offsetOf(options.timezone)} hours.`.replace(
					/\s+/g,
					" ",
				)
			: "";

		const [longTime, shortDate, relativeTime] = [
			TimeStyle.LONG_TIME,
			TimeStyle.SHORT_DATE,
			TimeStyle.RELATIVE_TIME,
		].map((style) => this.#showAndTell(time(invokedTime, style)));

		const invokedTimeString = `This ${referenceString} ${relativeTime} at ${longTime} on ${shortDate}.`;
		const starSignString = this.#starSignStringFor(
			offsetTime,
			StarSignConstruct.RELATIVE,
		);

		return `${invokedTimeString}\n> ${starSignString}\n${timeZoneNote}`;
	}

	/**
	 * - weekday: int{0,6}
	 * - date: int{1,31}
	 * - month: {0,11}
	 * - start_year:{-265000,275000}
	 * - end_year:{...}
	 * - select?:{=first,last,random}
	 * - count?:{=5,20}
	 */
	#runTemporalOccurrences(
		ctx: CommandContext,
		options: TemporalOccuranceOptions,
	): string {
		const {
			date,
			month,
			weekday: weekDay,
			start_year: startYear,
			end_year: endYear,
			select = "first",
			count = 5,
		}: TemporalOccuranceOptions = options;

		if (endYear - startYear <= 0)
			return `Your selected range (\`${endYear} - ${startYear} <= 0\`) is inverted, please swap the arguments.`;

		if (
			(date > 28 && month === 1) ||
			([3, 5, 8, 10].includes(month) && date === 31)
		)
			// 28th-31st Feb
			return `\`${date}/${months[month]}\` is not possible, please try again.`;

		const fDate = new Date(0, month, date, 0, 0, 0);
		const occurances: number[] = [];

		let attempts = 0;

		while (occurances.length < count) {
			switch (select) {
				case "first":
					fDate.setUTCFullYear(startYear + attempts, month, date);
					break;
				case "last":
					fDate.setUTCFullYear(endYear - attempts, month, date);
					break;
				case "random":
					fDate.setUTCFullYear(randomInt(startYear, endYear + 1), month, date);
					break;
			}

			attempts++;

			if (occurances.includes(+fDate)) continue;
			if (attempts >= count * 100) break;

			if (fDate.getUTCDay() !== weekDay) continue;
			if (fDate.getMonth() !== month) continue;
			// currMonth !== targetMonth - Feburary 28th Leap year workaround

			if (select === "first" && fDate.getUTCFullYear() > endYear) break;
			if (select === "last" && fDate.getUTCFullYear() < startYear) break;

			occurances.push(+fDate);
		}

		if (select !== "random")
			occurances.sort((a, b) => (select === "first" ? a - b : b - a));

		/* biome-ignore format:  */
		const prefix = select === "random" ? "A selection from" : `The ${select}`;
		const dateString = `${days[weekDay]}, ${months[month]} ${this.#ordinal(
			date,
		)}`;
		const shortStarSign = this.#starSignStringFor(
			new Date(fDate.getFullYear(), month, date),
			StarSignConstruct.SHORT,
		);
		const ordinalQuery = `**${plural(
			occurances.length,
			"occurance",
		)}** of *${dateString} ${shortStarSign}*`;
		const yearRange = `**\`${startYear}\`** and **\`${endYear}\`**`;

		return [
			`${prefix} ${ordinalQuery} between ${yearRange} were found in ${plural(
				attempts,
				"attempt",
			)}.`,
			"> Copy the command string next to your username to share with others.",
			occurances.map(
				(date) => `- ${this.#showAndTell(time(date, TimeStyle.LONG_DATE))}`,
			),
		]
			.flat()
			.join("\n");
		/* eslint-enable prettier/prettier */
	}

	#runTemporalParse(
		ctx: CommandContext,
		options: TemporalParseOptions,
	): string {
		if (options.timezone && !timezones.has(options.timezone))
			return `\`${options.timezone}\` is not a valid IANA timezone identifier.`;
		const {
			query,
			instant /* Date.now() */,
			select = "first",
			count = 3,
			forward_date: forwardDate = false,
			timezone = "UTC",
		} = options;

		const dateInstant = new Date(instant ?? ctx.invokedAt);
		const adjustedTimezone = timezone.includes("(")
			? timezone.split(" ").at(0)
			: timezone;
		const offsetInstant = offsetTimeTo(adjustedTimezone, dateInstant);
		const shortTime = this.#stylePredicate(TimeStyle.SHORT_FORMAT);

		const results = chrono
			.parse(
				query,
				{
					instant: dateInstant,
					timezone: adjustedTimezone,
				},
				{ forwardDate },
			)
			.map((entry) => {
				let ret = this.#showAndTell(
					shortTime(offsetTimeTo(adjustedTimezone, entry.start.date())),
				);
				if (entry.end)
					ret += ` until ${shortTime(
						offsetTimeTo(adjustedTimezone, entry.end.date()),
					)}`;
				return ret;
			});

		if (select === "last") results.reverse();
		if (results.length > count) results.splice(count, results.length);

		return [
			`The ${select} **${plural(results.length, "result")}** from your query. ${
				instant ? `(Relative to ${shortTime(offsetInstant)})` : ""
			}`,
			...results.map((value, index) => `${index + 1}. ${value}`),
		].join("\n");
	}

	#runTemporalExact(
		ctx: CommandContext,
		options: TemporalExactOptions,
	): string {
		if (options.timezone && !timezones.has(options.timezone))
			return `\`${options.timezone}\` is not a valid IANA timezone identifier.`;
		const {
			year,
			month,
			day,
			hour,
			minute,
			second,
			timezone = "Atlantic/Reykjavik",
		} = options;

		if (
			(day > 28 && month === 1) ||
			([3, 5, 8, 10].includes(month) && day === 31)
		)
			// 28th-31st Feb
			return `\`${day}/${months[month]}\` is not possible, please try again.`;

		const adjustedTimezone = timezone.includes("(")
			? timezone.split(" ").at(0)
			: timezone;
		const exactUTC = new Date(
			Date.UTC(year, month, day, hour, minute, second, 0),
		);
    const timeZoneNote = options.timezone
			? `The provided arguments were offset for \`${options.timezone}\`
         with a difference of ${offsetOf(options.timezone)} hours.`.replace(
					/\s+/g,
					" ",
				)
			: "";

		const exactOffset = offsetTimeTo(adjustedTimezone, exactUTC);
		const isFuture = exactOffset.valueOf() > ctx.invokedAt;

		const starSignString = this.#starSignStringFor(
			exactOffset,
			StarSignConstruct.NONE,
		);

		return [
			`The provided arguments construct the timestamp of ${this.#showAndTell(
				time(exactOffset, TimeStyle.LONG_FORMAT),
			)} ${time(exactOffset, TimeStyle.RELATIVE_TIME)}`,
			`> ${starSignString}`,
      timeZoneNote
		].join("\n");
	}

	#runTemporalSnowflake(
		ctx: CommandContext,
		subCommand: string,
		options: { target?: string },
	) {
		const { target } = options;

		let snowflake = "";

		switch (subCommand) {
			case "user": // ctx.users.get(target).id
				snowflake = target ?? ctx.user.id;
				break;
			case "channel": // ctx.channels.get(target).id
				snowflake = target ?? ctx.channel.id;
				break;
			case "role": // ctx.roles.get(target).id;
			case "input":
				snowflake = target;
				break;
			case "guild":
				snowflake = ctx.guildID;
				break;
		}

		if (snowflake === "") {
			return "Unknown outcome, snowflake was not found.";
		}

		const id = BigInt(snowflake);

		const snowStamp = (id >> 22n) + 1420070400000n;
		const workerID = (id & 0x3e0000n) >> 17n;
		const processID = (id & 0x1f000n) >> 12n;
		const increment = id & 0xfffn;

		const snowDate = new Date(Number(snowStamp));

		const [longTime, shortDate, relativeTime] = [
			TimeStyle.LONG_TIME,
			TimeStyle.SHORT_DATE,
			TimeStyle.RELATIVE_TIME,
		].map((style) => this.#showAndTell(time(snowDate, style)));

		const invokedTimeString = `This \`${subCommand}\` instant would occur ${relativeTime} at ${longTime} on ${shortDate}.`;
		const snowSignString = this.#starSignStringFor(
			snowDate,
			StarSignConstruct.NONE,
		);

		return [
			`${invokedTimeString}\n> ${snowSignString}`,
			`\`{timestamp: ${snowStamp}, worker: ${workerID}, process: ${processID}, increment: ${increment}}\``,
		].join("\n");
	}
}

enum StarSignConstruct {
	NONE = 0,
	RELATIVE = 1,
	SHORT = 2,
}

interface TemporalNowOptions {
	timezone?: string;
	instant?: string; // => number (because autocomplete is... shit)
}

interface TemporalOccuranceOptions {
	date: number;
	month: number;
	weekday: number;
	start_year: number;
	end_year: number;
	select?: /* = */ "first" | "last" | "random";
	count?: number; // = 5
}

interface TemporalParseOptions {
	query: string;
	discord?: boolean;
	instant?: number; // = {invokedAt}
	forward_date?: boolean; // = true
	select?: /* = */ "first" | "last"; // = 'first'
	count?: number; // = 3
	timezone?: string; // = UTC
}

interface TemporalExactOptions {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
	timezone: string; // = UTC
}

const days = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

const months = [
	/* biome-ignore format: yearly quarters format in thirds */
	/* Q1 */ ...["January", "Febuary", "March"],
	/* Q2 */ ...["April", "May", "June"],
	/* Q3 */ ...["July", "August", "September"],
	/* Q4 */ ...["October", "November", "December"],
];
