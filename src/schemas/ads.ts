import { z } from "zod";

/** Explicit allowlist of placements the game knows how to render. */
export const AD_PLACEMENTS = [
  "hud_banner",
  "phone_feed",
  "computer_screen",
  "billboard",
  "directory_listing",
  "loading_screen",
  "management_banner",
] as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export const AD_PLACEMENT_LABELS: Record<AdPlacement, string> = {
  hud_banner: "Main HUD banner",
  phone_feed: "Phone feed sponsored post",
  computer_screen: "Computer screen advertisement",
  billboard: "In-world billboard",
  directory_listing: "Business directory sponsored listing",
  loading_screen: "Loading screen sponsorship",
  management_banner: "Management screen banner",
};

export const AD_PLACEMENT_SIZES: Record<AdPlacement, { width: number; height: number; note: string }> = {
  hud_banner: { width: 728, height: 90, note: "Wide banner; scales down on mobile (320×50)." },
  phone_feed: { width: 600, height: 400, note: "Square-ish card image inside the phone feed." },
  computer_screen: { width: 640, height: 360, note: "16:9 image shown on the in-game computer screen." },
  billboard: { width: 256, height: 128, note: "2:1 image on the in-world billboard (pixel-scaled)." },
  directory_listing: { width: 128, height: 128, note: "Square logo in the business directory." },
  loading_screen: { width: 800, height: 450, note: "16:9 image on the loading screen." },
  management_banner: { width: 468, height: 60, note: "Compact banner at the bottom of management screens." },
};

const DISTRICT_IDS = ["mainland", "computerVillage", "yaba", "surulere", "ikeja", "lekki", "vi", "island"] as const;

/** Only http(s) URLs are allowed, never javascript:, data:text/html, etc. */
export const safeHttpUrl = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(2048)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "Must be a valid http(s) URL");

/**
 * Image sources may be http(s) URLs, relative paths under the deployed site
 * (e.g. "/ads/campaign.png") or data:image/* URIs produced by the local
 * uploader. SVG data URIs are rejected because they can carry scripts.
 */
export const safeImageSrc = z
  .string()
  .trim()
  .max(2_500_000)
  .refine((v) => {
    if (v === "") return true;
    if (v.startsWith("/") && !v.startsWith("//")) return !/[<>"'`]/.test(v);
    if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=]+$/i.test(v)) return true;
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "Image must be an http(s) URL, a site-relative path or a PNG/JPEG/GIF/WebP data URI");

const plainText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((v) => !/<\s*\/?\s*[a-z]/i.test(v), "HTML tags are not allowed in ad text");

export const adCampaignSchema = z.object({
  id: z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, - and _"),
  advertiserName: plainText(80).refine((v) => v.length > 0, "Advertiser name is required"),
  campaignName: plainText(120).refine((v) => v.length > 0, "Campaign name is required"),
  headline: plainText(90).refine((v) => v.length > 0, "Headline is required"),
  description: plainText(240).default(""),
  imageUrl: safeImageSrc.default(""),
  clickUrl: safeHttpUrl,
  placement: z.enum(AD_PLACEMENTS),
  startAt: z.string().datetime({ offset: true }).nullable().default(null),
  endAt: z.string().datetime({ offset: true }).nullable().default(null),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(1).max(100).default(50),
  districts: z.array(z.enum(DISTRICT_IDS)).default([]),
  devices: z.array(z.enum(["desktop", "mobile"])).default([]),
  /** maximum impressions per viewer per day (0 = unlimited). */
  frequencyCapPerDay: z.number().int().min(0).max(1000).default(0),
  label: plainText(60).default(""),
  notes: plainText(1000).default(""),
  ctaText: plainText(24).default("Learn more"),
});

export type AdCampaign = z.infer<typeof adCampaignSchema>;
export type AdCampaignInput = z.input<typeof adCampaignSchema>;

export const adManifestSchema = z.object({
  schemaVersion: z.literal(1),
  updatedAt: z.string().datetime({ offset: true }),
  campaigns: z.array(adCampaignSchema).max(500),
});

export type AdManifest = z.infer<typeof adManifestSchema>;

export function parseAdManifest(input: unknown): { ok: true; manifest: AdManifest } | { ok: false; error: string } {
  const result = adManifestSchema.safeParse(input);
  if (result.success) {
    const ids = new Set<string>();
    for (const c of result.data.campaigns) {
      if (ids.has(c.id)) return { ok: false, error: `Duplicate campaign id "${c.id}"` };
      ids.add(c.id);
    }
    return { ok: true, manifest: result.data };
  }
  const issue = result.error.issues[0];
  return { ok: false, error: issue ? `${issue.path.join(".") || "manifest"}: ${issue.message}` : "Invalid manifest" };
}
