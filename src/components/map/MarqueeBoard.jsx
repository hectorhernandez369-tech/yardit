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

  const formatEventDate = () => {
    try {
      const start = listing?.startDateTime || listing?.start_datetime;
      const end = listing?.endDateTime || listing?.end_datetime;
      if (!start) return "";
      const s = new Date(start);
      if (Number.isNaN(s.getTime())) return "";
      const opts = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
      const startStr = s.toLocaleString([], opts);
      if (!end) return startStr;
      const e = new Date(end);
      if (Number.isNaN(e.getTime())) return startStr;
      return `${startStr} – ${e.toLocaleString([], opts)}`;
    } catch {
      return "";
    }
  };

  const dateStr = formatEventDate();

  const slotRows = safeSlots.length > 0
    ? safeSlots.map((slot) => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;border-radius:3px;background:rgba(255,255,255,0.1);padding:3px 7px;font-size:9.5px;line-height:1.3;">
        <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;">${escapeHtml(slot?.label || "Schedule")}</span>
        <span style="flex-shrink:0;white-space:nowrap;color:#FDE68A;">${escapeHtml(formatSlotTime(slot))}</span>
      </div>
    `).join("")
    : "";

  return `
    <div style="position:relative;width:205px;pointer-events:auto;">
      <div style="position:relative;width:205px;border-radius:7px;border:1px solid #f4a849;background:linear-gradient(to bottom,#7c2d12,#3f1d0b);padding:7px 10px 9px;color:#fff;box-shadow:0 6px 16px rgba(0,0,0,0.32);box-sizing:border-box;">

        <button data-marquee-close="true" style="position:absolute;right:6px;top:6px;border:none;border-radius:9999px;background:rgba(0,0,0,0.28);padding:1px 5px;font-size:9px;font-weight:700;color:#fff;cursor:pointer;line-height:1.4;">✕</button>

        <div style="padding-right:22px;text-align:center;font-size:11px;font-weight:900;text-transform:uppercase;line-height:1.25;letter-spacing:0.04em;word-break:break-word;">${escapeHtml(title)}</div>

        ${dateStr ? `<div style="margin-top:3px;text-align:center;font-size:8.5px;color:rgba(255,255,255,0.65);line-height:1.3;">${escapeHtml(dateStr)}</div>` : ""}

        ${slotRows ? `<div style="margin-top:6px;display:grid;gap:3px;">${slotRows}</div>` : ""}

        <button data-marquee-details="true" style="margin-top:7px;height:24px;width:100%;border:none;border-radius:4px;background:#d97706;padding:0 6px;font-size:9px;font-weight:700;color:#fff;cursor:pointer;letter-spacing:0.02em;">View More Details</button>
      </div>
      <div style="margin:0 auto;height:0;width:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #3f1d0b;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.28));"></div>
    </div>
  `;
}