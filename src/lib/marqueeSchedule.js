import { format } from "date-fns";

export function normalizeMarqueeSlots(slots = []) {
  return (Array.isArray(slots) ? slots : [])
    .filter((slot) => slot?.label && slot?.start_time && slot?.end_time)
    .map((slot, index) => ({
      id: slot.id || `slot_${index}`,
      label: String(slot.label).trim(),
      start_time: slot.start_time,
      end_time: slot.end_time,
      startDate: new Date(slot.start_time),
      endDate: new Date(slot.end_time),
    }))
    .filter((slot) => !Number.isNaN(slot.startDate.getTime()) && !Number.isNaN(slot.endDate.getTime()) && slot.endDate > slot.startDate)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

export function getVisibleMarqueeSlots(listing, now = new Date()) {
  const normalized = normalizeMarqueeSlots(listing?.marquee_schedule_slots || []);
  return normalized.filter((slot) => slot.endDate > now).slice(0, 4);
}

export function formatMarqueeSlotTime(slot) {
  if (!slot?.startDate || !slot?.endDate) return "";
  return `${format(slot.startDate, "h:mm a")} - ${format(slot.endDate, "h:mm a")}`;
}

export function hasMoreMarqueeSlots(listing, now = new Date()) {
  const normalized = normalizeMarqueeSlots(listing?.marquee_schedule_slots || []);
  return normalized.filter((slot) => slot.endDate > now).length > 4;
}