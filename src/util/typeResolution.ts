import bent from 'bent';
import { DocumentationRoot } from './metaTypes';

const getJSON = bent('json');

let metadata: Partial<DocumentationRoot> = null;

// a collection of maps between their entry names and determined indexes to obtain them
// any information regarding path has been omitted
interface TypeMap {
  class: { [className: string]: number };
  event: { [eventName: string]: [classIndex: number, eventIndex: number] };
  method: { [methodKey: string]: [number, number] };
  prop: { [memberKey: string]: [number, number] };
  typedef: { [typeName: string]: number };
  all: { [keyName: string]: Exclude<keyof TypeMap, 'all'> };
}

const exclusionRegex = /(?:^_|\[|\])/;

export let typeMap: TypeMap = {
  class: {},
  event: {},
  method: {},
  prop: {},
  typedef: {},
  all: {}
};

// singleton behaviour
export async function fetchMetadata() {
  if (metadata) return metadata;
  else metadata = {};
  try {
    metadata = await getJSON('https://raw.githubusercontent.com/Snazzah/slash-create/docs/latest.json');

    for (const [classIndex, classEntry] of metadata.classes.entries()) {
      // console.log(`[Class] ${classEntry.name} at ${classIndex}`);
      typeMap.class[classEntry.name] = classIndex;
      typeMap.all[classEntry.name] = 'class';

      if (classEntry.events) {
        for (const [eventIndex, eventEntry] of classEntry.events.entries()) {
          const key = `${classEntry.name}$${eventEntry.name}`;
          // console.log(`[Event] ${key} at ${eventIndex}`);
          typeMap.event[key] = [classIndex, eventIndex];
          typeMap.all[key] = 'event';
        }
      }

      if (classEntry.methods) {
        for (const [methodIndex, methodEntry] of classEntry.methods.entries()) {
          const shouldSkip = exclusionRegex.test(methodEntry.name);
          const key = `${classEntry.name}#${methodEntry.name}`;
          // console.log(`[Method] ${key} at ${methodIndex}  ${shouldSkip ? ', Skipping...' : ''}`);
          if (!shouldSkip) {
            typeMap.method[key] = [classIndex, methodIndex];
            typeMap.all[key] = 'method';
          }
        }
      }

      if (classEntry.props) {
        for (const [propIndex, propEntry] of classEntry.props.entries()) {
          const shouldSkip = exclusionRegex.test(propEntry.name);
          const key = `${classEntry.name}~${propEntry.name}`;
          // console.log(`[Member] ${key} at ${propIndex} ${shouldSkip ? ', Skipping...' : ''}`);
          if (!shouldSkip) {
            typeMap.prop[key] = [classIndex, propIndex];
            typeMap.all[key] = 'prop';
          }
        }
      }
    }

    for (const [typeIndex, typeEntry] of metadata.typedefs.entries()) {
      // console.log(`[Type] ${typeEntry.name} at ${typeIndex}`);
      typeMap.typedef[typeEntry.name] = typeIndex;
      typeMap.all[typeEntry.name] = 'typedef';
    }
  } catch (e) {
    console.error('Could not fetch metadata', e);
  }

  return metadata || null;
}

export function clearMetadata() {
  metadata = {};
  typeMap = {
    class: {},
    event: {},
    method: {},
    typedef: {},
    prop: {},
    all: {}
  };
}

setImmediate(async () => {
  await fetchMetadata();
  console.log(typeMap);
  console.log(typeMap.event);
  // console.log(metadata);
  // console.log(metadata.classes[0].meta);
});
