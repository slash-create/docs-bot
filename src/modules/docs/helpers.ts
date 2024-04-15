import type { TypeNavigator } from './navigator';
import type { AnyChildDescriptor, AnyDescriptor, AnyStructureDescriptor, DocumentationFile } from './types';

export function getSymbol(type: string) {
  switch (type.toLowerCase()) {
    case 'event':
    case 'events':
      return '$';
    case 'method':
    case 'methods':
      return '#';
    case 'member':
    case 'members':
    case 'prop':
    case 'props':
      return '~';
    default:
      return null;
  }
}

export function defineCommon(
  navigator: TypeNavigator,
  type: string,
  parent: AnyDescriptor,
  child?: AnyChildDescriptor,
  symbol?: string
): AnyDescriptor {
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

  if (focus.meta) {
    Reflect.set(focus.meta, 'toString', function (this: DocumentationFile) {
      return `${this.path}/${this.file}#L${this.line}`;
    });
  } else {
    Reflect.set(focus, 'meta', {
      toString(this: AnyDescriptor) {
        return this.parent.meta.toString();
      }
    });
  }

  Reflect.set(focus, Symbol.species, type);

  Reflect.defineProperty(focus, 'navigator', {
    get(this: AnyDescriptor) {
      return navigator;
    }
  });

  Reflect.defineProperty(focus, 'species', {
    get(this: AnyDescriptor) {
      return this[Symbol.species];
    }
  });

  Reflect.set(focus, 'is', function (this: AnyDescriptor, ...query: string[]) {
    return query.includes(this.species);
  });

  return focus;
}
