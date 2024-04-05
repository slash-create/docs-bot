import { semver } from 'bun';

import { FixedInterval } from '../common/fixed-interval';
import { ONE_HOUR } from '../../util/constants';

import { GITHUB_API_URL, SOURCE_REPO, VERSION_REGEX } from './constants';
import { AggregatorInformation, GitTreeBranchResponse } from './types';
import { TypeNavigator } from './navigator';
import { githubAPI } from '../common/requests';

export default class VersionAggregator {
  static #lastFetch: number;
  static _latestRelease?: string;
  static #ready: boolean = false;
  static #interval: FixedInterval;

  static #releases: string[];
  static #branches: string[];

  static #endpoint = `/repos/${SOURCE_REPO}/git/trees/docs` as const;

  static {
    this.#setupInterval();
  }

  static get debug(): AggregatorInformation {
    const self = this;
    return {
      ready: this.#ready,
      branches: this.#branches.length,
      versions: this.#releases.length,
      lastFetch: this.#lastFetch,
      get lastFetchAt() {
        return new Date(self.#lastFetch);
      },
      latest: this._latestRelease
    };
  }

  static get latestRelease() {
    if (!this.#ready) return null;

    if (!this._latestRelease) {
      [this._latestRelease] = this.#releases;
    }
    return this._latestRelease;
  }

  static get releases() {
    if (!this.#ready) return [];
    return this.#releases.slice();
  }

  static get branches() {
    if (!this.#ready) return [];
    return this.#branches.slice();
  }

  static #setupInterval(force: boolean = true) {
    if (this.#interval && !force) return;

    this.#interval = new FixedInterval(ONE_HOUR, 0, false, this.refresh.bind(this));
    this.refresh();
  }

  static async refresh() {
    this.#ready = false;

    const data = await githubAPI.request<GitTreeBranchResponse>('GET', this.#endpoint);

    delete this._latestRelease;
    this.#lastFetch = Date.now();
    this.#branches = [];
    this.#releases = [];

    for (const node of data.tree) {
      if (node.path.includes('dependabot')) continue;
      if (!node.path.endsWith('.json')) continue;

      const tag = node.path.slice(0, -5);
      const isRelease = VERSION_REGEX.test(tag);

      const array = isRelease ? this.#releases : this.#branches;
      array.unshift(isRelease ? tag.slice(1) : tag);

      console.log(`Found ${isRelease ? 'release' : 'branch'} ${tag}`);
    }

    this.#releases.sort((v1, v2) => semver.order(v2, v1));
    this.#ready = true;
  }

  static destroy() {
    this.#interval.destory();
    this.#ready = false;
  }
}
