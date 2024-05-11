/** /\/\/\/
 * /utils convert * { amount: float, from*: string{Unit}, to*: string{Unit} }
 * - volume {}
 * - length { millimeter(s) [mm], centimeter(s) [cm], meter(s) [m], kilometer(s) [km], inch(es) [in], foot/feet (ft), yard(s) [yd], mile(s) [mi] }
 * - mass {}
 * - temperature { celsius(=) [ºC], farenheit(=) [ºF], kelvin(=) [K], rankine(=) [ºR] }
 * - energy
 * - area { square meter(s) [sq m], square kilometer(s) [sq km], [sq]uare [y]ar[d](s) }
 * - speed
 * - time
 * - power {}
 * - data
 * - pressure
 * - angle { degree(s) [deg], radian(s) [rad], gradian(s) [grad], arcminute(s) [′], arcsecond(s) [″] }
 */

/**
 * /utils string * { text: string, ... }
 */

/**
 * /utils cipher * { text: string, ... }
 * - caeser { text: string, shift: int[-25,25], reverse?: boolean = false }
 */

import {
  CommandOptionType,
  type AutocompleteChoice,
  type AutocompleteContext,
  type CommandContext,
  type MessageOptions,
  type SlashCreator,
} from "slash-create";

import { filter } from "fuzzy";

import { ephemeralResponse as _,  hashMapToString, plural } from "&common/helpers";
import BaseCommand from "&discord/base-command";
import { command } from "&discord/markup";
import { filtered, grouped, measure } from "&measures/convert";

export default class UtilsCommand extends BaseCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: "utils",
			description: "Misc. stuff", // ~
			deferEphemeral: true,
			options: [
				{
					name: "convert",
					type: CommandOptionType.SUB_COMMAND_GROUP,
					description: "Convert units", // ~
					options: filtered.map((unit) => ({
						name: unit,
						description: `Convert '${unit}' units`,
						type: CommandOptionType.SUB_COMMAND,
						options: [
							{
								name: "amount",
								description: "The amount to convert.",
								type: CommandOptionType.NUMBER,
								required: true,
							},
							{
								name: "from",
								description: "The unit to convert from.",
								type: CommandOptionType.STRING,
								autocomplete: true,
								required: true,
							},
							{
								name: "to",
								description: "The unit to convert to.",
								type: CommandOptionType.STRING,
								autocomplete: true,
								required: true,
							},
						],
					})),
				},
				/* ,
        {
          name: 'string',
          description: 'stuffs...',
          type: CommandOptionType.SUB_COMMAND_GROUP
        },
        {
          name: 'cipher',
          description: 'stuffs...',
          type: CommandOptionType.SUB_COMMAND_GROUP
          // hash, caeser,
        }
        */
			],
		});
	}

	async autocomplete(ctx: AutocompleteContext): Promise<AutocompleteChoice[]> {
		const [subGroup, subCommand] = ctx.subcommands;
		const options = ctx.options[subGroup][subCommand];

		let results: AutocompleteChoice[] = [];

		// Exclude selection of origin unit
		if (subGroup === "convert") {
			switch (ctx.focused) {
				case "from":
				case "to": {
					results = filter(options[ctx.focused], grouped[subCommand], {
						extract: (input) =>
							plural(options.amount, input.singular, input.plural, false),
					}).map((result) => ({
						name: `${result.string} [${result.original.abbr}]`,
						value: result.original.abbr,
					}));
					break;
				}
			}

			if (ctx.focused === "to") {
				const originIndex = results.findIndex(
					(opt) => opt.value === options.from,
				);
				if (originIndex >= 0) results.splice(originIndex, 1);

				const bestUnit = measure(options.amount).from(options.from).toBest();
				const bestIndex = results.findIndex(
					(opt) => opt.value === bestUnit.unit,
				);

				if (bestIndex < 0) {
					// erm... shit
				} else if (bestIndex > 1) {
					const [item] = results.splice(bestIndex, 1);
					item.name += " { BEST }";
					results.splice(1, 0, item);
				} else {
					results[bestIndex].name += " { BEST }";
				}
			}
		}

		return results;
	}

	async run(ctx: CommandContext): Promise<MessageOptions | string> {
		const [subGroup, subCommand] = ctx.subcommands;
		const options = ctx.options[subGroup][subCommand];

		if (subGroup === "convert") {
			const { amount, from: origin, to: target } = options;

			const fromUnit = measure().describe(origin);
			const toUnit = measure().describe(target);

			const result = measure(options.amount).from(origin).to(target);
			const commandMention = command(
				[this.commandName, ...ctx.subcommands],
				this.ids.get("global"),
			);
			const commandString = `/${this.commandName} ${ctx.subcommands.join(
				" ",
			)} ${hashMapToString(options, ": ", " ")}`;

			return _(
				[
					`${amount} ${fromUnit.abbr} -> ${result} ${toUnit.abbr}`,
					`${commandMention} - \`/${commandString}\``,
				].join("\n"),
			);
		}
	}
}
