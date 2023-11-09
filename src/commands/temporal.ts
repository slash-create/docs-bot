import { randomInt } from 'node:crypto';

import {
  AutocompleteContext,
  CommandContext,
  CommandOptionType,
  MessageOptions,
  SlashCommand,
  SlashCreator
} from 'slash-create';

import { time } from '../util/markup';
import { TimeStyle } from '../util/types';

export default class TemporalCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'temporal',
      description: "Simplified use of Discord's time syntax.",
      options: [
        {
          name: 'now',
          description: 'Get the current time.',
          type: CommandOptionType.SUB_COMMAND
        },
        {
          name: 'occurances',
          description: 'Get all occurances of a day of the week for a day/month set between two specified years.',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'weekday',
              type: CommandOptionType.INTEGER,
              description: 'The day of the week to focus on.',
              choices: [
                { name: 'Sunday', value: 0 },
                { name: 'Monday', value: 1 },
                { name: 'Tuesday', value: 2 },
                { name: 'Wednesday', value: 3 },
                { name: 'Thursday', value: 4 },
                { name: 'Friday', value: 5 },
                { name: 'Saturday', value: 6 }
              ]
            },
            {
              name: 'date',
              description: 'The date of the month to cycle through = [1, 31].',
              type: CommandOptionType.INTEGER,
              min_value: 1,
              max_value: 31
            },
            {
              name: 'month',
              description: 'The month of the year to cycle through.',
              type: CommandOptionType.INTEGER,
              choices: months.map((month, index) => ({ name: month, value: index }))
            },
            // Sat Sep 13 275760 is the actual limit
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#:~:text=relative%20to%20the%20epoch
            {
              name: 'start_year',
              description: 'The year to start the search from.',
              type: CommandOptionType.INTEGER,
              min_value: -265000,
              max_value: 275000
            },
            {
              name: 'end_year',
              description: 'The year to end the search at.',
              type: CommandOptionType.INTEGER,
              min_value: -265000,
              max_value: 275000
            },
            {
              name: 'select',
              description: 'Selection type. (default = "first")',
              type: CommandOptionType.STRING,
              choices: [
                { name: 'First', value: 'first' },
                { name: 'Last', value: 'last' },
                { name: 'Random', value: 'random' }
              ],
              required: false
            },
            {
              name: 'count',
              description: 'Selection count. (default = 5)',
              type: CommandOptionType.INTEGER,
              min_value: 5,
              max_value: 20,
              required: false
            }
          ]
        }
      ]
    });
  }

  #showAndTell = (str: string) => `${str} (\`${str}\`)` as const;

  // https://stackoverflow.com/a/15397495
  #ordinal = (n: number) => {
    if (n > 3 && n < 21) return n + 'th';
    switch (n % 10) {
      case 1: return n + 'st';
      case 2: return n + 'nd';
      case 3: return n + 'rd';
      default: return n + 'th';
    }
  };

  async run(ctx: CommandContext): Promise<MessageOptions> {
    const [subCommand] = ctx.subcommands;
    const options = ctx.options[subCommand];

    switch (subCommand) {
      case 'now':
        return this.#runTemporalNow(ctx);

      case 'occurances':
        return this.#runTemporalOccurances(ctx, options);
    }
  }
  async #runTemporalNow(ctx: CommandContext): Promise<MessageOptions> {
    const { invokedAt } = ctx;

    const [longTime, shortDate, relativeTime] = [
      TimeStyle.LONG_TIME,
      TimeStyle.SHORT_DATE,
      TimeStyle.RELATIVE_TIME
    ].map((style) => this.#showAndTell(time(invokedAt, style)));

    return { content: `This command was invoked ${relativeTime} at ${longTime} on ${shortDate}.`, ephemeral: true };
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
  async #runTemporalOccurances(ctx: CommandContext, options: TemporalOccuranceOptions): Promise<MessageOptions> {
    const {
      date,
      month,
      weekday: weekDay,
      start_year: startYear,
      end_year: endYear,
      select = 'first',
      count = 5
    }: TemporalOccuranceOptions = options;

    if (date > 28 && month === 1)
      // 28th-31st Feb
      return { content: `\`${date}/${months[month]}\` is not possible, please try again.` };

    const fDate = new Date(0, month, date, 0, 0, 0);
    const occurances: number[] = [];

    let attempts = 0;

    while (occurances.length < count) {
      switch (select) {
        case 'first':
          fDate.setUTCFullYear(startYear + attempts, month, date);
          break;
        case 'last':
          fDate.setUTCFullYear(endYear - attempts, month, date);
          break;
        case 'random':
          fDate.setUTCFullYear(randomInt(startYear, endYear), month, date);
          break;
      }

      attempts++;

      if (occurances.includes(+fDate)) continue;
      if (attempts >= count * 100) break;

      if (fDate.getUTCDay() !== weekDay) continue;
      if (fDate.getMonth() !== month) continue;
      // currMonth !== targetMonth - Feburary 28th Leap year workaround

      if (select === 'first' && fDate.getUTCFullYear() > endYear) break;
      if (select === 'last' && fDate.getUTCFullYear() < startYear) break;

      occurances.push(+fDate);
    }

    if (select !== 'random') occurances.sort((a, b) => (select === 'first' ? a - b : b - a));

    const ordinalQuery = `${months[month]} ${this.#ordinal(date)}`;
    const prefix = select === 'random' ? 'A selection from' : `The ${select}`;

    const header = `${prefix} **${occurances.length} occurances** of ${ordinalQuery} between ${startYear} and ${endYear} were found in ${attempts} attempts.`;

    return {
      ephemeral: true,
      content: [
        header,
        occurances.map((date) => `- ${this.#showAndTell(time(date, TimeStyle.LONG_DATE))}`).join('\n')
      ].join('\n')
    };
  }
}

interface TemporalOccuranceOptions {
  date: number;
  month: number;
  weekday: number;
  start_year: number;
  end_year: number;
  select?: 'first' | 'last' | 'random';
  count?: number;
}

const months = [
  /* Q1 */ 'January', 'Febuary', 'March',
  /* Q2 */ 'April', 'May', 'June',
  /* Q3 */ 'July', 'August', 'September',
  /* Q4 */ 'October', 'November', 'December'
];
