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
  ButtonStyle,
  CommandOptionType,
  ComponentType,
  type AutocompleteChoice,
  type AutocompleteContext,
  type CommandContext,
  type MessageOptions,
  type SlashCreator,
} from "slash-create";

import { filter } from "fuzzy";

import {
  ephemeralResponse as _,
  hashMapToString,
  plural,
} from "&common/helpers";
import { katex } from '&common/math';
import BaseCommand from "&discord/base-command";
import { command } from "&discord/markup";
import { filtered, grouped, measure } from "&measures/convert";
import { shareOption } from "&discord/command-options";
import { getCommandInfo } from "&discord/helpers";
import { COLORS, COLOR_REGEX } from "&common/constants";

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
        {
          name: 'latex',
          description: 'Render an expression with LaTeX',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: "expression",
              description: 'The equation to render', // todo: leave empty to render a demo
              type: CommandOptionType.STRING,
              required: true
            },
            shareOption,
            {
              name: "size",
              description: "The size of the rendered expression (=large)",
              type: CommandOptionType.STRING,
              required: false,
              choices: [
                { name: "Tiny (5pt)", value: "tiny" },
                { name: "Small (9pt)", value: "small" },
                { name: "Large (12pt)", value: "large" },
                { name: "Extra Large (18pt)", value: "LARGE" },
                { name: "Huge (20pt)", value: "huge" }
              ]
            },
            {
              name: "dpi",
              description: "Dots per inch. (50 to 300)",
              type: CommandOptionType.INTEGER,
              min_value: 50,
              max_value: 300
            },
            {
              name: "expression_only",
              description: "Hide the information message attached with the response.",
              type: CommandOptionType.BOOLEAN
            },
            {
              name: "foreground",
              description: "Foreground / text color (=black) OR 6 digit hex code",
              type: CommandOptionType.STRING,
              autocomplete: true
            },
            {
              name: "background",
              description: "Background color (=white) OR 6 digit hex code",
              type: CommandOptionType.STRING,
              autocomplete: true
            }
          ]
        }
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
    const { subCommands: [subGroup, subCommand], options } = getCommandInfo<any>(ctx);

    let results: AutocompleteChoice[] = [];

    switch (ctx.focused) {
      // Exclude selection of origin unit
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

      case "background":
      case "foreground": {
        results = filter(options[ctx.focused], COLORS)
          .map((result) => ({ name: result.string, value: result.string }));

        if (COLOR_REGEX.test(options[ctx.focused]))
          results.push({ name: options[ctx.focused], value: options[ctx.focused] });

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

    return results.slice(0, 20);
  }

  async run(ctx: CommandContext): Promise<MessageOptions | string> {
    const { subCommands: [subGroup, subCommand], options } = getCommandInfo(ctx);

    switch (subGroup) {
      case "convert": return this.convertUnitsCommand(ctx, options[subCommand]);
      case "latex": return this.latexCommand(ctx, options);
      default: return "Unknown command";
    }
  }

  convertUnitsCommand(ctx: CommandContext, options: Record<string, any>) {
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

  // { expression!: string; share?: boolean = false }
  async latexCommand(ctx: CommandContext, options: Record<string, any>): Promise<MessageOptions> {
    const { expression, share = false, size = 'large', background = 'white', foreground = 'black', dpi, expression_only } = options;

    // Cascade expression
    let formattedExpression = [`\\${size}`];
    if (background) formattedExpression.push(`\\bg{${background}}`);
    if (foreground) formattedExpression.push(`\\fg{${foreground}}`);
    if (dpi) formattedExpression.push(`\\dpi{${dpi}}`);
    formattedExpression.push(`${expression}`);

    const res = await fetch(`https://latex.codecogs.com/png.image?${encodeURIComponent(formattedExpression.join(" "))}`);
    const blob = await res.blob();

    return {
      flags: (!share ? 1 << 6 : 0),
      files: [{ file: blob, name: "expression.png" }],
      ...(!expression_only && {
        content: [
          `-# Rendered with [CodeCogs](<https://editor.codecogs.com/>) - [Raw](<https://latex.codecogs.com/png.image?${encodeURIComponent(formattedExpression.join(" "))}>)`,
          `-# Reference page from [CodeCogs](<https://editor.codecogs.com/docs/4-LaTeX_rendering.php>) and PDF sheet from [maths.brown.edu](https://www.math.brown.edu/johsilve/ReferenceCards/TeXRefCard.v1.5.pdf).`
        ].join("\n")
      })
    }

    return {
      flags: 1 << 15 | ((!share) ? 0 : 1 << 6),
      files: [{ file: blob, name: "expression.png" }],
      components: [
        {
          type: ComponentType.MEDIA_GALLERY,
          items: [{ media: { url: "attachment://expression.png" } }]
        },
        {
          type: ComponentType.SECTION,
          components: [
            {
              type: ComponentType.TEXT_DISPLAY,
              content: [
                `-# Rendered with [CodeCogs](<https://editor.codecogs.com/>) - [Raw](<https://latex.codecogs.com/png.image?${encodeURIComponent(formattedExpression.join(" "))}>)`,
                `-# Reference page from [CodeCogs](<https://editor.codecogs.com/docs/4-LaTeX_rendering.php>) and PDF sheet from [maths.brown.edu](https://www.math.brown.edu/johsilve/ReferenceCards/TeXRefCard.v1.5.pdf).`
              ].join("\n")
            }
          ],
          accessory: {
            type: ComponentType.BUTTON,
            style: ButtonStyle.LINK,
            url: "https://editor.codecogs.com",
            label: "CodeCogs"
          }
        }
      ]
    }
  }
}
