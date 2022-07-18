import { ApplicationCommandOption, ApplicationCommandOptionAutocompletable, CommandOptionType } from 'slash-create';

export const SC_RED = 15929905; // color for #F31231

export const shareOption: ApplicationCommandOption = {
  type: CommandOptionType.BOOLEAN,
  name: 'share',
  description: 'Share the outcome of your query to the channel.',
  required: false
};

export const docsOptionFactory = (option: string): ApplicationCommandOptionAutocompletable => ({
  name: option,
  description: `The ${option} to retrieve.`,
  type: CommandOptionType.STRING,
  required: true,
  autocomplete: true
});
