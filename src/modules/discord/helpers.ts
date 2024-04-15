import { User } from "slash-create";

export function displayUser(user: User) {
  const userName = user.globalName ?? user.username;
  const userDiscrim = user.discriminator !== '0' ? `#${user.discriminator}` : '';

  return `${userName + userDiscrim} (${user.id})`;
}
