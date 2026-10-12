"use client";
import * as React from "react";
import { ExternalLink } from "lucide-react";
import { getAdManifest, loadAds, openAdLink, recordImpression, resolveImageUrl, selectCampaign, subscribeAds } from "@/ads/adService";
import { AD_PLACEMENT_SIZES, type AdCampaign, type AdPlacement } from "@/schemas/ads";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { cx } from "@/components/ui";

const FALLBACK: Record<AdPlacement, string> = {
  hud_banner: "Your business could be on this banner.",
  phone_feed: "Sponsored posts appear here.",
  computer_screen: "Advertise on the in-game computer screen.",
  billboard: "Advertise here.",
  directory_listing: "Sponsored listing available.",
  loading_screen: "Sponsor the loading screen.",
  management_banner: "Promote your business to tycoons.",
};

/** Renders one ad placement. Never covers controls: callers reserve the space. */
export function AdSlot({ placement, className, compact = false, campaignOverride, preview = false }: { placement: AdPlacement; className?: string; compact?: boolean; campaignOverride?: AdCampaign | null; preview?: boolean }) {
  const adsEnabled = useGameStore((s) => s.game?.settings.adsEnabled ?? true);
  const districtId = useGameStore((s) => s.game?.player.districtId);
  const isMobile = useUiStore((s) => s.isMobile);
  const [picked, setPicked] = React.useState<AdCampaign | null>(null);
  const [imgFailed, setImgFailed] = React.useState(false);
  const recorded = React.useRef<string | null>(null);
  const campaign = campaignOverride !== undefined ? campaignOverride : picked;

  React.useEffect(() => {
    if (campaignOverride !== undefined) return;
    let active = true;
    const pick = () => {
      if (!active) return;
      const c = selectCampaign(placement, { districtId, device: isMobile ? "mobile" : "desktop", now: Date.now() }, getAdManifest());
      setPicked(c);
      setImgFailed(false);
    };
    void loadAds().then(pick);
    const unsub = subscribeAds(pick);
    const timer = window.setInterval(pick, 60_000);
    return () => {
      active = false;
      unsub();
      window.clearInterval(timer);
    };
  }, [placement, districtId, isMobile, campaignOverride]);

  React.useEffect(() => {
    if (campaign && !preview && recorded.current !== campaign.id) {
      recorded.current = campaign.id;
      recordImpression(campaign.id);
    }
  }, [campaign, preview]);

  if (!adsEnabled && !preview) return null;
  const size = AD_PLACEMENT_SIZES[placement];
  const horizontal = placement === "hud_banner" || placement === "management_banner";
  const square = placement === "directory_listing";
  const img = campaign ? resolveImageUrl(campaign.imageUrl) : "";

  const body = campaign ? (
    <button
      type="button"
      onClick={() => (preview ? undefined : openAdLink(campaign))}
      className={cx("group flex w-full items-stretch gap-2 overflow-hidden rounded-md border border-ink-600 bg-ink-900 text-left transition-colors hover:border-gold-400/60", horizontal ? "h-14" : square ? "aspect-square flex-col" : "flex-col")}
      aria-label={`Sponsored: ${campaign.headline} by ${campaign.advertiserName}. Opens ${campaign.clickUrl} in a new tab.`}
      data-testid={`ad-${placement}`}
    >
      {img && !imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" className={cx("object-cover", horizontal ? "h-full w-24 shrink-0" : square ? "h-full w-full" : "aspect-video w-full")} onError={() => setImgFailed(true)} loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <div className={cx("flex items-center justify-center bg-[linear-gradient(135deg,#222837,#11141c)] text-gold-400", horizontal ? "w-24 shrink-0" : square ? "h-full w-full" : "aspect-video w-full")}>
          <span className="font-pixel text-lg font-bold">{campaign.advertiserName.slice(0, 2).toUpperCase()}</span>
        </div>
      )}
      {!square && (
        <div className={cx("flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-2", horizontal ? "py-1" : "pb-2 pt-1")}>
          <div className="truncate text-xs font-semibold text-ink-100">{campaign.headline}</div>
          {!compact && campaign.description && <div className="line-clamp-2 text-[11px] text-ink-300">{campaign.description}</div>}
          <div className="flex items-center gap-1 text-[10px] text-gold-300">
            {campaign.ctaText} <ExternalLink size={10} />
          </div>
        </div>
      )}
    </button>
  ) : (
    <div className={cx("flex items-center justify-center rounded-md border border-dashed border-ink-700 bg-ink-900/60 text-[11px] text-ink-500", horizontal ? "h-14" : square ? "aspect-square" : "min-h-16 py-3")} data-testid={`ad-${placement}-empty`}>
      {FALLBACK[placement]}
    </div>
  );

  return (
    <div className={cx("relative", className)} style={preview ? { maxWidth: size.width } : undefined}>
      <span className="absolute right-1 top-1 z-10 rounded bg-ink-950/80 px-1 text-[9px] font-semibold uppercase tracking-wide text-ink-300">Sponsored</span>
      {body}
    </div>
  );
}
