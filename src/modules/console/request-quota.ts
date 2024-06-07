import { TIME } from "&common/constants";
import { FixedInterval } from "&common/fixed-interval";
import { serverOffset } from "&measures/timezones";

new FixedInterval(TIME.HOUR * 1, 0, false, quotaInterval);

export async function quotaInterval() {
  const req = new Request("https://api.github.com/rate_limit", {
    method: "GET",
    headers: { Authorization: process.env.GITHUB_API_TOKEN }
  });

  const quotas = await (await fetch(req)).json() as QuotaResponse;

  for (const key of Object.keys(quotas.resources)) {
    const quotaString = buildQuotaString(key, quotas.resources[key]);
    if (!quotaString) continue;
    console.log(quotaString);
  }
}

function buildQuotaString(resource: string, quota: QuotaStruct) {
  if (!quota.used) return;

  const date = new Date(quota.reset * TIME.SECOND);
  return `"${resource}" has ${quota.remaining} requests left on quota, resetting at ${date.toLocaleString()}`;
}

type QuotaResponse = { resources: Record<string, QuotaStruct>; rate: QuotaStruct };

interface QuotaStruct {
  limit: number;
  used: number;
  remaining: number;
  reset: number; // {instant} / 1000
}
