import type { NextConfig } from "next";

/**
 * STREET TYCOON is a fully client-side game. The app is statically exported
 * (`out/`) and can be hosted on any static file host.
 *
 * Set NEXT_PUBLIC_BASE_PATH (e.g. "/street-tycoon") when deploying under a
 * sub-path such as GitHub Pages. The service worker, manifest and asset URLs
 * all respect it.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || "";
/** Optional: serve hashed chunks from a different prefix (hosts that reserve "_" paths). */
const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX?.replace(/\/$/, "") || basePath || undefined;

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  assetPrefix,
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? "0.1.0",
  },
};

export default nextConfig;
