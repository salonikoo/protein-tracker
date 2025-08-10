# Protein Tracker (Hebrew) — Netlify Ready

## Deploy with Netlify (from GitHub)
1. Create a repo on GitHub (any name).
2. Push these files to the repo.
3. In Netlify → Add new site → Import from Git → choose this repo.
4. Build command: `npm run build`
5. Publish directory: `dist`
6. (Optional) Set environment variable: `NODE_VERSION = 20`

> No need to change `vite.config.js` for Netlify. It is set to `base: '/'`.

## SPA routing
- Already included: `_redirects` and `netlify.toml` with `/* -> /index.html` (200).

## Local run (optional)
```bash
npm i
npm run dev
```
