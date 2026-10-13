# Building and deploying

Street Tycoon is a static site. `npm run build` runs `next build` with `output: "export"` and then `scripts/build-sw.mjs`, which bundles `src/sw/sw.ts` with esbuild and injects the precache manifest of `out/` using `@serwist/build`. The result is `out/`:

```
out/
  index.html            the game
  admin/ads/index.html  the ad dashboard
  _next/static/…        hashed JS/CSS chunks (Phaser is a lazily loaded chunk)
  sw.js                 service worker with the precache manifest
  manifest.webmanifest, icons/, ads/, favicon.png
```

## Hosting

Upload `out/` to any static host (Netlify, Vercel static, Cloudflare Pages, GitHub Pages, S3+CloudFront, nginx). Requirements:

- Serve over **HTTPS** (service workers and install prompts require it; `localhost` is exempt).
- `sw.js` must be served from the site root (or the base path) with `Cache-Control: no-cache` so updates are detected; the `Service-Worker-Allowed` header is only needed if you move it out of the scope.
- Directory index: `/admin/ads/` → `admin/ads/index.html` (the build uses `trailingSlash: true`). Optionally map 404s to `404.html`.
- Headers are optional but recommended: `Content-Type: application/manifest+json` for the manifest.

`npm start` runs `scripts/serve-static.mjs`, a dependency-free server that mimics these rules locally on http://127.0.0.1:4173.

## Sub-path deployments (e.g. GitHub Pages)

Set `NEXT_PUBLIC_BASE_PATH=/repo-name` at build time:

```bash
NEXT_PUBLIC_BASE_PATH=/street-tycoon npm run build
```

`next.config.ts` applies `basePath`/`assetPrefix`, the service worker is injected with the prefixed URLs and registered at `/<base>/sw.js` with scope `/<base>/`, ad image paths and icon links are prefixed, and `serve-static.mjs` honours the same variable for local verification. Update `start_url`, `scope`, `id` and icon `src` in `public/manifest.webmanifest` to include the base path when deploying under one.

## Release checklist

1. `npm run typecheck && npm run lint && npm test`
2. `npm run build && npm run test:e2e`
3. Bump `version` in `package.json` (it is embedded as `NEXT_PUBLIC_APP_VERSION` and shown in Settings and the menu). Any change to the precached files already produces a new service-worker revision; players see an *Update now* banner on their next visit and the update applies only when they accept it.
4. Deploy `out/`.

## Environment

No environment variables are required. The only optional one is `NEXT_PUBLIC_BASE_PATH`. There are no secrets anywhere in the client bundle.
