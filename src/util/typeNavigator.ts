import bent from 'bent';
import { simpleFilter } from 'fuzzy';

import { AnyStructureDescriptor, DocumentationRoot } from './metaTypes';

const getJSON = bent('json');
const exclusionRegex = /(?:^_|\[|\])/;
const targetURI = 'https://raw.githubusercontent.com/Snazzah/slash-create/docs/latest.json';

interface TypeMap {
  class: { [className: string]: number };
  event: { [eventName: string]: [classIndex: number, eventIndex: number] };
  method: { [methodKey: string]: [number, number] };
  prop: { [memberKey: string]: [number, number] };
  typedef: { [typeName: string]: number };
  all: { [keyName: string]: Exclude<keyof TypeMap, 'all'> };
}

export default class TypeNavigator {
  constructor() {
    throw new Error('TypeNavigator is a static class.');
  }

  static indexSymbol = Symbol('index');
  static data: DocumentationRoot;
  static typeMap: TypeMap;

  static knownSymbols = ['#', '~', '$'];

  static get classes() {
    return this.data.classes;
  }

  static get meta() {
    return this.data.meta;
  }

  static getClassDescriptor(className: string) {
    const classIndex = this.typeMap.class[className];
    return this.classes[classIndex];
  }

  static getMethodDescriptor(className: string, methodName: string) {
    const [classIndex, methodIndex] = this.typeMap.method[`${className}#${methodName}`];
    return this.classes[classIndex].methods[methodIndex];
  }

  static getEventDescriptor(className: string, eventName: string) {
    const [classIndex, eventIndex] = this.typeMap.event[`${className}$${eventName}`];
    return this.classes[classIndex].events[eventIndex];
  }

  static getPropDescriptor(className: string, propName: string) {
    const [classIndex, propIndex] = this.typeMap.prop[`${className}~${propName}`];
    return this.classes[classIndex].props[propIndex];
  }

  static getTypeDescriptor(typeName: string) {
    const typeIndex = this.typeMap.typedef[typeName];
    return this.data.typedefs[typeIndex];
  }

  static findFirstMatch(className: string, typeName?: string): AnyStructureDescriptor {
    for (const connector of this.knownSymbols) {
      const assumedKey = [className, typeName].join(connector);
      const entityType = this.typeMap.all[assumedKey];

      switch (entityType) {
        case undefined:
        case null:
          continue;
        case 'class':
          return this.getClassDescriptor(className);
        case 'event':
          return this.getEventDescriptor(className, typeName);
        case 'method':
          return this.getMethodDescriptor(className, typeName);
        case 'prop':
          return this.getPropDescriptor(className, typeName);
        case 'typedef':
          return this.getTypeDescriptor(className);
      }
    }

    return undefined;
  }

  static fuzzyFilter = (entityPath: string[], typeFilter: keyof TypeMap = 'all', limit: number = 25) =>
    simpleFilter(entityPath.join('*'), Object.keys(this.typeMap[typeFilter])).slice(0, limit);

  static {
    getJSON(targetURI).then((doc: DocumentationRoot) => {
      this.data = doc;
      this.generateTypeMap();
    });
  }

  static generateTypeMap() {
    this.typeMap = {
      class: {},
      event: {},
      method: {},
      typedef: {},
      prop: {},
      all: {}
    };

    for (const [classIndex, classEntry] of this.data.classes.entries()) {
      // console.log(`[Class] ${classEntry.name} at ${classIndex}`);
      this.typeMap.class[classEntry.name] = classIndex;
      this.typeMap.all[classEntry.name] = 'class';

      if (classEntry.events) {
        for (const [eventIndex, eventEntry] of classEntry.events.entries()) {
          const key = `${classEntry.name}$${eventEntry.name}`;
          // console.log(`[Event] ${key} at ${eventIndex}`);
          this.typeMap.event[key] = [classIndex, eventIndex];
          this.typeMap.all[key] = 'event';
        }
      }

      if (classEntry.methods) {
        for (const [methodIndex, methodEntry] of classEntry.methods.entries()) {
          const shouldSkip = exclusionRegex.test(methodEntry.name);
          const key = `${classEntry.name}#${methodEntry.name}`;
          // console.log(`[Method] ${key} at ${methodIndex}  ${shouldSkip ? ', Skipping...' : ''}`);
          if (!shouldSkip) {
            this.typeMap.method[key] = [classIndex, methodIndex];
            this.typeMap.all[key] = 'method';
          }
        }
      }

      if (classEntry.props) {
        for (const [propIndex, propEntry] of classEntry.props.entries()) {
          const shouldSkip = exclusionRegex.test(propEntry.name);
          const key = `${classEntry.name}~${propEntry.name}`;
          // console.log(`[Member] ${key} at ${propIndex} ${shouldSkip ? ', Skipping...' : ''}`);
          if (!shouldSkip) {
            this.typeMap.prop[key] = [classIndex, propIndex];
            this.typeMap.all[key] = 'prop';
          }
        }
      }
    }

    for (const [typeIndex, typeEntry] of this.data.typedefs.entries()) {
      // console.log(`[Type] ${typeEntry.name} at ${typeIndex}`);
      this.typeMap.typedef[typeEntry.name] = typeIndex;
      this.typeMap.all[typeEntry.name] = 'typedef';
    }
  }
}
