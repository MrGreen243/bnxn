import { describe, expect, it } from "vitest";
import { adCampaignSchema, parseAdManifest, type AdManifest } from "@/schemas/ads";
import { DEFAULT_AD_MANIFEST } from "@/data/ads/defaultManifest";
import { eligibleCampaigns, selectCampaign } from "@/ads/adService";

const base = { id: "c1", advertiserName: "Acme", campaignName: "Launch", headline: "Hello", clickUrl: "https://example.com", placement: "hud_banner" as const };
const NOW = Date.parse("2026-06-01T12:00:00Z");

function manifest(campaigns: unknown[]): AdManifest {
  const r = parseAdManifest({ schemaVersion: 1, updatedAt: "2026-01-01T00:00:00.000Z", campaigns });
  if (!r.ok) throw new Error(r.error);
  return r.manifest;
}

describe("advertising", () => {
  it("rejects invalid and unsafe URLs", () => {
    expect(adCampaignSchema.safeParse({ ...base, clickUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(adCampaignSchema.safeParse({ ...base, clickUrl: "not a url" }).success).toBe(false);
    expect(adCampaignSchema.safeParse({ ...base, clickUrl: "ftp://example.com" }).success).toBe(false);
    expect(adCampaignSchema.safeParse({ ...base, clickUrl: "https://example.com/path?x=1" }).success).toBe(true);
    expect(adCampaignSchema.safeParse({ ...base, imageUrl: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" }).success).toBe(false);
    expect(adCampaignSchema.safeParse({ ...base, imageUrl: "data:image/png;base64,iVBORw0KGgo=" }).success).toBe(true);
    expect(adCampaignSchema.safeParse({ ...base, imageUrl: "/ads/demo-hud.png" }).success).toBe(true);
    expect(adCampaignSchema.safeParse({ ...base, imageUrl: "//evil.example/x.png" }).success).toBe(false);
  });

  it("user-supplied ad content cannot carry HTML or scripts", () => {
    expect(adCampaignSchema.safeParse({ ...base, headline: "<script>alert(1)</script>" }).success).toBe(false);
    expect(adCampaignSchema.safeParse({ ...base, description: "Buy now <img src=x onerror=alert(1)>" }).success).toBe(false);
    expect(adCampaignSchema.safeParse({ ...base, placement: "sidebar_hijack" }).success).toBe(false);
    const ok = adCampaignSchema.safeParse({ ...base, headline: "Prices < 2 for everyone & more" });
    expect(ok.success).toBe(true);
  });

  it("disabled campaigns never render", () => {
    const m = manifest([{ ...base, enabled: false }]);
    expect(selectCampaign("hud_banner", { device: "desktop", now: NOW }, m)).toBeNull();
  });

  it("scheduled campaigns obey their dates", () => {
    const m = manifest([
      { ...base, id: "future", startAt: "2026-07-01T00:00:00Z" },
      { ...base, id: "past", endAt: "2026-05-01T00:00:00Z" },
      { ...base, id: "live", startAt: "2026-05-01T00:00:00Z", endAt: "2026-07-01T00:00:00Z" },
    ]);
    expect(eligibleCampaigns("hud_banner", { device: "desktop", now: NOW }, m).map((c) => c.id)).toEqual(["live"]);
  });

  it("selects the correct placement, honours priority, targeting and rotation", () => {
    const m = manifest([
      { ...base, id: "a", placement: "phone_feed", priority: 10 },
      { ...base, id: "b", placement: "phone_feed", priority: 90 },
      { ...base, id: "c", placement: "phone_feed", priority: 90 },
      { ...base, id: "d", placement: "billboard", districts: ["lekki"] },
      { ...base, id: "e", placement: "billboard", devices: ["mobile"] },
    ]);
    const first = selectCampaign("phone_feed", { device: "desktop", now: NOW }, m)!;
    const second = selectCampaign("phone_feed", { device: "desktop", now: NOW }, m)!;
    expect([first.id, second.id].sort()).toEqual(["b", "c"]);
    expect(selectCampaign("hud_banner", { device: "desktop", now: NOW }, m)).toBeNull();
    expect(eligibleCampaigns("billboard", { districtId: "mainland", device: "desktop", now: NOW }, m).map((c) => c.id)).toEqual([]);
    expect(eligibleCampaigns("billboard", { districtId: "lekki", device: "mobile", now: NOW }, m).map((c) => c.id).sort()).toEqual(["d", "e"]);
  });

  it("manifest import/export round trips and rejects duplicates", () => {
    const parsed = parseAdManifest(DEFAULT_AD_MANIFEST);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const again = parseAdManifest(JSON.parse(JSON.stringify(parsed.manifest)));
    expect(again.ok && again.manifest).toEqual(parsed.manifest);
    expect(parseAdManifest({ schemaVersion: 1, updatedAt: "2026-01-01T00:00:00.000Z", campaigns: [base, base] }).ok).toBe(false);
    expect(parseAdManifest({ schemaVersion: 2, updatedAt: "x", campaigns: [] }).ok).toBe(false);
  });
});
