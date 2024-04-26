export interface FileCacheOptions {
	cacheKey?: (req: RequestInfo | URL) => string;
}

export interface FileCacheEntry {
	body: string;
	fetchedAt: number;
	resolvedAs: string;
}
