import {
  ApplicationCommandType,
  CommandChannel,
  CommandContext,
  CommandMember,
  CommandOptionType,
  CommandUser,
  MessageOptions,
  ResolvedMemberData,
  ResolvedRole,
  SlashCommand,
  SlashCreator
} from 'slash-create';

import { ephemeralResponse as _ } from '../../util/common';

enum MentionPrefixes {
  user = '@',
  channel = '#',
  role = '@&'
}

type ResolvedDebugUser = CommandUser | CommandMember | (ResolvedMemberData & { user: CommandUser });

export default class ChatDebugCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'debug',
      type: ApplicationCommandType.CHAT_INPUT,
      description: 'Debug provided entities for interaction contexts.',
      options: [
        {
          name: 'user',
          type: CommandOptionType.SUB_COMMAND,
          description: 'Print the payload for yourself or the target user.',
          options: [
            {
              name: 'target',
              type: CommandOptionType.USER,
              description: 'The user to target for debug. (default = @me)'
            }
          ]
        },
        {
          name: 'channel',
          type: CommandOptionType.SUB_COMMAND,
          description: 'Print the payload for the target channel.',
          options: [
            {
              name: 'target',
              type: CommandOptionType.CHANNEL,
              description: 'The channel to target for debug. (default = #here)'
            }
          ]
        },
        {
          name: 'role',
          type: CommandOptionType.SUB_COMMAND,
          description: 'Print the payload for the target role.',
          options: [
            {
              name: 'target',
              type: CommandOptionType.ROLE,
              description: 'The role to target for debug.',
              required: true
            }
          ]
        }
      ],
      deferEphemeral: true
    });
  }

  static getUserTargetFrom(context: CommandContext): ResolvedDebugUser {
    const [subCommand] = context.subcommands;
    const { target } = subCommand ? context.options[subCommand] : { target: context.targetID };

    const inGuild = 'guild_id' in context.data;

    if (!target) return context.data[inGuild ? 'member' : 'user'];

    const { resolved } = context.data.data;

    return !inGuild
      ? resolved.users[target]
      : {
          ...resolved.members[target],
          user: resolved.users[target]
        };
  }

  async run(ctx: CommandContext): Promise<MessageOptions> {
    const [subCommand] = ctx.subcommands;
    const { target } = ctx.options[subCommand];

    let rawPayload: ResolvedDebugUser | CommandChannel | ResolvedRole;
    let error: string;

    switch (subCommand) {
      case 'user': {
        rawPayload = ChatDebugCommand.getUserTargetFrom(ctx);
        break;
      }

      case 'channel':
      case 'role': {
        if (!ctx.guildID && subCommand === 'role') {
          error = 'This is not a guild context, you should not be here.';
          break;
        }

        const field = `${subCommand}s` as const;

        // eslint-disable-next-line prettier/prettier
        rawPayload = subCommand === 'channel' && !target
          ? ctx.data.channel
          : ctx.data.data.resolved[field][target];

        break;
      }
    }

    if (error) {
      return {
        content: error,
        ephemeral: true
      };
    }

    const targetID = 'user' in rawPayload ? rawPayload.user.id : rawPayload.id;

    return ChatDebugCommand.resolveFinalPayload(rawPayload, subCommand, targetID);
  }

  // rework `header` to use `type` instead and construct the header in this method
  static resolveFinalPayload(payload: Record<string, any>, type: string, target: string): MessageOptions {
    const isURL = target.startsWith('https://');
    const mention = type in MentionPrefixes ? `<${MentionPrefixes[type]}${target}>` : `\`${target}\``;
    const header = `The **${type}** payload for ${isURL ? target : mention}`;
    const stringPayload = JSON.stringify(payload, null, 2).replaceAll('`', '`\u200b');

    if (stringPayload.length > 1900) {
      return {
        content: header,
        ephemeral: true,
        file: {
          name: `payload_${type}_${target.split('/').slice(-1)}.json`,
          file: Buffer.from(stringPayload)
        }
      };
    }

    const codeBlock = `\`\`\`json\n${stringPayload}\n\`\`\``;

    return _({
      content: [header, codeBlock].join('\n'),
      allowedMentions: {
        everyone: false,
        users: false,
        roles: false
      }
    });
  }
}
