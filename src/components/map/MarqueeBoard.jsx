// Board dimensions — single source of truth
export const MARQUEE_BOARD_WIDTH = 160;
export const MARQUEE_BOARD_COLLAPSED_WIDTH = 130;

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

// Bulb: sits on the border (transform centers it on the edge)
const B = "width:5px;height:5px;border-radius:50%;background:radial-gradient(circle at 38% 38%, #FFF4A3, #FFD54A 50%, #FFB300);box-shadow:0 0 6px rgba(255,213,74,0.85);position:absolute;z-index:10;";

// Generate bulbs inside the card (card must have overflow:visible, position:relative)
// Bulbs are centered ON the border edge via negative offsets
function bulbFrame(w, h) {
  const sp = 16;
  const off = -2.5; // centers a 5px bulb on a 1px border
  const parts = [];

  // Top edge
  for (let x = 8; x <= w - 8; x += sp) {
    parts.push(`<div style="${B}top:${off}px;left:${x - 2.5}px;"></div>`);
  }
  // Bottom edge
  for (let x = 8; x <= w - 8; x += sp) {
    parts.push(`<div style="${B}bottom:${off}px;left:${x - 2.5}px;"></div>`);
  }
  // Left edge (skip corners already covered)
  for (let y = 14; y <= h - 14; y += sp) {
    parts.push(`<div style="${B}left:${off}px;top:${y - 2.5}px;"></div>`);
  }
  // Right edge
  for (let y = 14; y <= h - 14; y += sp) {
    parts.push(`<div style="${B}right:${off}px;top:${y - 2.5}px;"></div>`);
  }

  return parts.join("");
}

// Shared wrapper: 0-height outer div so iconAnchor [w/2, 0] = tail tip = coordinate
function wrapBoard(w, tailH, cardHtml) {
  return `
    <div style="position:relative;width:${w}px;height:0;pointer-events:none;">
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);height:0;width:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:${tailH}px solid #3f1d0b;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.18));"></div>
      ${cardHtml}
    </div>
  `;
}

// COLLAPSED: compact theater-style card — title + date + expand button + border lights
// Locked footprint: 160px width, ~52px height
export function getMarqueeBoardCollapsedHtml(listing) {
  if (!listing) return "";
  const title = listing?.event_name || listing?.title || "Event";
  const dateStr = formatEventDate(listing);
  const w = 160;
  const h = 52;
  const tailH = 6;
  const bgUrl = listing?.marquee_background_url;
  const bgStyle = bgUrl
    ? `background:linear-gradient(rgba(0,0,0,0.65),rgba(0,0,0,0.65)),url('${bgUrl}');background-size:cover;background-position:center;`
    : `background:linear-gradient(to bottom,#7c2d12,#3f1d0b);`;

  const card = `
    <div style="position:absolute;bottom:${tailH}px;left:0;width:${w}px;height:${h}px;border-radius:6px;border:1px solid #f4a849;${bgStyle}padding:7px 9px;color:#fff;box-shadow:0 5px 14px rgba(0,0,0,0.3);box-sizing:border-box;pointer-events:auto;overflow:visible;">
      ${bulbFrame(w, h)}
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:5px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:9.5px;font-weight:900;text-transform:uppercase;line-height:1.15;letter-spacing:0.02em;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escapeHtml(title)}</div>
          ${dateStr ? `<div style="margin-top:1px;font-size:7px;color:rgba(255,255,255,0.55);line-height:1.2;">${escapeHtml(dateStr)}</div>` : ""}
        </div>
        <button data-marquee-expand="true" style="flex-shrink:0;border:1px solid rgba(244,168,73,0.6);border-radius:3px;background:rgba(244,168,73,0.18);padding:1px 5px;font-size:8px;font-weight:700;color:#f4a849;cursor:pointer;line-height:1.3;white-space:nowrap;">▼</button>
      </div>
    </div>
  `;

  return wrapBoard(w, tailH, card);
}

// EXPANDED: full board — title + date + slots + details button + collapse button + border lights
export function getMarqueeBoardExpandedHtml(listing) {
  if (!listing) return "";
  const title = listing?.event_name || listing?.title || "Event";
  const dateStr = formatEventDate(listing);
  const w = MARQUEE_BOARD_WIDTH;
  const tailH = 6;
  const bgUrl = listing?.marquee_background_url;
  const bgStyle = bgUrl
    ? `background:linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)),url('${bgUrl}');background-size:cover;background-position:center;`
    : `background:linear-gradient(to bottom,#7c2d12,#3f1d0b);`;

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

  // Approximate height: header (~32px) + slots (20px each) + button (28px) + padding
  const h = 38 + safeSlots.length * 20 + 28;

  const card = `
    <div style="position:absolute;bottom:${tailH}px;left:0;width:${w}px;border-radius:6px;border:1px solid #f4a849;${bgStyle}padding:7px 10px 9px;color:#fff;box-shadow:0 6px 16px rgba(0,0,0,0.32);box-sizing:border-box;pointer-events:auto;overflow:visible;">
      ${bulbFrame(w, h)}
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