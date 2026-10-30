import React, { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { shouldShowAsPin } from "@/components/map/ClusterGroup";
import { isDevBypassUser } from "@/lib/createListingHelpers";

export default function MapTierDebugBox({ zoom, showListingsActive, user }) {
  const [hidden, setHidden] = useState(false);
  const visibleTier = useMemo(() => {
    if (shouldShowAsPin(zoom, { listingType: "yard_sale", tier: "free" })) return "Free";
    if (shouldShowAsPin(zoom, { listingType: "yard_sale", tier: "featured" })) return "Featured";
    if (shouldShowAsPin(zoom, { listingType: "yard_sale", tier: "premium" })) return "Premium";
    return "None";
  }, [zoom]);
  if (!isDevBypassUser(user)) return null;

  return (
    <aside aria-label="Map zoom and tier" className="absolute bottom-8 right-3 z-[1000]">
      {hidden ? (
        <button type="button" onClick={() => setHidden(false)} aria-label="Show zoom and tier window" aria-expanded={false}
          className="flex min-h-9 items-center gap-2 rounded-lg border border-border bg-popover/95 px-3 text-xs font-medium text-popover-foreground shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Zoom & tier
        </button>
      ) : (
        <div className="w-36 rounded-lg border border-border bg-popover/95 text-popover-foreground shadow-md backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border/50 pl-3 pr-1">
            <span className="text-xs font-semibold">Zoom & tier</span>
            <button type="button" onClick={() => setHidden(true)} aria-label="Hide zoom and tier window" title="Hide window"
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <dl className="space-y-1 px-3 py-2 text-xs" aria-live="polite" aria-atomic="true">
            <div className="flex items-center justify-between gap-2"><dt className="text-muted-foreground">Zoom</dt><dd className="font-mono font-semibold tabular-nums">{Number.isFinite(zoom) ? Number(zoom.toFixed(2)) : "—"}</dd></div>
            <div className="flex items-center justify-between gap-2"><dt className="text-muted-foreground">Tier</dt><dd className="font-semibold" title="Lowest yard-sale tier visible at this zoom; higher tiers also remain visible.">{visibleTier}</dd></div>
          </dl>
          {showListingsActive && <p className="px-3 pb-2 text-[10px] text-muted-foreground">All tiers temporarily shown</p>}
        </div>
      )}
    </aside>
  );
}