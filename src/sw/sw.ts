/// <reference lib="webworker" />
/**
 * Service worker built with Serwist. The precache manifest is injected at
 * build time (scripts/build-sw.mjs). Updates wait for the user to confirm
 * (the UI shows an "Update now" banner) so a game session is never reloaded
 * underneath the player.
 */
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist, StaleWhileRevalidate, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
  const __APP_VERSION__: string;
  const __BASE_PATH__: string;
}

declare const self: ServiceWorkerGlobalScope;

const basePath = typeof __BASE_PATH__ === "string" ? __BASE_PATH__ : "";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
  precacheOptions: { cleanupOutdatedCaches: true, ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/] },
  runtimeCaching: [
    {
      // Next.js hashed assets not in the precache (e.g. lazily loaded chunks)
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes("/_next/static/"),
      handler: new CacheFirst({ cacheName: "st-static", plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 })] }),
    },
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname),
      handler: new CacheFirst({ cacheName: "st-images", plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 })] }),
    },
    {
      // Third-party ad images: best effort, small bounded cache, never required for play.
      matcher: ({ url, sameOrigin, request }) => !sameOrigin && request.destination === "image" && (url.protocol === "https:" || url.protocol === "http:"),
      handler: new StaleWhileRevalidate({ cacheName: "st-ad-images", plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7, purgeOnQuotaError: true })] }),
    },
    {
      matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
      handler: new NetworkFirst({ cacheName: "st-pages", networkTimeoutSeconds: 3, plugins: [new ExpirationPlugin({ maxEntries: 20 })] }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: `${basePath}/`,
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") void self.skipWaiting();
  if (event.data && event.data.type === "GET_VERSION") event.source?.postMessage({ type: "VERSION", version: __APP_VERSION__ });
});

serwist.addEventListeners();
