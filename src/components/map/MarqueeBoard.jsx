// Board dimensions — single source of truth
export const MARQUEE_BOARD_WIDTH = 190;

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
    const start = listing?.startDateTime || listing?.start_datetime;
    if (!start) return "";
    const s = new Date(start);
    if (Number.isNaN(s.getTime())) return "";
    return s.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
};

// Shared wrapper: 0-height outer div so iconAnchor [w/2, 0] = tail tip = coordinate
function wrapBoard(w, tailH, cardHtml) {
  return `
    <div style="position:relative;width:${w}px;height:0;pointer-events:none;">
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);height:0;width:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:${tailH}px solid #3f1d0b;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.18));"></div>
      ${cardHtml}
    </div>
  `;
}

// COLLAPSED: compact teaser — title + date + expand button
export function getMarqueeBoardCollapsedHtml(listing) {
  if (!listing) return "";
  const title = listing?.event_name || listing?.title || "Event";
  const dateStr = formatEventDate(listing);
  const w = MARQUEE_BOARD_WIDTH;
  const tailH = 6;

  const card = `
    <div style="position:absolute;bottom:${tailH}px;left:0;width:${w}px;border-radius:6px;border:1px solid #f4a849;background:linear-gradient(to bottom,#7c2d12,#3f1d0b);padding:6px 10px 7px;color:#fff;box-shadow:0 5px 14px rgba(0,0,0,0.3);box-sizing:border-box;pointer-events:auto;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:10.5px;font-weight:900;text-transform:uppercase;line-height:1.2;letter-spacing:0.04em;word-break:break-word;">${escapeHtml(title)}</div>
          ${dateStr ? `<div style="margin-top:2px;font-size:8px;color:rgba(255,255,255,0.6);line-height:1.3;">${escapeHtml(dateStr)}</div>` : ""}
        </div>
        <button data-marquee-expand="true" style="flex-shrink:0;border:1px solid rgba(244,168,73,0.6);border-radius:4px;background:rgba(244,168,73,0.18);padding:2px 6px;font-size:9px;font-weight:700;color:#f4a849;cursor:pointer;line-height:1.4;white-space:nowrap;">▼ More</button>
      </div>
    </div>
  `;

  return wrapBoard(w, tailH, card);
}

// EXPANDED: full board — title + date + slots + details button + collapse button
export function getMarqueeBoardExpandedHtml(listing) {
  if (!listing) return "";
  const title = listing?.event_name || listing?.title || "Event";
  const dateStr = formatEventDate(listing);
  const w = MARQUEE_BOARD_WIDTH;
  const tailH = 6;

  const safeSlots = (() => {
    try {
      const slots = listing?.marquee_schedule_slots;
      return Array.isArray(slots) ? slots.slice(0, 4) : [];
    } catch {
      return [];
    }
  })();

  const slotRows = safeSlots.length > 0
    ? safeSlots.map((slot) => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:5px;border-radius:3px;background:rgba(255,255,255,0.1);padding:3px 6px;font-size:9px;line-height:1.3;">
        <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;">${escapeHtml(slot?.label || "Schedule")}</span>
        <span style="flex-shrink:0;white-space:nowrap;color:#FDE68A;">${escapeHtml(formatSlotTime(slot))}</span>
      </div>
    `).join("")
    : "";

  const card = `
    <div style="position:absolute;bottom:${tailH}px;left:0;width:${w}px;border-radius:6px;border:1px solid #f4a849;background:linear-gradient(to bottom,#7c2d12,#3f1d0b);padding:6px 10px 8px;color:#fff;box-shadow:0 6px 16px rgba(0,0,0,0.32);box-sizing:border-box;pointer-events:auto;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:${slotRows ? "5px" : "0"};">
        <div style="flex:1;min-width:0;">
          <div style="font-size:10.5px;font-weight:900;text-transform:uppercase;line-height:1.2;letter-spacing:0.04em;word-break:break-word;">${escapeHtml(title)}</div>
          ${dateStr ? `<div style="margin-top:2px;font-size:8px;color:rgba(255,255,255,0.6);line-height:1.3;">${escapeHtml(dateStr)}</div>` : ""}
        </div>
        <button data-marquee-collapse="true" style="flex-shrink:0;border:none;border-radius:9999px;background:rgba(0,0,0,0.28);padding:1px 5px;font-size:9px;font-weight:700;color:#fff;cursor:pointer;line-height:1.4;">✕</button>
      </div>
      ${slotRows ? `<div style="display:grid;gap:3px;">${slotRows}</div>` : ""}
      <button data-marquee-details="true" style="margin-top:6px;height:22px;width:100%;border:none;border-radius:4px;background:#d97706;padding:0 6px;font-size:9px;font-weight:700;color:#fff;cursor:pointer;letter-spacing:0.02em;">View More Details</button>
    </div>
  `;

  return wrapBoard(w, tailH, card);
}