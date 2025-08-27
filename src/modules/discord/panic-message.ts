import { component as deleteComponent } from "../../components/delete-repsonse";
import type { SlashCreator } from "slash-create";

const panicChannelID = process.env.PANIC_CHANNEL_ID;

export async function sendPanicMessage(
  creator: SlashCreator,
  message: string,
) {
  if (!panicChannelID) return;

  return await creator.requestHandler.request('POST', `/channels/${panicChannelID}/messages`, {
    body: {
      content: `:warning: **PANIC** :warning:\n\n${message}`,
      components: [
        {
          type: 1,
          components: [deleteComponent],
        },
      ],
    },
  }).catch(() => null);
}

export async function sendPanicMessageWithoutCreator(
  message: string,
) {
  if (!panicChannelID || !process.env.DISCORD_BOT_TOKEN) return;

  return await fetch(`https://discord.com/api/v10/channels/${panicChannelID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: `:warning: **PANIC** :warning:\n\n${message}`,
      components: [
        {
          type: 1,
          components: [deleteComponent],
        },
      ],
    }),
  }).catch(() => null);
}
