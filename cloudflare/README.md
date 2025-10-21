Cloudflare R2 uploads for M Share

This folder contains a tiny Cloudflare Worker you can deploy to accept PDF uploads from the site and store them in an R2 bucket.

What you get
- POST /upload?name=<key> — saves body as application/pdf to your R2 bucket binding
- Optional bearer protection via AUTH_TOKEN env var
- Optional PUBLIC_BASE env var to emit a public link to your asset (e.g., https://pub.example.com)

Setup (approx. 5 minutes)
1) R2 bucket
   - In Cloudflare Dashboard → R2 → Create bucket named mshare-profiles
2) Worker
   - Create a Worker (e.g., mshare-upload) and paste worker-r2-upload.js
   - Bind R2: Settings → Bindings → R2 Bucket → Variable name: MSHARE → Bucket: mshare-profiles
   - Env vars (optional): AUTH_TOKEN=<long-random>, PUBLIC_BASE=https://<your-public-bucket-domain>
   - Routes: attach a route (e.g., https://upload.<your-domain>/upload) or use workers.dev
3) Test
   - Open: GET https://<your-worker>/upload?ping=1 should return { ok: true }
   - Try a curl POST with a small PDF

Use from the site
- Open storage.html (admin only). Paste your Worker endpoint URL (including /upload path) and token.
- Pick a file or click “Generate profile PDF and upload”. The page will POST to the worker and copy any returned link.

Security notes
- Keep AUTH_TOKEN secret. The site stores the token only in localStorage on the current device.
- You can enhance the Worker to set ACLs, signed URLs, or validate key prefixes.

Troubleshooting
- 401 Unauthorized: ensure AUTH_TOKEN matches exactly and header is Authorization: Bearer <token>
- 415/400: only PDFs are accepted by this example worker
- 500 Upload failed: check Worker logs and R2 binding name (MSHARE)
