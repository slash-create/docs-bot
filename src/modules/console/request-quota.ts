import { TIME } from "&common/constants";
import { FixedInterval } from "&common/fixed-interval";

new FixedInterval(TIME.HOUR, 0, false, (call: number) => {
	RequestQuota.debugAll();
	if (call % 6 === 0) RequestQuota.flush();
	else RequestQuota.prune();
});

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export default class RequestQuota {
	static tally = new Map<string, QuotaStruct>();

	static patch(headers: Headers) {
		const dict = {} as QuotaStruct;
		for (const header of ["limit", "remaining", "reset", "used", "resource"]) {
			dict[header] = headers.get(`x-ratelimit-${header}`);
		}
		if (!dict.resource) return;
		RequestQuota.tally.set(dict.resource, dict);
	}

	static flush() {
		RequestQuota.tally.clear();
	}

	static prune() {
		for (const [key, quota] of RequestQuota.tally) {
			const resetDate = quota.reset * TIME.SECOND;
			if (resetDate < Date.now()) RequestQuota.tally.delete(key);
		}
	}

	static *debug() {
		for (const [res, quota] of RequestQuota.tally) {
			yield RequestQuota.#buildQuotaString(res, quota);
		}
	}

	static debugAll() {
		for (const entry of RequestQuota.debug())
			console.log(entry);
	}

	static #buildQuotaString(resource: string, quota: QuotaStruct) {
		if (!quota.used) return;

		const date = new Date(quota.reset * TIME.SECOND);
		return `"${resource}" has ${
			quota.remaining
		} requests left on quota, resetting at ${date.toLocaleString()}`;
	}
}

interface QuotaStruct {
	limit: number;
	used: number;
	remaining: number;
	reset: number; // {instant} / 1000
	resource: string;
}
