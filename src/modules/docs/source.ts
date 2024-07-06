import { capitalize } from "&common/helpers";
import { filter } from "fuzzy";

import { GITHUB_API_URL, GITHUB_RAW_URL, GITHUB_WEB_URL } from "./constants";
import type {
  AnyDescriptor,
  GitHubViewMode,
  ProviderOptions,
} from "./types";
import VersionAggregator from "./version-aggregator";
import RequestQuota from "&console/request-quota";

export class Provider implements ProviderOptions {
  aggregator: VersionAggregator;

  label: string;
  docsHost: string;
  iconAsset: string;
  repoLocation: string;
  embedColor: number;
  docsURL: (this: this, tag: string, descriptor: AnyDescriptor) => string;
  rawDocsURL: (
    this: this,
    tag: string,
    species: string,
    type: string,
  ) => string;

  private constructor(options: ProviderOptions) {
    this.label = options.label;
    this.docsHost = options.docsHost;
    this.iconAsset = options.iconAsset;
    this.repoLocation = options.repoLocation;
    this.embedColor = options.embedColor;
    this.docsURL = options.docsURL.bind(this);
    this.rawDocsURL = options.rawDocsURL.bind(this);

    this.aggregator = new VersionAggregator(this);
  }

  baseRepoURL(ref = "master", view: GitHubViewMode = "tree") {
    if (ref === "latest") ref = this.aggregator.latestRelease;
    return `${GITHUB_WEB_URL}/${this.repoLocation}/${view}/${ref}`;
  }

  baseStructURL(ref = "master") {
    if (ref === "latest") ref = this.aggregator.latestRelease;
    return `${GITHUB_API_URL}/repos/${this.repoLocation}/git/trees/${ref}`;
  }

  baseRawURL(ref = "master") {
    if (ref === "latest") ref = this.aggregator.latestRelease;
    return `${GITHUB_RAW_URL}/${this.repoLocation}/${ref}`;
  }

  fetchGitHubAPI(endpoint: string, method = "GET"): Promise<Response> {
    return this.#fetchGitHubCommon(new URL(endpoint, GITHUB_API_URL), method);
  }

  fetchGitHubRaw(endpoint: string, method = "GET"): Promise<Response> {
    return this.#fetchGitHubCommon(new URL(endpoint, GITHUB_RAW_URL), method);
  }

  async #fetchGitHubCommon(url: URL, method: string): Promise<Response> {
    const res = await fetch(url, {
      method,
      ...(process.env.GITHUB_API_TOKEN && {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_API_TOKEN}`
        }
      })
    });

    RequestQuota.patch(res.headers);

    if (res.status > 400 && res.status < 600) {
      console.error(this.label, res.status, res.statusText);
      if (res.status === 403) {
        const resetHeader = new Date(+res.headers.get('x-ratelimit-reset') * 1000);
        console.warn(this.label, "reset at", resetHeader);
      }
    }

    return res;
  }

  get iconURL() {
    if (this.iconAsset.startsWith("https://")) return this.iconAsset;
    return `${this.baseRawURL()}/${this.iconAsset}`;
  }

  static readonly sharedBuilders: Record<
    string,
    Pick<ProviderOptions, "docsURL" | "rawDocsURL">
  > = {
      slashCreate: {
        docsURL(this: Provider, tag: string, descriptor: AnyDescriptor) {
          let path = descriptor.name;
          let species: AnyDescriptor["species"] = descriptor.species;

          if (descriptor.species === "event") path = `e-${path}`;

          if (descriptor.parent) {
            path = `${descriptor.parent.name}?scrollTo=${path}`;
            species = descriptor.parent.species;
          }

          return `https://${this.docsHost}/#/docs/main/${tag}/${species}/${path}`;
        },
        rawDocsURL(this: Provider, tag: string, species: string, type: string) {
          return `https://${this.docsHost}/#/docs/main/${tag}/${species}/${type}`;
        },
      },
      discordJS: {
        docsURL(this: Provider, tag: string, descriptor: AnyDescriptor) {
          let path = descriptor.name;

          if (descriptor.parent)
            path = `${descriptor.parent.name}:${capitalize(
              descriptor.parent.species,
            )}#${path}`;
          else path += `:${capitalize(descriptor.species)}`;

          // infer docsHost as "discordjs.dev/docs/packages"
          return `https://${this.docsHost}/${tag}/${path}`;
        },
        rawDocsURL(this: Provider, tag: string, species: string, type: string) {
          const [parent, child] = type.split("#");
          return `https://${this.docsHost}/${tag}/${parent}:${capitalize(
            species,
          )}#${child}`;
        },
      },
    };

  static readonly dbots = new Provider({
    label: "dbots.js",
    docsHost: "dbots.js.org",
    iconAsset: "static/logo.png",
    repoLocation: "dbots-pkg/dbots.js",
    embedColor: 0xf5771f, // Orange
    ...this.sharedBuilders.slashCreate,
  });

  static readonly dbotHook = new Provider({
    label: "dbothook.js",
    docsHost: "dbothook.js.org",
    iconAsset: "static/logo.png",
    repoLocation: "dbots-pkg/dbothook.js",
    embedColor: 0xf5771f, // Orange
    ...this.sharedBuilders.slashCreate,
  });

  static readonly slashCreate = new Provider({
    label: "slash-create",
    docsHost: "slash-create.js.org",
    iconAsset: "https://github.com/slash-create.png",
    repoLocation: "Snazzah/slash-create",
    embedColor: 0xf31231, // Crimson / Torch Red
    ...this.sharedBuilders.slashCreate,
  });

  static get all() {
    return [Provider.dbots, Provider.dbotHook, Provider.slashCreate];
  }

  static get list() {
    return Provider.all.map(provider => provider.label);
  }

  static filter(query: string) {
    return filter(query, Provider.list);
  }

  static get map() {
    return new Map(Provider.all.map((provider) => [provider.label, provider]));
  }

  static get(query: string): Provider | undefined {
    return Provider.map.get(query);
  }
}

export default {
  dbots: Provider.dbots,
  dbotHook: Provider.dbotHook,
  slashCreate: Provider.slashCreate,
  filter: Provider.filter,
  map: Provider.map,
  get: Provider.get,
};

//await Provider.slashCreate.aggregator.onReady;
//const typeNavigator = Provider.slashCreate.aggregator.getTag('v6.1.2');
//await typeNavigator.onReady;
//console.log(typeNavigator.knownFiles);
