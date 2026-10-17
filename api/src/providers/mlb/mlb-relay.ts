// Sends every MLB Stats API request through a relay when one is configured.
//
// MLB refuses requests from DigitalOcean's addresses (406 from its origin,
// Oct 2026), so production relays them through a Cloudflare Worker
// (relay/mlb-relay-worker.js). Dozens of call sites name statsapi.mlb.com
// directly, so this rewrites at fetch() rather than at each of them.
//
//   MLB_RELAY_URL  the Worker's origin, e.g. https://scorebook-mlb.example.workers.dev
//   MLB_RELAY_KEY  the Worker's RELAY_KEY secret
//
// With either unset, fetch is left alone.
const MLB_ORIGIN = 'https://statsapi.mlb.com';

export function installMlbRelay(): void {
  const relay = process.env.MLB_RELAY_URL?.replace(/\/+$/, '');
  const key = process.env.MLB_RELAY_KEY;
  if (!relay || !key) return;

  const fetchDirect = globalThis.fetch;
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(MLB_ORIGIN + '/')) return fetchDirect(input, init);

    const relayed = relay + url.slice(MLB_ORIGIN.length);
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    headers.set('x-relay-key', key);
    return fetchDirect(relayed, { ...init, headers });
  };
}
