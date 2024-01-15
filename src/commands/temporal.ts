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

import { resolveStarSign } from '../util/StarSign';
import { timeOptionFactory as timeOption } from '../util/commandOptions';
import { plural } from '../util/common';
import { time } from '../util/markup';
import { TimeStyle } from '../util/types';

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
              choices: days.map((day, index) => ({ name: day, value: index })),
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
          description: [
            'Parse string query with chrono-node parse from UTC time.',
            '(GitHub: https://github.com/wanasit/chrono)'
          ].join('\n'),
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
        },
        {
          name: 'snowflake',
          description: 'Deconstruct a Discord snowflake.',
          type: CommandOptionType.SUB_COMMAND_GROUP,
          options: [
            {
              name: 'user',
              description: 'Target a user snowflake.',
              type: CommandOptionType.SUB_COMMAND,
              options: [
                {
                  name: 'target',
                  description: 'The user to target. (default = @me)',
                  type: CommandOptionType.USER,
                  required: false
                }
              ]
            },
            {
              name: 'channel',
              description: 'Target a channel snowflake.',
              type: CommandOptionType.SUB_COMMAND,
              options: [
                {
                  name: 'target',
                  description: 'The channel to target. (default = #here)',
                  type: CommandOptionType.CHANNEL,
                  required: false
                }
              ]
            },
            {
              name: 'role',
              description: 'Target a role snowflake.',
              type: CommandOptionType.SUB_COMMAND,
              options: [
                {
                  name: 'target',
                  description: 'The role to target.',
                  type: CommandOptionType.ROLE,
                  required: true
                }
              ]
            },
            {
              name: 'guild',
              description: 'Target the guild snowflake.',
              type: CommandOptionType.SUB_COMMAND
            },
            {
              name: 'input',
              description: 'Target the provided input as a snowflake.',
              type: CommandOptionType.SUB_COMMAND,
              options: [
                {
                  name: 'target',
                  description: 'The input to target.',
                  type: CommandOptionType.STRING,
                  required: true,
                  autocomplete: false
                }
              ]
            }
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
      case 1:
        return n + 'st';
      case 2:
        return n + 'nd';
      case 3:
        return n + 'rd';
      default:
        return n + 'th';
    }
  };

  #ordinalDate = (month: number, day: number) => `${months[month]} ${this.#ordinal(day)}`;

  #starSignStringFor(instant: Date, includeRelative: boolean = false): string {
    const starSign = resolveStarSign(instant);
    const { since, until } = starSign.range;

    const isEndOfSequence = since.month > until.month || starSign.prev.month > since.month;

    const pastOffset = starSign.instant.setFullYear(
      instant.getFullYear() - +(isEndOfSequence && starSign.isNextMonth(instant))
    );
    const futureOffset = starSign.next.instant.setFullYear(
      instant.getFullYear() + +(isEndOfSequence && starSign.isPrevMonth(instant))
    );

    return [
      `${starSign.emoji} ${starSign.name} (*${starSign.latin}*)`,
      `from **${this.#ordinalDate(since.month, since.day)}**`,
      ...(includeRelative && [this.#showAndTell(time(pastOffset, TimeStyle.RELATIVE_TIME))]),
      `to **${this.#ordinalDate(until.month, until.day)}**`,
      ...(includeRelative && [this.#showAndTell(time(futureOffset, TimeStyle.RELATIVE_TIME))])
    ]
      .filter(Boolean)
      .map((line) => line.trim())
      .join(' ');
  }

  async autocomplete(ctx: AutocompleteContext): Promise<AutocompleteChoice[]> {
    const { locale, focused, options } = ctx;
    const intlDate = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'full', timeZone: 'UTC' });

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
    const [parentCommand, childCommand] = ctx.subcommands;
    const options = ctx.options[parentCommand];

    let content: string;

    switch (parentCommand) {
      case 'now':
        content = this.#runTemporalNow(ctx);
        break;

      case 'occurrences':
        content = this.#runTemporalOccurrences(ctx, options);
        break;

      case 'parse':
        content = this.#runTemporalParse(ctx, options);
        break;

      case 'exact':
        content = this.#runTemporalExact(ctx, options);
        break;

      case 'snowflake':
        content = this.#runTemporalSnowflake(ctx, childCommand, options[childCommand]);
    }

    return { content, ephemeral: true };
  }

  #runTemporalNow(ctx: CommandContext): string {
    const { invokedAt } = ctx;
    const invokedTime = new Date(invokedAt);

    const [longTime, shortDate, relativeTime] = [
      TimeStyle.LONG_TIME,
      TimeStyle.SHORT_DATE,
      TimeStyle.RELATIVE_TIME
    ].map((style) => this.#showAndTell(time(invokedAt, style)));

    const invokedTimeString = `This command was invoked ${relativeTime} at ${longTime} on ${shortDate}.`;
    const starSignString = this.#starSignStringFor(invokedTime, true);

    return `${invokedTimeString}\n> ${starSignString}`;
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
  #runTemporalOccurrences(ctx: CommandContext, options: TemporalOccuranceOptions): string {
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
      return `Your selected range (\`${endYear} - ${startYear} <= 0\`) is inverted, please swap the arguments.`;

    if ((date > 28 && month === 1) || ([3, 5, 9, 11].includes(month) && date === 31))
      // 28th-31st Feb
      return `\`${date}/${months[month]}\` is not possible, please try again.`;

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
    const ordinalQuery = `**${plural(occurances.length, 'occurance')}** of *${dateString}*`;
    const yearRange = `**\`${startYear}\`** and **\`${endYear}\`**`;

    return [
      `${prefix} ${ordinalQuery} between ${yearRange} were found in ${plural(attempts, 'attempt')}.`,
      '> Copy the command string next to your username to share with others.',
      occurances.map((date) => {
        const dateFormat = this.#showAndTell(time(date, TimeStyle.LONG_DATE));
        const starSign = this.#starSignStringFor(new Date(date), StarSignConstruct.SHORT);

        return `- ${dateFormat} (${starSign})`
      }),
    ].flat().join('\n');
    /* eslint-enable prettier/prettier */
  }

  #runTemporalParse(ctx: CommandContext, options: TemporalParseOptions): string {
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

    return [
      `The ${select} **${plural(results.length, 'result')}** from your query.` +
        (instant ? ` (Relative to ${shortTime(instant)})` : ''),
      ...results.map((value, index) => `${index + 1}. ${value}`)
    ].join('\n');
  }

  #runTemporalExact(ctx: CommandContext, options: TemporalExactOptions): string {
    const { year, month, day, hour, minute, second } = options;

    const exact = new Date(year, month, day, hour, minute, second);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isFuture = exact.valueOf() > ctx.invokedAt;

    const starSignString = this.#starSignStringFor(exact, false);

    return [
      `The provided arguments construct the timestamp of ${this.#showAndTell(
        time(exact, TimeStyle.LONG_FORMAT)
      )} ${time(exact, TimeStyle.RELATIVE_TIME)}`,
      starSignString
    ].join('\n');
  }

  #runTemporalSnowflake(ctx: CommandContext, subCommand: string, options: { target?: string }) {
    const { target } = options;

    let snowflake = '';

    switch (subCommand) {
      case 'user': // ctx.users.get(target).id
        snowflake = target ?? ctx.user.id;
        break;
      case 'channel': // ctx.channels.get(target).id
        snowflake = target ?? ctx.channel.id;
        break;
      case 'role': // ctx.roles.get(target).id;
      case 'input':
        snowflake = target;
        break;
      case 'guild':
        snowflake = ctx.guildID;
        break;
    }

    if (snowflake === '') {
      return 'Unknown outcome, snowflake was not found.';
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
      TimeStyle.RELATIVE_TIME
    ].map((style) => this.#showAndTell(time(snowDate, style)));

    const invokedTimeString = `This \`${subCommand}\` instant would occur ${relativeTime} at ${longTime} on ${shortDate}.`;
    const snowSignString = this.#starSignStringFor(snowDate);

    return [
      `${invokedTimeString}\n> ${snowSignString}`,
      `\`{timestamp: ${snowStamp}, worker: ${workerID}, process: ${processID}, increment: ${increment}}\``
    ].join('\n');
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
