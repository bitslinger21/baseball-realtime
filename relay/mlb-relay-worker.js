// Cloudflare Worker: relays the Scorebook API's MLB Stats API requests.
//
// MLB refuses requests from DigitalOcean's addresses (406 from its origin,
// Oct 2026), so production sends them here instead (see
// api/src/providers/mlb/mlb-relay.ts). Forwards GET /api/... to
// statsapi.mlb.com only, and only with the shared key — not an open proxy.
//
// Setup: Cloudflare dashboard → Workers & Pages → Create → Worker, paste this
// file, deploy. Then Settings → Variables and Secrets → add a Secret named
// RELAY_KEY (a long random string; the API's MLB_RELAY_KEY must match).

const UPSTREAM = 'https://statsapi.mlb.com';

export default {
  async fetch(request, env) {
    if (!env.RELAY_KEY || request.headers.get('x-relay-key') !== env.RELAY_KEY) {
      return new Response('forbidden', { status: 403 });
    }
    if (request.method !== 'GET') {
      return new Response('method not allowed', { status: 405 });
    }
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return new Response('not found', { status: 404 });
    }

    const upstream = await fetch(UPSTREAM + url.pathname + url.search, {
      headers: { accept: 'application/json' },
    });
    // Pass MLB's answer through as-is (status, body, content type).
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
        'x-relay-upstream-cache': upstream.headers.get('x-cache') ?? '',
      },
    });
  },
};
