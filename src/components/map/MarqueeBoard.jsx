export function getMarqueeBoardHtml(listing) {
  if (!listing) return "";

  const title = listing?.event_name || listing?.title || "Event";
  const safeSlots = (() => {
    try {
      const slots = listing?.marquee_schedule_slots;
      return Array.isArray(slots) ? slots.slice(0, 4) : [];
    } catch {
      return [];
    }
  })();

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const formatSlotTime = (slot) => {
    try {
      if (!slot) return "Time TBD";
      const start = slot.start_time ? new Date(slot.start_time) : null;
      const end = slot.end_time ? new Date(slot.end_time) : null;
      if (!start || Number.isNaN(start.getTime())) return "Time TBD";

      const startText = start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      if (!end || Number.isNaN(end.getTime())) return startText;
      const endText = end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return `${startText} - ${endText}`;
    } catch {
      return "Time TBD";
    }
  };

  const slotRows = safeSlots.length > 0
    ? safeSlots.map((slot) => `
      <div style="display:flex;min-height:22px;align-items:center;justify-content:space-between;gap:8px;border-radius:2px;background:rgba(255,255,255,0.1);padding:4px 8px;font-size:10px;line-height:1.2;">
        <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;">${escapeHtml(slot?.label || "Schedule")}</span>
        <span style="flex-shrink:0;white-space:nowrap;color:#FDE68A;">${escapeHtml(formatSlotTime(slot))}</span>
      </div>
    `).join("")
    : "";

  return `
    <div style="position:relative;width:230px;min-height:140px;transform:translate(-50%, calc(-100% - 18px));pointer-events:auto;">
      <div style="position:relative;width:230px;min-height:140px;border-radius:8px;border:1px solid #f4a849;background:linear-gradient(to bottom, #7c2d12, #3f1d0b);padding:8px 12px 12px;color:#fff;box-shadow:0 8px 18px rgba(0,0,0,0.3);box-sizing:border-box;">
        <button data-marquee-close="true" style="position:absolute;right:8px;top:8px;border:none;border-radius:9999px;background:rgba(0,0,0,0.25);padding:2px 6px;font-size:10px;font-weight:700;color:#fff;cursor:pointer;">X</button>
        <div style="padding-right:28px;text-align:center;font-size:12px;font-weight:900;text-transform:uppercase;line-height:1.2;letter-spacing:0.03em;word-break:break-word;">${escapeHtml(title)}</div>
        ${slotRows ? `<div style="margin-top:12px;display:grid;gap:4px;">${slotRows}</div>` : ""}
        <button data-marquee-details="true" style="margin-top:12px;height:32px;width:100%;border:none;border-radius:6px;background:#d97706;padding:0 8px;font-size:10px;font-weight:700;color:#fff;cursor:pointer;">View More Details</button>
      </div>
      <div style="margin:0 auto;height:0;width:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid #3f1d0b;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.28));"></div>
    </div>
  `;
}