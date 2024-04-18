import { semver } from "bun";
import { filter } from "fuzzy";

import { FixedInterval } from "&common/fixed-interval";
import { TIME } from "&common/constants";

import { VERSION_REGEX } from "./constants";
import type { AggregatorInformation, GitTreeBranchResponse } from "./types";
import { TypeNavigator } from "./navigator";
import type { Provider } from "./source";

export default class VersionAggregator {
  readonly provider: Provider;

  constructor(provider: Provider) {
    this.provider = provider;
    this.#setupInterval();
  }

  #lastFetch: number;
  _latestRelease?: string;
  #ready = false;

  get ready() {
    return this.#ready;
  }

  #deferred = Promise.withResolvers();
  #interval: FixedInterval;

  #releases: string[];
  #branches: string[];
  #navigators: Map<string, TypeNavigator>;

  get debug(): AggregatorInformation {
    const self = this;
    return {
      ready: this.#ready,
      branches: this.#branches.length,
      versions: this.#releases.length,
      navigatorCount: this.#navigators.size,
      lastFetch: this.#lastFetch,
      get lastFetchAt() {
        return new Date(self.#lastFetch);
      },
      latest: this.latestRelease,
    };
  }

  get latestRelease() {
    if (!this.#ready) return null;

    if (!this._latestRelease) {
      this._latestRelease = this.#releases[0];
    }

    return this._latestRelease;
  }

  get releases() {
    if (!this.#ready) return [];
    return this.#releases.slice();
  }

  get branches() {
    if (!this.#ready) return [];
    return this.#branches.slice();
  }

  get all() {
    if (!this.#ready) return [];
    return [].concat(this.branches, this.releases);
  }

  get onReady() {
    return this.#deferred.promise;
  }

  filter(query: string) {
    return filter(query, this.all);
  }

  getTag(tag: string): TypeNavigator | undefined {
    if (this.all.includes(tag) && !this.#navigators.has(tag)) {
      this.#navigators.set(tag, new TypeNavigator(tag, this));
    }

    return this.#navigators.get(tag);

    // otherwise... not my problem - which also caches if the class isn't ready
  }

  #setupInterval(force = true) {
    if (this.#interval && !force) return;

    this.#interval = new FixedInterval(
      TIME.HOUR * 3,
      0,
      false,
      this.refresh.bind(this),
    );
    this.refresh();
  }

  async refresh() {
    this.#ready = false;
    this.#deferred = Promise.withResolvers();

    const res = await this.provider.fetchGitHubAPI(
      this.provider.baseStructURL("docs"),
    );
    const data: GitTreeBranchResponse = await res.json();

    this._latestRelease = null;
    this.#lastFetch = Date.now();
    this.#branches = [];
    this.#releases = [];
    this.#navigators = new Map();

    for (const node of data.tree) {
      if (node.path.includes("dependabot")) continue;
      if (!node.path.endsWith(".json")) continue;

      const tag = node.path.slice(0, -5);
      const isRelease = VERSION_REGEX.test(tag);

      const array = isRelease ? this.#releases : this.#branches;
      array.unshift(tag);
    }

    this.#releases.sort((v1, v2) => semver.order(v2.slice(1), v1.slice(1)));
    console.log(
      `[${this.provider.docsHost}] Loaded ${this.#branches.length} branches & ${this.#releases.length} releases`,
    );

    this.#ready = true;

    await this.getTag(this.latestRelease).onReady;

    this.#deferred.resolve();
  }

  destroy() {
    this.#interval.destroy();
    this.#ready = false;
  }
}
