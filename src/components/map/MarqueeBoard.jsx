export const MARQUEE_BOARD_WIDTH = 205;
export const MARQUEE_COLLAPSED_WIDTH = 160;

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

function formatEventDateStart(listing) {
  try {
    const start = listing?.startDateTime || listing?.start_datetime;
    if (!start) return "";
    const s = new Date(start);
    if (Number.isNaN(s.getTime())) return "";
    return s.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatSlotTime(slot) {
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
}

// Shared tail + card wrapper — card content passed in, width configurable
function boardHtml(cardContent, width) {
  const tailH = 6;
  return `
    <div style="position:relative;width:${width}px;height:0;pointer-events:none;">
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);height:0;width:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:${tailH}px solid #3f1d0b;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.18));"></div>
      <div style="position:absolute;bottom:${tailH}px;left:0;width:${width}px;border-radius:7px;border:1px solid #f4a849;background:linear-gradient(to bottom,#7c2d12,#3f1d0b);padding:6px 9px 8px;color:#fff;box-shadow:0 6px 16px rgba(0,0,0,0.32);box-sizing:border-box;pointer-events:auto;">
        ${cardContent}
      </div>
    </div>
  `;
}

// COLLAPSED: title + date + expand button
export function getMarqueeCollapsedHtml(listing) {
  if (!listing) return "";
  const title = listing?.event_name || listing?.title || "Event";
  const dateStr = formatEventDateStart(listing);
  const w = MARQUEE_COLLAPSED_WIDTH;

  const cardContent = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;">
      <div style="min-width:0;flex:1;">
        <div style="font-size:10px;font-weight:900;text-transform:uppercase;line-height:1.25;letter-spacing:0.04em;word-break:break-word;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escapeHtml(title)}</div>
        ${dateStr ? `<div style="margin-top:2px;font-size:8px;color:rgba(255,255,255,0.6);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(dateStr)}</div>` : ""}
      </div>
      <button data-marquee-expand="true" style="flex-shrink:0;border:none;border-radius:4px;background:rgba(244,168,73,0.25);border:1px solid rgba(244,168,73,0.5);padding:2px 5px;font-size:9px;color:#FDE68A;cursor:pointer;line-height:1.4;white-space:nowrap;">▼ More</button>
    </div>
  `;
  return boardHtml(cardContent, w);
}

// EXPANDED: title + date + slots + details button + collapse button
export function getMarqueeBoardHtml(listing) {
  if (!listing) return "";
  const title = listing?.event_name || listing?.title || "Event";
  const dateStr = formatEventDateStart(listing);
  const w = MARQUEE_BOARD_WIDTH;

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
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;border-radius:3px;background:rgba(255,255,255,0.1);padding:3px 7px;font-size:9px;line-height:1.3;">
        <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;">${escapeHtml(slot?.label || "Schedule")}</span>
        <span style="flex-shrink:0;white-space:nowrap;color:#FDE68A;">${escapeHtml(formatSlotTime(slot))}</span>
      </div>
    `).join("")
    : "";

  const cardContent = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:4px;">
      <div style="min-width:0;flex:1;">
        <div style="font-size:11px;font-weight:900;text-transform:uppercase;line-height:1.25;letter-spacing:0.04em;word-break:break-word;">${escapeHtml(title)}</div>
        ${dateStr ? `<div style="margin-top:2px;font-size:8px;color:rgba(255,255,255,0.6);line-height:1.3;">${escapeHtml(dateStr)}</div>` : ""}
      </div>
      <button data-marquee-close="true" style="flex-shrink:0;border:none;border-radius:9999px;background:rgba(0,0,0,0.28);padding:1px 5px;font-size:9px;font-weight:700;color:#fff;cursor:pointer;line-height:1.4;">✕</button>
    </div>
    ${slotRows ? `<div style="display:grid;gap:3px;margin-bottom:6px;">${slotRows}</div>` : ""}
    <button data-marquee-details="true" style="height:22px;width:100%;border:none;border-radius:4px;background:#d97706;padding:0 6px;font-size:9px;font-weight:700;color:#fff;cursor:pointer;letter-spacing:0.02em;">View More Details</button>
  `;
  return boardHtml(cardContent, w);
}