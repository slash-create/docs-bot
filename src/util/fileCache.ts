import bent from 'bent';
import { Collection } from 'slash-create';
import { ONE_HOUR } from './common';

import { BRANCH, rawContentLink } from './linkBuilder';
import logger from './logger';

export interface CacheInfo {
  body: string;
  fetchedAt: number;
  ref: string;
}

const getText = bent('string');

export class FileCache {
  private cache: Collection<string, CacheInfo> = new Collection();
  private cacheTime: number = ONE_HOUR; // 1 hour
  private _interval: NodeJS.Timeout;

  static buildRawURL = (ref: string, path: string) => `${rawContentLink}/${ref}/${path.replace(/#.*/, '')}`;

  constructor() {
    this._interval = setInterval(() => {
      const purgeStart = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (entry.fetchedAt + this.cacheTime > purgeStart) {
          this.cache.delete(key);
        }
      }
    }, this.cacheTime);
  }

  destroy() {
    clearInterval(this._interval);
    this._interval = null;
    this.cache.clear();
  }

  /**
   *
   * @param ref What reference does the file we're looking for reside on?
   * @param path Where is this file located?
   */
  has = (path: string, ref: string = BRANCH): boolean => this.cache.has(`${ref}:${path}`);

  get = (path: string, ref: string = BRANCH): CacheInfo => this.cache.get(`${ref}:${path}`);

  async fetch(path: string, ref: string = BRANCH): Promise<CacheInfo> {
    if (this.has(path, ref)) {
      const entry = this.get(path, ref);
      if (entry.fetchedAt + this.cacheTime > Date.now()) {
        logger.info(`[Cache] Found '${path}' cached at '${ref}'`);
        return entry;
      }
      logger.info(`[Cache] Found outdated '${path}', fetching newer entry`);
      this.cache.delete(`${ref}:${path}`);
    }

    const url = FileCache.buildRawURL(ref, path);
    const body: string = await getText(url);

    if (!body) throw 'Not Found';

    const cacheEntry: CacheInfo = { ref, body, fetchedAt: Date.now() };

    this.cache.set(`${ref}:${path}`, cacheEntry);

    return cacheEntry;
  }
}

export default new FileCache();
