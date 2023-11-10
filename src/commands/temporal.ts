import { randomInt } from 'node:crypto';

import {
  AutocompleteChoice,
  AutocompleteContext,
  CommandContext,
  CommandOptionType,
  MessageOptions,
  SlashCommand,
  SlashCreator
} from 'slash-create';

import { casual as chrono } from 'chrono-node';

import { time } from '../util/markup';
import { TimeStyle } from '../util/types';
import { plural, ephemeralResponse as _ } from '../util/common';
import { timeOptionFactory as timeOption } from '../util/commandOptions';

export default class TemporalCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'temporal',
      description: "Simplified use of Discord's time syntax.",
      deferEphemeral: true,
      options: [
        {
          name: 'now',
          description: 'Get the current time.',
          type: CommandOptionType.SUB_COMMAND
        },
        {
          name: 'occurrences',
          description: 'Get all occurrences of a day of the week for a day/month set between two specified years.',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'weekday',
              type: CommandOptionType.INTEGER,
              description: 'The day of the week to focus on.',
              choices: days.map((month, index) => ({ name: month, value: index })),
              required: true
            },
            {
              name: 'date',
              description: 'The date of the month to cycle through = [1, 31].',
              type: CommandOptionType.INTEGER,
              min_value: 1,
              max_value: 31,
              required: true
            },
            {
              name: 'month',
              description: 'The month of the year to cycle through.',
              type: CommandOptionType.INTEGER,
              choices: months.map((month, index) => ({ name: month, value: index })),
              required: true
            },
            // Sat Sep 13 275760 is the actual limit
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#:~:text=relative%20to%20the%20epoch
            {
              name: 'start_year',
              description: 'The year to start the search from.',
              type: CommandOptionType.INTEGER,
              min_value: -265000,
              max_value: 275000,
              required: true
            },
            {
              name: 'end_year',
              description: 'The year to end the search at.',
              type: CommandOptionType.INTEGER,
              min_value: -265000,
              max_value: 275000,
              required: true
            },
            {
              name: 'select',
              description: 'Selection type. (default = "first")',
              type: CommandOptionType.STRING,
              choices: [
                { name: 'First', value: 'first' },
                { name: 'Last', value: 'last' },
                { name: 'Random', value: 'random' }
              ]
            },
            {
              name: 'count',
              description: 'Selection count. (default = 5)',
              type: CommandOptionType.INTEGER,
              min_value: 5,
              max_value: 20
            }
          ]
        },
        {
          name: 'parse',
          description: 'Parse string query with chrono-node parse. (GitHub: https://github.com/wanasit/chrono)',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'query',
              description: 'The query to parse (context around date strings are not provided in response).',
              type: CommandOptionType.STRING,
              required: true
            },
            {
              name: 'instant',
              description: [
                'A time instant.',
                'If it is for the timestamp markup, add three zeros to the end.',
                '(default = {now})'
              ].join(' '),
              type: CommandOptionType.INTEGER,
              autocomplete: true
            },
            {
              name: 'forward_date',
              description: 'Should the parser only return results forward of the temporal instant. (default = false)',
              type: CommandOptionType.BOOLEAN
            },
            {
              name: 'select',
              description: 'Selection type. (default = "first")',
              type: CommandOptionType.STRING,
              choices: [
                { name: 'First', value: 'first' },
                { name: 'Last', value: 'last' }
              ]
            },
            {
              name: 'count',
              description: 'Selection count. (default = 3)',
              type: CommandOptionType.INTEGER,
              min_value: 3,
              max_value: 15
            }
          ]
        },
        {
          name: 'exact',
          description: 'Construct a Discord timestamp.',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            timeOption('year', { min: -265000, max: 275000 }),
            {
              name: 'month',
              description: 'The month of the timestamp.',
              type: CommandOptionType.INTEGER,
              choices: months.map((month, index) => ({ name: month, value: index })),
              required: true
            },
            timeOption('day', { min: 1, max: 31 }),
            timeOption('hour', { min: 0, max: 23 }),
            timeOption('minute', { min: 0, max: 60 }),
            timeOption('second', { min: 0, max: 60 })
          ]
        }
      ]
    });
  }

  #showAndTell = (str: string) => `${str} (\`${str}\`)` as const;
  #stylePredicate = (style: TimeStyle) => (date: number | Date) => time(date, style);

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

  async autocomplete(ctx: AutocompleteContext): Promise<AutocompleteChoice[]> {
    const { locale, focused, options } = ctx;
    const intlDate = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'full' });

    switch (focused) {
      case 'instant': {
        // /temporal parse ... instant: integer
        const { instant: value } = options.parse as TemporalParseOptions;

        return [{ name: intlDate.format(value), value }];
      }

      default:
        return [];
    }
  }

  async run(ctx: CommandContext): Promise<MessageOptions> {
    const [subCommand] = ctx.subcommands;
    const options = ctx.options[subCommand];

    switch (subCommand) {
      case 'now':
        return this.#runTemporalNow(ctx);

      case 'occurrences':
        return this.#runTemporalOccurrences(ctx, options);

      case 'parse':
        return this.#runTemporalParse(ctx, options);

      case 'exact':
        return this.#runTemporalExact(ctx, options);
    }
  }

  async #runTemporalNow(ctx: CommandContext): Promise<MessageOptions> {
    const { invokedAt } = ctx;

    const [longTime, shortDate, relativeTime] = [
      TimeStyle.LONG_TIME,
      TimeStyle.SHORT_DATE,
      TimeStyle.RELATIVE_TIME
    ].map((style) => this.#showAndTell(time(invokedAt, style)));

    return _(`This command was invoked ${relativeTime} at ${longTime} on ${shortDate}.`);
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
  async #runTemporalOccurrences(ctx: CommandContext, options: TemporalOccuranceOptions): Promise<MessageOptions> {
    const {
      date,
      month,
      weekday: weekDay,
      start_year: startYear,
      end_year: endYear,
      select = 'first',
      count = 5
    }: TemporalOccuranceOptions = options;

    if (endYear - startYear <= 0)
      return _(`Your selected range (\`${endYear} - ${startYear} <= 0\`) is inverted, please swap the arguments.`);

    if (date > 28 && month === 1)
      // 28th-31st Feb
      return _(`\`${date}/${months[month]}\` is not possible, please try again.`);

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
          fDate.setUTCFullYear(randomInt(startYear, endYear + 1), month, date);
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

    /* eslint-disable prettier/prettier */
    const prefix = select === 'random' ? 'A selection from' : `The ${select}`;
    const dateString = `${days[weekDay]}, ${months[month]} ${this.#ordinal(date)}`;
    const ordinalQuery = `**${occurances.length} ${plural(occurances.length, 'occurance')}** of ${dateString}`;
    const yearRange = `${startYear} and ${endYear}`;

    const header = `${prefix} ${ordinalQuery} between ${yearRange} were found in ${attempts} ${plural(attempts, 'attempt')}.`;

    return _([
      header,
      ...occurances.map((date) => '- ' + this.#showAndTell(time(date, TimeStyle.LONG_DATE)))
    ].join('\n'));
    /* eslint-enable prettier/prettier */
  }

  async #runTemporalParse(ctx: CommandContext, options: TemporalParseOptions): Promise<MessageOptions> {
    const { query, instant /* Date.now() */, select = 'first', count = 3, forward_date: forwardDate = false } = options;

    const shortTime = this.#stylePredicate(TimeStyle.SHORT_FORMAT);

    const results = chrono
      .parse(query, { instant: new Date(instant ?? ctx.invokedAt) /* timezone*/ }, { forwardDate })
      .map(
        (entry) =>
          this.#showAndTell(shortTime(entry.start.date())) + (entry.end ? ` until ${shortTime(entry.end.date())}` : '')
      );

    if (select === 'last') results.reverse();

    if (results.length > count) results.splice(count, results.length);

    const suffix = instant ? ` (Relative to ${shortTime(instant)})` : '';

    return _(
      [
        `The ${select} **${results.length} ${plural(results.length, 'result')}** from your query.` + suffix,
        ...results.map((value, index) => `${index + 1}. ${value}`)
      ].join('\n')
    );
  }

  async #runTemporalExact(ctx: CommandContext, options: TemporalExactOptions): Promise<MessageOptions> {
    const { year, month, day, hour, minute, second } = options;

    const exact = new Date(year, month, day, hour, minute, second);
    const isFuture = exact.valueOf() > ctx.invokedAt;

    return _(
      `The provided arguments construct the timestamp of ${this.#showAndTell(
        time(exact, TimeStyle.LONG_FORMAT)
      )} ${time(exact, TimeStyle.RELATIVE_TIME)}`
    );
  }
}

interface TemporalOccuranceOptions {
  date: number;
  month: number;
  weekday: number;
  start_year: number;
  end_year: number;
  select?: /* = */ 'first' | 'last' | 'random';
  count?: number; // = 5
}

interface TemporalParseOptions {
  query: string;
  instant?: number; // = {invokedAt}
  forward_date?: boolean; // = true
  select?: /* = */ 'first' | 'last'; // = 'first'
  count?: number; // = 3
}

interface TemporalExactOptions {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const months = [
  /* eslint-disable prettier/prettier*/
  /* Q1 */ 'January', 'Febuary', 'March',
  /* Q2 */ 'April', 'May', 'June',
  /* Q3 */ 'July', 'August', 'September',
  /* Q4 */ 'October', 'November', 'December'
  /* eslint-enable prettier/prettier */
];
