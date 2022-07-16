import { User as ErisUser } from 'eris';
import { User as SlashUser } from 'slash-create';

export type User = ErisUser | SlashUser;
