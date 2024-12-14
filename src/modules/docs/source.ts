import { capitalize } from "&common/helpers";
import { filter } from "fuzzy";

import { GITHUB_API_URL, GITHUB_RAW_URL, GITHUB_WEB_URL } from "./constants";
import type {
	AnyDescriptor,
	DocsHostOptions,
	DocsRepoOptions,
	GitHubViewMode,
	ProviderOptions,
} from "./types";
import VersionAggregator from "./version-aggregator";
import RequestQuota from "&console/request-quota";
import { TIME } from "&common/constants";

export class Provider implements ProviderOptions {
	aggregator: VersionAggregator;

	// {cacheKey(req: RequestInfo | URL): string} -> Promise<Response>
	static cache: Map<URL, { response: Response; fetchedAt: number }> = new Map();

	label: string;

	docs: DocsHostOptions;
	repo: DocsRepoOptions;

	docsURL: (this: this, tag: string, descriptor: AnyDescriptor) => string;
	partDocsURL: (
		this: this,
		tag: string,
		species: string,
		type: string,
	) => string;

	constructor(options: ProviderOptions) {
		this.label = options.label;
		this.docs = options.docs;
		this.repo = options.repo;
		this.docsURL = options.docsURL.bind(this);
		this.partDocsURL = options.partDocsURL.bind(this);

		this.aggregator = new VersionAggregator(this);
		Provider.all.push(this);
	}

	webRepoURL(ref = this.repo.defaultBranch, view: GitHubViewMode = "tree") {
		if (ref === "latest") ref = this.aggregator.latestRelease;
		let path = `${GITHUB_WEB_URL}/${this.repo.source.location}/${view}/${ref}`;
		if (this.repo.source.folder) path += `/${this.repo.source.folder}`;
		return path;
	}

	baseStructURL(target: "source" | "manifest", ref = this.repo.defaultBranch) {
		if (ref === "latest") ref = this.aggregator.latestRelease;
		return `${GITHUB_API_URL}/repos/${this.repo[target].location}/git/trees/${ref}`;
		// if (this.repo[target].folder) path += `/${this.repo[target].folder}`;
	}

	sourceStructURL = (ref = this.repo.defaultBranch) =>
		this.baseStructURL("source", ref);
	manifestStructURL = (ref = this.repo.defaultBranch) =>
		this.baseStructURL("manifest", ref);

	baseRawURL(
		target: "source" | "manifest",
		ref = this.repo.defaultBranch,
		file?: string,
	) {
		if (ref === "latest") ref = this.aggregator.latestRelease;
		let path = `${GITHUB_RAW_URL}/${this.repo[target].location}/${ref}`;
		if (this.repo[target].folder) path += `/${this.repo[target].folder}`;
		if (file) path += `/${file}`;
		return path;
	}

	rawRepoURL = (file?: string, ref = this.repo.defaultBranch) =>
		this.baseRawURL("source", ref, file);
	rawDocsURL = (file?: string, ref = this.repo.manifest.branch) =>
		this.baseRawURL("manifest", ref, file);

	fetchGitHubAPI(
		endpoint: string,
		options: RequestInit = { method: "GET" },
	): Promise<Response> {
		return this.#fetchGitHubCommon(new URL(endpoint, GITHUB_API_URL), options);
	}

	fetchGitHubRaw(
		endpoint: string,
		options: RequestInit = { method: "GET" },
	): Promise<Response> {
		return this.#fetchGitHubCommon(new URL(endpoint, GITHUB_RAW_URL), options);
	}

	async #fetchGitHubCommon(url: URL, options: RequestInit): Promise<Response> {
		if (Provider.cache.has(url)) {
			const cached = Provider.cache.get(url);
			console.log(`Provider(${this.label}) Cache hit`, url, cached.fetchedAt);
			if (cached.fetchedAt > Date.now() - TIME.MINUTE) return cached.response;
		}

		const res = await fetch(url, {
			...options,
			...(process.env.GITHUB_API_TOKEN && {
				headers: {
					Authorization: `Bearer ${process.env.GITHUB_API_TOKEN}`,
				},
			}),
		});

		if (res.status > 400 && res.status < 600) {
			console.error(this.label, res.url, res.status, res.statusText);
			if (res.status === 403) {
				const resetHeader = new Date(
					+res.headers.get("x-ratelimit-reset") * 1000,
				);
				console.warn(this.label, "reset at", resetHeader);
			}
		}

