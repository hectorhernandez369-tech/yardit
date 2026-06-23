import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function milesBetween(lat1, lon1, lat2, lon2) {
  const toRad = (v) => v * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function userLatLng(user) {
  const data = user.data || {};
  const lat = user.primary_latitude ?? user.address_lat ?? data.primary_latitude ?? data.address_lat;
  const lng = user.primary_longitude ?? user.address_lng ?? data.primary_longitude ?? data.address_lng;
  const verified = user.primary_address_verified === true || user.address_verified === true || user.address_confirmation_status === 'confirmed' || data.primary_address_verified === true || data.address_verified === true || data.address_confirmation_status === 'confirmed';
  return verified && typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const listing = payload.data || payload.listing || payload;
    if (!listing?.id || !['active', 'scheduled', 'activated', 'activated_locked'].includes(listing.status) || typeof listing.lat !== 'number' || typeof listing.lng !== 'number') return Response.json({ skipped: true });
    if (!['yard_sale', 'neighborhood_sale', 'event'].includes(listing.listingType)) return Response.json({ skipped: true });

    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ listings_near_me_push_enabled: true });
    const users = await base44.asServiceRole.entities.User.list();
    let created = 0;
    for (const pref of prefs) {
      if (pref.user_id === listing.ownerUserId) continue;
      const user = users.find((u) => u.id === pref.user_id);
      const coords = userLatLng(user || {});
      if (!coords) continue;
      const distance = milesBetween(coords.lat, coords.lng, listing.lat, listing.lng);
      if (distance > (pref.listings_near_me_radius_miles || 2)) continue;
      const dedupeKey = `nearby_listing_${pref.user_id}_${listing.id}`;
      const existing = await base44.asServiceRole.entities.PushNotificationDeliveryLog.filter({ dedupe_key: dedupeKey });
      if (existing.length) continue;
      await base44.asServiceRole.entities.Notification.create({ userId: pref.user_id, user_id: pref.user_id, title: 'New listing near you', message: `${listing.title || 'A Yardit listing'} is ${distance.toFixed(1)} miles from your saved area.`, type: 'nearby_listing', related_entity_type: 'listing', related_entity_id: listing.id, metadata: { dedupe_key: dedupeKey, listing_id: listing.id }, read: false, is_read: false });
      created++;
    }
    return Response.json({ success: true, created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});