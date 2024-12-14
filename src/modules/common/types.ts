export interface FileCacheOptions {
	cacheKey?: (req: RequestInfo | URL) => string;
}

export interface FileCacheEntry {
	body: string;
	fetchedAt: number;
	resolvedAs: string;
}

export interface MessageCharacterCount {
	$total?: number;
	content?: number;
	embeds?: {
		$total?: number;
		title?: number;
		description?: number;
		url?: number;
		footer?: number;
		fields?: {
			$total?: number;
			name?: number;
			value?: number;
		}[];
	}[];
}
