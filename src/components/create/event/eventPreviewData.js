export const SAMPLE_FLYER = "https://media.base44.com/images/public/690f554506edf795e5d84121/b9f012293_generated_image.png";
export const SAMPLE_LOGO = "https://media.base44.com/images/public/690f554506edf795e5d84121/afee709d7_generated_image.png";
export const SAMPLE_PHOTOS = [
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop&q=80",
];
export function makeEventPreview(data = {}, changes = {}) {
  const now = new Date();
  const start = new Date(now.getTime() - 60 * 60 * 1000);
  const end = new Date(now.getTime() + 60 * 60 * 1000);
  const date = now.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  return {
    id: "addon-example", listingType: "event", tier: "event", event_tier: "event", status: "active",
    title: data.event_name || data.title || "Community Festival", event_name: data.event_name || data.title || "Community Festival",
    event_description: "Music, food and family activities at Community Park. Illustrative event only.",
    event_category: data.event_category || "Community", event_icon: data.event_icon || "heart",
    lat: 36.2032, lng: -119.0883, city: "Lindsay", state: "CA", zip: "93247", timeZoneId: "America/Los_Angeles",
    addressText: "Community Park (sample location)", display_address: "Community Park (sample location)",
    startDateTime: start.toISOString(), endDateTime: end.toISOString(),
    start_datetime: start.toISOString(), end_datetime: end.toISOString(),
    activeDates: [date], selectedRangeStartDate: date, selectedRangeEndDate: date,
    openTime: "00:00", closeTime: "23:59", event_add_ons: {}, event_animation: "",
    ...changes,
  };
}