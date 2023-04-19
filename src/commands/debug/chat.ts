import {
  ApplicationCommandType,
  CommandContext,
  CommandOptionType,
  CommandUser,
  MessageOptions,
  ResolvedMemberData,
  SlashCommand,
  SlashCreator
} from 'slash-create';

enum MentionPrefixes {
  user = '@',
  channel = '#',
  role = '@&'
}

type ResolvedDebugUser = CommandUser | (ResolvedMemberData & { user: CommandUser });

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
              description: 'The user to target for debug (defaults to self).'
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
              description: 'The channel to target for debug.',
              required: true
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

    const { data } = context.data;

    if (!context.guildID) return data.resolved.users[target];

    return {
      user: data.resolved.users[target],
      ...data.resolved.members[target]
    };
  }

  async run(ctx: CommandContext): Promise<MessageOptions> {
    const [subCommand] = ctx.subcommands;
    const { target } = ctx.options[subCommand];

    let rawPayload: Record<string, any>;
    let error: string;

    switch (subCommand) {
      case 'user': {
        rawPayload = ChatDebugCommand.getUserTargetFrom(ctx);
        break;
      }

      case 'channel':
      case 'role': {
        if (!ctx.guildID) {
          error = 'This is not a guild context, you should not be here.';
          break;
        }

        const field = `${subCommand}s` as const;

        rawPayload = ctx.data.data.resolved[field][target];
        break;
      }
    }

    if (error) {
      return {
        content: error,
        ephemeral: true
      };
    }

    return ChatDebugCommand.resolveFinalPayload(rawPayload, subCommand, target);
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
          name: `payload_${target}.json`,
          file: Buffer.from(stringPayload)
        }
      };
    }

    const codeBlock = `\`\`\`json\n${stringPayload}\n\`\`\``;

    return {
      content: [header, codeBlock].join('\n'),
      ephemeral: true
    };
  }
}
