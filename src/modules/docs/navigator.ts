/**
 * Fetch all *.json files
 * https://api.github.com/repos/Snazzah/slash-create/git/trees/docs
 * Filter all paths at .tree.*.path using ".json$"
 * *Includes all valid docfile references even if they aren't publically shown.*
 * Reverse the list, pickout the last 3 major versions (v[4-6].*.*) along with "latest" and "master"
 * *Then filter out which one of those has the later patch in all minor versions.*
 */

import { filter } from 'fuzzy';

import { ONE_HOUR } from '../../util/constants';
import { FixedInterval } from '../common/fixed-interval';
import { GITHUB_RAW_URL, SOURCE_REPO } from './constants';

import { AnyChildDescriptor, AnyDescriptor, DocumentationRoot, TypeSymbol } from './types';
import { Collection } from 'slash-create';
import { defineCommon, getSymbol } from './helpers';

export class TypeNavigator {
  static knownSymbols = {
    METHOD: TypeSymbol.Method,
    MEMBER: TypeSymbol.Member,
    EVENT: TypeSymbol.Event
  };

  #ready = false;
  #fetchedAt?: number;
  #raw?: DocumentationRoot;
  #interval: FixedInterval;

  get meta() {
    if (!this.#ready) return undefined;
    return this.#raw.meta;
  }

  get ready() {
    return this.#ready;
  }

  knownFiles: string[] = [];
  map: Collection<string, AnyDescriptor> = new Collection();
  // {type} -> {entry} + {get parent?}

  constructor(public readonly tag: string) {
    this.#setupInterval();

    // #fetchedAt
  }

  #setupInterval(force: boolean = false) {
    if (this.#interval && !force) return;

    this.#interval = new FixedInterval(ONE_HOUR / 4, 0, false, this.refresh.bind(this));
    this.refresh();
  }

  get #targetURI() {
    return `${GITHUB_RAW_URL}/${SOURCE_REPO}/docs/${this.tag}.json`;
  }

  static joinKey(entryPath: string[], connector: string) {
    return entryPath.filter(Boolean).join(connector);
  }

  get<T extends AnyDescriptor>(entity: string): T {
    return this.map.get(entity) as T;
  }

  filter(entityPath: string, limit: number = 25) {
    if (!this.#ready) return [];

    return filter(entityPath, [...this.map.keys()]).slice(0, limit);
  }
  /*
  find(parentName: string, childName?: string) {
    if (!this.#ready) return;

    for (const connector of Object.values(TypeNavigator.knownSymbols)) {
      const assumedKey = TypeNavigator.joinKey([parentName, childName], connector);

      if (!this.map.has(assumedKey)) continue;
      else return this.map.get(assumedKey);
    }
  }
  */
  async refresh() {
    this.#ready = false;
    this.map.clear();

    const res = await fetch(this.#targetURI);
    this.#raw = await res.json();

    this.#fetchedAt = Date.now();

    for (const classEntry of this.#raw.classes) {
      this.#define('class', classEntry);
    }

    for (const typeEntry of this.#raw.typedefs) {
      this.#define('typedef', typeEntry);
    }

    this.#ready = true;
  }

  #define<Descriptor extends AnyDescriptor>(descriptorType: string, descriptor: Descriptor) {
    defineCommon(descriptorType, descriptor);

    this.map.set(descriptor.toString(), descriptor);
    this.#registerKnownFile([descriptor.meta.path, descriptor.meta.file]);

    const pairs = {
      Event: 'events',
      Method: 'methods',
      Member: 'props'
    };

    for (const [species, location] of Object.entries(pairs)) {
      if (location in descriptor) {
        for (const entry of descriptor[location] as AnyChildDescriptor[]) {
          const symbol = getSymbol(species);

          defineCommon(species, descriptor, entry, symbol);

          this.map.set(entry.toString(), entry);
          this.#registerKnownFile([entry.meta.path, entry.meta.file]);
        }
      }
    }
  }

  #registerKnownFile(path: string | string[]) {
    const [filePath] = (Array.isArray(path) ? path.join('/') : path).split('#');
    if (!filePath.startsWith('src')) return;
    if (!this.knownFiles.includes(filePath)) this.knownFiles.push(filePath);
  }
}
