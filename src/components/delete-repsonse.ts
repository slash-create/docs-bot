import {
  ButtonStyle,
  CommandContext,
  ComponentButton,
  ComponentContext,
  ComponentType,
  SlashCreator
} from 'slash-create';

export const component: ComponentButton = {
  type: ComponentType.BUTTON,
  custom_id: 'delete-response',
  style: ButtonStyle.DESTRUCTIVE,
  label: '', // not needed?
  emoji: {
    name: '🗑'
  }
}

export function hasPermission(context: CommandContext | ComponentContext): boolean {
  if (context.channel.type === 1) return true; // DM
  // GROUP_DM - context.channel.type === 3 && context.channel.owner_id === context.user.id
  if ('targetMessage' in context) {
    if (context.targetMessage.author.id === context.user.id) return true; // AUTHOR
  }

  return context.member?.permissions.any(['ADMINISTRATOR', 'MANAGE_MESSAGES']) ?? false; // GUILD
}

export async function deleteResponse(creator: SlashCreator, context: ComponentContext) {
  if (!hasPermission(context)) return false;

  await context.acknowledge();
  await context.delete(context.message.id);
}
