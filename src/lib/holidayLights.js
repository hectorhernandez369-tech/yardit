import tzLookup from 'tz-lookup';
import { zonedDateTimeToUtcDate } from '@/components/shared/listingTierEngine';

export function holidayTimeZone(spot) {
  const lat = spot.latitude ?? spot.lat, lng = spot.longitude ?? spot.lng;
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? tzLookup(lat, lng) : 'UTC';
}
export function holidayLocalParts(spot, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: holidayTimeZone(spot), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
export function isHolidayLightsSeason(now = new Date(), location = null) {
  if (location) {
    const md = holidayLocalParts(location, now).date.slice(5);
    return md >= '11-01' || md <= '01-02';
  }
  const month = now.getMonth();
  return month >= 10 || (month === 0 && now.getDate() <= 2);
}
export function holidayDate(spot, field) {
  if (!spot[field]) return '';
  return holidayLocalParts(spot, new Date(spot[field])).date;
}
export function holidayLightState(spot, now = new Date()) {
  if (spot.status !== 'active') return 'Hidden';
  const { date, time } = holidayLocalParts(spot, now);
  const md = date.slice(5), start = holidayDate(spot, 'start_date_time'), end = holidayDate(spot, 'end_date_time');
  if (end && now > new Date(spot.end_date_time)) return 'Season ended';
  if (md > '01-02' && md < '11-01') return 'Out of season';
  if (start && date < start) return 'Coming Soon';
  if (!spot.display_active) return 'Lights off';
  return time >= spot.viewing_start_time && time < spot.viewing_end_time ? 'Lights on now' : 'Off hours';
}
export function holidayListing(spot) {
  return { ...spot, listingType: 'holiday_lights', title: spot.display_title || spot.title || 'Holiday Lights', lat: spot.latitude, lng: spot.longitude, addressText: spot.address, zip: spot.zip_code, tier: 'free', category: 'Christmas Displays', categories: ['Christmas Displays'], startDateTime: spot.start_date_time, endDateTime: spot.end_date_time, photoUrls: spot.photos || [], timeZoneId: holidayTimeZone(spot) };
}
export function holidayFormData(spot = {}) {
  const year = new Date().getFullYear() - (new Date().getMonth() === 0 ? 1 : 0);
  return { title: spot.display_title || spot.title || '', description: spot.description || '', address: spot.address || '', latitude: spot.latitude ?? null, longitude: spot.longitude ?? null, start: holidayDate(spot, 'start_date_time') || `${year}-11-01`, end: holidayDate(spot, 'end_date_time') || `${year + 1}-01-02`, viewing_start_time: spot.viewing_start_time || '17:00', viewing_end_time: spot.viewing_end_time || '22:00', display_active: spot.display_active ?? true, photos: spot.photos || [], christmas_spot_type: spot.christmas_spot_type || 'christmas_decorations', christmas_tags: spot.christmas_tags || [], christmas_host_name: spot.christmas_host_name || '', christmas_admission: spot.christmas_admission || '', christmas_parking_notes: spot.christmas_parking_notes || '', christmas_activities: spot.christmas_activities || '', christmas_suggested_age: spot.christmas_suggested_age || '' };
}
export function holidayPayload(form, userId) {
  const zone = holidayTimeZone(form);
  return { type: 'holiday_lights', tier: 'free', status: 'active', owner_user_id: userId, title: form.title.trim(), display_title: form.title.trim(), description: form.description.trim(), address: form.address.trim(), latitude: form.latitude, longitude: form.longitude, viewing_start_time: form.viewing_start_time, viewing_end_time: form.viewing_end_time, display_active: form.display_active, start_date_time: zonedDateTimeToUtcDate(form.start, '00:00', zone).toISOString(), end_date_time: zonedDateTimeToUtcDate(form.end, form.viewing_end_time, zone).toISOString(), expires_at: zonedDateTimeToUtcDate(form.end, form.viewing_end_time, zone).toISOString(), payment_status: 'free', photos: (form.photos||[]).slice(0,3), christmas_spot_type: form.christmas_spot_type || 'christmas_decorations', christmas_tags: (form.christmas_tags||[]), christmas_host_name: form.christmas_host_name || '', christmas_admission: form.christmas_admission || '', christmas_parking_notes: form.christmas_parking_notes || '', christmas_activities: form.christmas_activities || '', christmas_suggested_age: form.christmas_suggested_age || '', christmas_featured_badge: 'none' };
}