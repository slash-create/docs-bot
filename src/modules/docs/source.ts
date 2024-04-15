import { capitalize } from "&common/helpers";

import { GITHUB_API_URL, GITHUB_RAW_URL, GITHUB_WEB_URL } from "./constants";
import { AnyDescriptor, GitHubViewMode, ProviderOptions, TypeString } from "./types";
import VersionAggregator from "./version-aggregator";

export class Provider implements ProviderOptions {
  aggregator = new VersionAggregator(this);

  label: string;
  docsHost: string;
  repoLocation: string;
  embedColor: number;
  docsURL: (this: this, tag: string, descriptor: AnyDescriptor) => string;
  rawDocsURL: (this: this, tag: string, species: string, type: string) => string;

  private constructor(options: ProviderOptions) {
    this.label = options.label;
    this.docsHost = options.docsHost;
    this.repoLocation = options.repoLocation;
    this.embedColor = options.embedColor;
    this.docsURL = options.docsURL.bind(this);
    this.rawDocsURL = options.rawDocsURL.bind(this);
  }

  baseRepoURL(ref: string = 'master', view: GitHubViewMode = 'tree') {
    return `${GITHUB_WEB_URL}/${this.repoLocation}/${view}/${ref}`;
  }

  baseStructURL(ref: string = 'master') {
    return `${GITHUB_API_URL}/repos/${this.repoLocation}/git/tree/${ref}`;
  }

  baseRawURL(ref: string = 'master') {
    return `${GITHUB_RAW_URL}/${this.repoLocation}/${ref}`;
  }

  static readonly sharedBuilders: Record<string, Pick<ProviderOptions, 'docsURL' | 'rawDocsURL'>> = {
    slashCreate: {
      docsURL(this: Provider, tag: string, descriptor: AnyDescriptor) {
        let path = descriptor.name;
        let species: AnyDescriptor['species'];

        if (descriptor.species === 'event')
          path = 'e-' + path;

        if (descriptor.parent) {
          path = descriptor.parent.name + '?scrollTo=' + path;
          species = descriptor.parent.species;
        }

        return `https://${this.docsHost}/#/docs/main/${tag}/${species}/${path}`;
      },
      rawDocsURL(this: Provider, tag: string, species: string, type: string) {
        return `https://${this.docsHost}/#/docs/main/${tag}/${species}/${type}`
      }
    },
    discordJS: {
      docsURL(this: Provider, tag: string, descriptor: AnyDescriptor) {
        let path = descriptor.name;

        if (descriptor.parent)
          path += `${descriptor.parent.name}:${capitalize(descriptor.parent.species)}#${path}`;
        else path += ':' + capitalize(descriptor.species);

        // infer docsHost as "discordjs.dev/docs/packages"
        return `https://${this.docsHost}/${tag}/${path}`;
      },
      rawDocsURL(this: Provider, tag: string, species: string, type: string) {
        const [parent, child] = type.split('#');
        return `https://${this.docsHost}/${tag}/${parent}:${capitalize(species)}#${child}`;
      }
    }
  }

  static readonly dbotsSource = new Provider({
      label: 'dbots.js',
      docsHost: 'dbots.js.org',
      repoLocation: 'dbots-pkg/dbots.js',
      embedColor: 0xF5771F, // Orange
      ...this.sharedBuilders.slashCreate
    });

    static readonly dbotHookSource = new Provider({
      label: 'dbothook.js',
      docsHost: 'dbothook.js.org',
      repoLocation: 'dbots-pkg/dbothook.js',
      embedColor: 0xF5771F, // Orange
      ...this.sharedBuilders.slashCreate
    });

    static readonly slashCreateSource = new Provider({
      label: 'slash-create',
      docsHost: 'slash-create.js.org',
      repoLocation: 'Snazzah/slash-create',
      embedColor: 0xF31231, // Crimson / Torch Red
      ...this.sharedBuilders.slashCreate
    });

    static get all() {
      return [
        this.dbotsSource,
        this.dbotHookSource,
        this.slashCreateSource
      ];
    }

  static get map() {
      return new Map(this.all.map((provider) => [provider.label, provider]))
    }

  static get(query: string): Provider | undefined {
      return this.map.get(query);
    }
  }

export default {
  dbots: Provider.dbotsSource,
  dbotHook: Provider.dbotHookSource,
  slashCreate: Provider.slashCreateSource
}
