import {
  CommandOptionType,
  ApplicationCommandOptionAutocompletable,
  ApplicationCommandOptionLimitedNumber,
  ApplicationCommandOption,
  ApplicationCommandOptionSubCommand
} from 'slash-create';

export const shareOption: ApplicationCommandOption = {
  type: CommandOptionType.BOOLEAN,
  name: 'share',
  description: 'Share the outcome of your query to the channel.',
  required: false
};

export const queryOption: ApplicationCommandOption = {
  name: 'query',
  description: 'The query to search all entries.',
  type: CommandOptionType.STRING,
  autocomplete: true,
  required: true
};

export const lineNumbersOption: ApplicationCommandOption = {
  name: 'line_numbers',
  description: 'Include line numbers in code response. (default=false)',
  type: CommandOptionType.BOOLEAN
};

export const docsOptionFactory = (option: string): ApplicationCommandOptionAutocompletable => ({
  name: option,
  description: `The ${option} to retrieve.`,
  type: CommandOptionType.STRING,
  required: true,
  autocomplete: true
});

export const timeOptionFactory = (
  option: string,
  { min: min_value, max: max_value }: Partial<Record<'min' | 'max', number>>
): ApplicationCommandOptionLimitedNumber => ({
  name: option,
  description: `The ${option} of the timestamp.`,
  type: CommandOptionType.INTEGER,
  required: true,
  ...(min_value && { min_value }),
  ...(max_value && { max_value })
});
