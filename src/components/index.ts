import { SlashCreator } from 'slash-create';
import { component as deleteComponent, deleteResponse } from './delete-repsonse';

const components = {
  [deleteComponent.custom_id]: deleteResponse
};

export default function registerComponents(creator: SlashCreator) {
  for (const [key, callback] of Object.entries(components)) {
    creator.registerGlobalComponent(key, (ctx) => callback(creator, ctx));
  }
}