		RequestQuota.patch(res.headers);

		Provider.cache.set(url, { response: res, fetchedAt: Date.now() });

		return res;
	}

	get iconURL() {
		if (this.docs.iconAsset.startsWith("https://")) return this.docs.iconAsset;
		return `${this.rawRepoURL()}/${this.docs.iconAsset}`;
	}

	static readonly sharedBuilders = {
		slashCreate: {
			docsURL(this: Provider, tag: string, descriptor: AnyDescriptor) {
				let path = descriptor.name;
				let species: AnyDescriptor["species"] = descriptor.species;

				if (descriptor.species === "event") path = `e-${path}`;

				if (descriptor.parent) {
					path = `${descriptor.parent.name}?scrollTo=${path}`;
					species = descriptor.parent.species;
				}

				return `https://${this.docs.host}/#/docs/main/${tag}/${species}/${path}`;
			},
			partDocsURL(this: Provider, tag: string, species: string, type: string) {
				return `https://${this.docs.host}/#/docs/main/${tag}/${species}/${type}`;
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

				return `https://${this.docs.host}/docs/packages/${this.docs.package ?? this.label}/${tag}/${path}`;
			},
			partDocsURL(this: Provider, tag: string, species: string, type: string) {
				const [parent, child] = type.split("#");
				return `https://${this.docs.host}/docs/packages/${this.docs.package ?? this.label}/${tag}/${parent}:${capitalize(
					species,
				)}#${child}`;
			},
		},
	} satisfies Record<string, Pick<ProviderOptions, "docsURL" | "partDocsURL">>;

	static all: Provider[] = [];

	static readonly dbots = new Provider({
		label: "dbots.js",
		docs: {
			host: "dbots.js.org",
			iconAsset: "static/logo.png",
			embedColor: 0xf5771f, // Orange
		},
		repo: {
			source: {
				location: "dbots-pkg/dbots.js",
			},
			manifest: {
				location: "dbots-pkg/dbots.js",
				branch: "docs",
			},
			defaultBranch: "master",
		},
		...this.sharedBuilders.slashCreate,
	});

	static readonly dbotHook = new Provider({
		label: "dbothook.js",
		docs: {
			host: "dbothook.js.org",
			iconAsset: "static/logo.png",
			embedColor: 0xf5771f, // Orange
		},
		repo: {
			source: {
				location: "dbots-pkg/dbothook.js",
			},
			manifest: {
				location: "dbots-pkg/dbothook.js",
				branch: "docs",
			},
			defaultBranch: "master",
		},
		...this.sharedBuilders.slashCreate,
	});

	static readonly slashCreate = new Provider({
		label: "slash-create",
		docs: {
			host: "slash-create.js.org",
			iconAsset: "https://github.com/slash-create.png",
			embedColor: 0xf31231, // Crimson / Torch Red
		},
		repo: {
			source: {
				location: "Snazzah/slash-create",
			},
			manifest: {
				location: "Snazzah/slash-create",
				branch: "docs",
			},
			defaultBranch: "master",
		},
		...this.sharedBuilders.slashCreate,
	});

	static readonly discordJs = new Provider({
		label: "discord.js",
		docs: {
			host: "discord.js.org",
			iconAsset:
				"https://raw.githubusercontent.com/discordjs/discord.js/main/apps/website/public/apple-touch-icon.png",
			embedColor: 0x7289da, // (Old) Blurple
		},
		repo: {
			source: {
				location: "discordjs/discord.js",
				folder: "packages/discord.js",
			},
			manifest: {
				location: "discordjs/docs",
				branch: "main",
				folder: "discord.js",
			},
			defaultBranch: "main",
		},
		...this.sharedBuilders.discordJS,
	});

	static get list() {
		return Provider.all.map((provider) => provider.label);
	}

	static filter(query: string) {
		return filter(query, Provider.all, { extract: (input) => input.label });
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
	discordJs: Provider.discordJs,
	filter: Provider.filter,
	map: Provider.map,
	get: Provider.get,
};

// await Provider.discordJs.aggregator.onReady;
// const typeNavigator = Provider.discordJs.aggregator.getTag(Provider.discordJs.aggregator.latestRelease);
// await typeNavigator.onReady;
// console.log(typeNavigator.map);
