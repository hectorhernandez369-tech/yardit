import { formatListingScheduleText } from "@/components/listing/listingDisplay.jsx";

// Board dimensions — single source of truth
export const MARQUEE_BOARD_WIDTH = 190;
export const MARQUEE_BOARD_COLLAPSED_WIDTH = 160;

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

const formatSlotTime = (slot) => {
  try {
    if (!slot) return "TBD";
    const start = slot.start_time ? new Date(slot.start_time) : null;
    const end = slot.end_time ? new Date(slot.end_time) : null;
    if (!start || Number.isNaN(start.getTime())) return "TBD";
    const startText = start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (!end || Number.isNaN(end.getTime())) return startText;
    return `${startText} – ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  } catch {
    return "TBD";
  }
};

const formatEventDate = (listing) => {
  try {
    return formatListingScheduleText(listing);
  } catch {
    return "";
  }
};

// Bulb: soft premium glow, slow alternating pulse
const B = "width:5px;height:5px;border-radius:50%;background:radial-gradient(circle at 38% 38%, rgba(255,251,224,0.98) 0%, rgba(255,226,130,0.96) 40%, rgba(255,201,74,0.92) 70%, rgba(245,158,11,0.86) 100%);box-shadow:0 0 4px rgba(255,224,130,0.34),0 0 8px rgba(255,196,77,0.18),0 0 12px rgba(245,158,11,0.08);position:absolute;z-index:10;will-change:opacity,transform,box-shadow;animation:marqueePulse 2.6s ease-in-out infinite;";
const B_ALT = `${B}animation-delay:1.3s;`;

function getMarqueeLightStyles() {
  return `<style>@keyframes marqueePulse{0%,100%{opacity:.48;transform:scale(.97);box-shadow:0 0 4px rgba(255,224,130,0.26),0 0 8px rgba(255,196,77,0.14),0 0 12px rgba(245,158,11,0.06)}50%{opacity:.98;transform:scale(1.08);box-shadow:0 0 6px rgba(255,224,130,0.4),0 0 10px rgba(255,196,77,0.2),0 0 16px rgba(245,158,11,0.08)}}</style>`;
}

// Generate bulbs inside the card (card must have overflow:visible, position:relative)
// Bulbs are centered ON the border edge via negative offsets
function bulbFrame(w, h, options = {}) {
  const parts = [];
  const off = -2.5;
  const bulbRadius = 2.5;
  const horizontalInset = options.horizontalInset ?? 8;
  const sideTopInset = options.sideTopInset ?? 10;
  const sideBottomInset = options.sideBottomInset ?? 10;
  const horizontalDensity = options.horizontalDensity ?? 15;
  let index = 0;

  const getHorizontalCount = (length) => {
    const usable = Math.max(length - horizontalInset * 2, 0);
    return Math.max(2, Math.round(usable / horizontalDensity) + 1);
  };

  const distributeWithCorners = (length, count, inset) => {
    const usable = Math.max(length - inset * 2, 0);
    if (count <= 1) return [inset + usable / 2];
    const gap = usable / (count - 1);
    return Array.from({ length: count }, (_, i) => inset + gap * i);
  };

  const distributeSides = (length, count, topInset, bottomInset) => {
    const usable = Math.max(length - topInset - bottomInset, 0);
    if (count <= 0) return [];
    if (count === 1) return [topInset + usable / 2];
    const gap = usable / (count - 1);
    return Array.from({ length: count }, (_, i) => topInset + gap * i);
  };

  const horizontalCount = getHorizontalCount(w);
  const sideCount = options.sideCount ?? 2;
  const horizontalPositions = distributeWithCorners(w, horizontalCount, horizontalInset);
  const sidePositions = distributeSides(h, sideCount, sideTopInset, sideBottomInset);

  horizontalPositions.forEach((x) => {
    const bulbStyleTop = index % 2 === 0 ? B : B_ALT;
    parts.push(`<div style="${bulbStyleTop}top:${off}px;left:${(x - bulbRadius).toFixed(1)}px;"></div>`);
    index += 1;
    const bulbStyleBottom = index % 2 === 0 ? B : B_ALT;
    parts.push(`<div style="${bulbStyleBottom}bottom:${off}px;left:${(x - bulbRadius).toFixed(1)}px;"></div>`);
    index += 1;
  });

  sidePositions.forEach((y) => {
    const bulbStyleLeft = index % 2 === 0 ? B_ALT : B;
    parts.push(`<div style="${bulbStyleLeft}left:${off}px;top:${(y - bulbRadius).toFixed(1)}px;"></div>`);
    index += 1;
    const bulbStyleRight = index % 2 === 0 ? B_ALT : B;
    parts.push(`<div style="${bulbStyleRight}right:${off}px;top:${(y - bulbRadius).toFixed(1)}px;"></div>`);
    index += 1;
  });

  return parts.join("");
}

// Shared wrapper: 0-height outer div so iconAnchor [w/2, 0] = tail tip = coordinate
function wrapBoard(w, tailH, cardHtml) {
  return `
    <div style="position:relative;width:${w}px;height:0;pointer-events:none;">
      ${getMarqueeLightStyles()}
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);height:0;width:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:${tailH}px solid #3f1d0b;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.18));"></div>
      ${cardHtml}
    </div>
  `;
}

// COLLAPSED: compact theater-style card — title + date + expand button + border lights
// Locked footprint: 160px width, ~52px height
export function getMarqueeBoardCollapsedHtml(listing, options = {}) {
  if (!listing) return "";
  const title = listing?.event_name || listing?.title || "Event";
  const dateStr = formatEventDate(listing);

  const derivedIsComingSoon =
    options?.isComingSoon === true ||
    listing?.mapState === "coming_soon" ||
    (!!listing?.startDateTime && new Date(listing.startDateTime) > new Date());

  const derivedIsActive =
    !derivedIsComingSoon &&
    (options?.isActive === true || listing?.mapState === "active");

  const stateLabel = derivedIsComingSoon
    ? "COMING SOON"
    : derivedIsActive
      ? "ACTIVE"
      : "EVENT";

  const infoText = derivedIsComingSoon
    ? `Active: ${escapeHtml(options?.goLiveLabel || dateStr || "")}`
    : escapeHtml(dateStr || listing?.event_description || listing?.description || "");
  const detailText = infoText;
  const w = 165;
  const h = 66;
  const tailH = 6;
  const bgUrl = listing?.marquee_background_url;
  const bgStyle = bgUrl
    ? `background:linear-gradient(rgba(0,0,0,0.65),rgba(0,0,0,0.65)),url('${bgUrl}');background-size:cover;background-position:center;`
    : `background:linear-gradient(to bottom,#7c2d12,#3f1d0b);`;

  const overlappedCount = options?.overlappedCount || 0;
  const overlapBubble = overlappedCount > 0 ? `
    <div data-marquee-overlap="true" style="position:absolute;top:-10px;right:-10px;background:#ef4444;color:#fff;border-radius:999px;padding:2px 6px;font-size:10px;font-weight:900;box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:pointer;z-index:20;border:2px solid #fff;line-height:1.2;">
      +${overlappedCount}
    </div>
  ` : "";

  const card = `
    <div style="position:absolute;bottom:${tailH}px;left:0;width:${w}px;height:${h}px;border-radius:6px;border:1px solid #f4a849;${bgStyle}padding:7px 9px;color:#fff;box-shadow:0 5px 14px rgba(0,0,0,0.3);box-sizing:border-box;pointer-events:auto;overflow:visible;">
      ${overlapBubble}
      ${bulbFrame(w, h, { sideCount: 2, sideTopInset: 13, sideBottomInset: 13, horizontalDensity: 15 })}
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:5px;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:4px;">
  <div style="display:inline-flex;align-items:center;border-radius:9999px;padding:1px 6px;font-size:7px;font-weight:800;letter-spacing:0.06em;background:#0f172a;color:#fff;">EVENT</div>
  <div style="display:inline-flex;align-items:center;border-radius:9999px;padding:1px 6px;font-size:7px;font-weight:800;letter-spacing:0.06em;background:${derivedIsComingSoon ? "#f59e0b" : derivedIsActive ? "#059669" : "#475569"};color:#fff;">${stateLabel}</div>
</div>
          <div style="font-size:9.5px;font-weight:900;text-transform:uppercase;line-height:1.15;letter-spacing:0.02em;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escapeHtml(title)}</div>
          <div style="margin-top:3px;font-size:12px;color:rgba(255,255,255,0.82);line-height:1.25;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${detailText}</div>
        </div>
        <button data-marquee-expand="true" style="flex-shrink:0;border:1px solid rgba(244,168,73,0.6);border-radius:3px;background:rgba(244,168,73,0.18);padding:1px 5px;font-size:8px;font-weight:700;color:#f4a849;cursor:pointer;line-height:1.3;white-space:nowrap;">▼</button>
      </div>
    </div>
  `;

  return wrapBoard(w, tailH, card);
}

// EXPANDED: full board — same core content as collapsed + details button + collapse button
export function getMarqueeBoardExpandedHtml(listing, options = {}) {
  if (!listing) return "";
  const title = listing?.event_name || listing?.title || "Event";
  const dateStr = formatEventDate(listing);

  const derivedIsComingSoon =
    options?.isComingSoon === true ||
    listing?.mapState === "coming_soon" ||
    (!!listing?.startDateTime && new Date(listing.startDateTime) > new Date());

  const derivedIsActive =
    !derivedIsComingSoon &&
    (options?.isActive === true || listing?.mapState === "active");

  const stateLabel = derivedIsComingSoon
    ? "COMING SOON"
    : derivedIsActive
      ? "ACTIVE"
      : "EVENT";

  const infoText = derivedIsComingSoon
    ? `Active: ${escapeHtml(options?.goLiveLabel || dateStr || "")}`
    : escapeHtml(dateStr || listing?.event_description || listing?.description || "");
  const w = MARQUEE_BOARD_WIDTH;
  const tailH = 6;
  const bgUrl = listing?.marquee_background_url;
  const bgStyle = bgUrl
    ? `background:linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)),url('${bgUrl}');background-size:cover;background-position:center;`
    : `background:linear-gradient(to bottom,#7c2d12,#3f1d0b);`;

  const h = 74;

  const overlappedCount = options?.overlappedCount || 0;
  const overlapBubble = overlappedCount > 0 ? `
    <div data-marquee-overlap="true" style="position:absolute;top:-10px;right:-10px;background:#ef4444;color:#fff;border-radius:999px;padding:2px 6px;font-size:10px;font-weight:900;box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:pointer;z-index:20;border:2px solid #fff;line-height:1.2;">
      +${overlappedCount}
    </div>
  ` : "";

  const card = `
    <div style="position:absolute;bottom:${tailH}px;left:0;width:${w}px;border-radius:6px;border:1px solid #f4a849;${bgStyle}padding:7px 10px 9px;color:#fff;box-shadow:0 6px 16px rgba(0,0,0,0.32);box-sizing:border-box;pointer-events:auto;overflow:visible;">
      ${overlapBubble}
      ${bulbFrame(w, h, { sideCount: 4, sideTopInset: 14, sideBottomInset: 14, horizontalDensity: 15 })}
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:4px;">
  <div style="display:inline-flex;align-items:center;border-radius:9999px;padding:1px 6px;font-size:7px;font-weight:800;letter-spacing:0.06em;background:#0f172a;color:#fff;">EVENT</div>
  <div style="display:inline-flex;align-items:center;border-radius:9999px;padding:1px 6px;font-size:7px;font-weight:800;letter-spacing:0.06em;background:${derivedIsComingSoon ? "#f59e0b" : derivedIsActive ? "#059669" : "#475569"};color:#fff;">${stateLabel}</div>
</div>
          <div style="font-size:10.5px;font-weight:900;text-transform:uppercase;line-height:1.2;letter-spacing:0.04em;word-break:break-word;">${escapeHtml(title)}</div>
          ${infoText ? `<div style="margin-top:2px;font-size:8px;color:rgba(255,255,255,0.85);line-height:1.3;">${infoText}</div>` : ""}
        </div>
        <button data-marquee-collapse="true" style="flex-shrink:0;border:none;border-radius:9999px;background:rgba(0,0,0,0.28);padding:1px 5px;font-size:9px;font-weight:700;color:#fff;cursor:pointer;line-height:1.4;">✕</button>
      </div>
      <button data-marquee-details="true" style="margin-top:6px;height:22px;width:100%;border:none;border-radius:4px;background:#d97706;padding:0 6px;font-size:9px;font-weight:700;color:#fff;cursor:pointer;letter-spacing:0.02em;">View More Details</button>
    </div>
  `;

  return wrapBoard(w, tailH, card);
}