# Advertising: placements, manifest and publishing workflow

Street Tycoon renders manually managed sponsor banners from a **validated JSON manifest**. No ad network is integrated and no backend exists; campaigns are data in the frontend bundle.

## Placements (allowlist in `src/schemas/ads.ts`)

| id | Where | Recommended image |
| --- | --- | --- |
| `hud_banner` | bottom of the desktop sidebar / reserved strip above the mobile bottom nav | 728×90 |
| `phone_feed` | phone home screen and inside the social feed | 600×400 |
| `computer_screen` | tech shops (Computer Village, Apex Tech) and the cybercafé shop | 640×360 |
| `billboard` | in-world billboard prop in every district (drawn by Phaser) | 256×128 |
| `directory_listing` | Businesses → Directory tab | 128×128 |
| `loading_screen` | boot screen and main menu | 800×450 |
| `management_banner` | footer of HK/crew/business/stats screens | 468×60 |

Every ad is labelled *Sponsored*, uses reserved layout space (never over controls), opens in a new tab with `noopener`, never renders HTML/scripts (text fields reject tags; image sources must be http(s), site-relative or PNG/JPEG/GIF/WebP data URIs — SVG is rejected), and the whole system can be turned off by the player in *Settings → Show promotional placements*. The game is fully playable with an empty manifest: every placement has fallback text.

## Manifest schema (`AdManifest`)

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-10-01T00:00:00.000Z",
  "campaigns": [{
    "id": "my-campaign", "advertiserName": "…", "campaignName": "…",
    "headline": "…", "description": "…", "imageUrl": "/ads/my-banner.png", "clickUrl": "https://…",
    "placement": "hud_banner", "startAt": null, "endAt": null, "enabled": true, "priority": 50,
    "districts": [], "devices": [], "frequencyCapPerDay": 0, "label": "", "notes": "", "ctaText": "Learn more"
  }]
}
```

Selection: enabled → placement matches → inside `startAt`/`endAt` → district/device targeting → under the per-day frequency cap (local) → highest `priority` wins, ties rotate round-robin. Impressions and clicks are counted **locally per device** in IndexedDB; they are not global analytics.

## Dashboard (`/admin/ads/`)

Client-side editor with: campaign list with status/placement filters, create/edit/delete (confirmation required), enable/disable, image upload (stored as a data URL in this browser, ≤400 KB) or path/URL, schedule, targeting, priority, frequency cap, destination-URL validation, per-placement previews rendered by the real `AdSlot` component, local impression/click counts, export validated JSON, import a manifest (replaces local config after confirmation), reset to the bundled default.

**It is not a secure CMS.** There is no login, no password and no server; the dashboard only edits the manifest stored in that browser's IndexedDB. Do not put secrets in it or in the repository.

## Publishing a campaign to all players

1. Build the campaign in the dashboard and check every preview.
2. Put approved images in `public/ads/` (reference as `/ads/name.png`) rather than data URLs.
3. Click **Export JSON**, review the file, and paste its contents into `src/data/ads/defaultManifest.ts` (`DEFAULT_AD_MANIFEST`). Keep `schemaVersion: 1` and bump `updatedAt`.
4. `npm test` (the ads suite validates the default manifest) → `npm run build` → deploy (`docs/DEPLOY.md`).
5. Players receive the new manifest with the next app update. A device with a local override keeps its override until *Reset to default* is used.

## What would need a backend (intentionally not implemented)

Shared/global campaign changes without redeploying, authenticated multi-user administration, central impression/click analytics, remote image hosting/CDN management, real-time advertiser self-service, or any ad network integration.
