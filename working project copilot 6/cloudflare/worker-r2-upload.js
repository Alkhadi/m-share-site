// Cloudflare Worker: simple R2 upload endpoint for PDFs
// Setup steps:
// 1) In Cloudflare Dashboard, create an R2 bucket (e.g., mshare-profiles)
// 2) Create a Worker and bind R2 as env.MSHARE (KV R2 binding), route the Worker to a hostname or workers.dev
// 3) Optionally set an environment variable AUTH_TOKEN to a long random string and send it as Bearer from the client
// 4) Deploy. Test with GET ?ping=1

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const origin = request.headers.get('origin') || '*';
        const baseHeaders = { 'content-type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' };
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' } });
        }
        if (url.searchParams.get('ping')) {
            return new Response(JSON.stringify({ ok: true, pong: Date.now() }), { headers: baseHeaders });
        }

        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405, headers: { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } });
        }

        // Optional bearer token auth
        const auth = request.headers.get('authorization');
        const expected = env.AUTH_TOKEN || '';
        if (expected) {
            if (!auth || !auth.toLowerCase().startsWith('bearer ') || auth.slice(7) !== expected) {
                return new Response('Unauthorized', { status: 401, headers: { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } });
            }
        }

        const name = url.searchParams.get('name') || `uploads/${Date.now()}.pdf`;
        const type = request.headers.get('content-type') || 'application/octet-stream';
        if (!/pdf|octet\-stream/i.test(type)) {
            return new Response('Only PDF uploads are allowed', { status: 400 });
        }

        try {
            const body = await request.arrayBuffer();
            const object = await env.MSHARE.put(name, body, { httpMetadata: { contentType: 'application/pdf' } });
            const publicBase = env.PUBLIC_BASE || '';
            const urlOut = publicBase ? `${publicBase.replace(/\/$/, '')}/${name}` : '';
            return new Response(JSON.stringify({ ok: true, key: name, url: urlOut, etag: object.httpEtag }), { headers: baseHeaders });
        } catch (err) {
            return new Response('Upload failed: ' + (err.message || String(err)), { status: 500, headers: { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } });
        }
    }
}
