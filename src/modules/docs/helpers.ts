import { AnyChildDescriptor, AnyDescriptor, AnyStructureDescriptor } from './types';

export function getSymbol(type: string) {
  switch (type.toLowerCase()) {
    case 'events':
      return '$';
    case 'methods':
      return '#';
    case 'members':
    case 'props':
      return '~';
    default:
      return null;
  }
}

export function defineCommon(type: string, parent: AnyDescriptor, child?: AnyChildDescriptor, symbol?: string) {
  if (child) {
    Reflect.defineProperty(child, 'parent', {
      get() {
        return parent;
      }
    });
  }

  const focus = child ?? parent;

  Reflect.set(focus, 'toString', function (this: AnyDescriptor) {
    return ('parent' in this ? this.parent.name + symbol : '') + this.name;
  });

  Reflect.set(focus, Symbol.species, type);
  Reflect.defineProperty(focus, 'type', {
    get(this: AnyDescriptor) {
      return this[Symbol.species];
    }
  });
  Reflect.set(focus, 'is', function (this: AnyDescriptor, ...query: string[]) {
    return query.includes(this.species);
  });

  return focus;
}
