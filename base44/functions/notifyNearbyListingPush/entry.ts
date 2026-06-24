import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PUBLIC_STATUSES = ['active', 'scheduled', 'activated', 'activated_locked'];
const PUBLIC_LISTING_TYPES = ['yard_sale', 'neighborhood_sale', 'event'];
const PUBLIC_VISIBILITY_FIELDS = ['status', 'listingType', 'type', 'lat', 'lng', 'latitude', 'longitude'];

function milesBetween(lat1, lon1, lat2, lon2) {
  const toRad = (v) => v * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function listingLat(listing) {
  return listing.lat ?? listing.latitude;
}

function listingLng(listing) {
  return listing.lng ?? listing.longitude;
}

function listingType(listing) {
  return listing.listingType ?? listing.type;
}

function hasListingCoordinates(listing) {
  return typeof listingLat(listing) === 'number' && typeof listingLng(listing) === 'number';
}

function isPublicDiscoverable(listing) {
  return !!listing?.id && PUBLIC_STATUSES.includes(listing.status) && PUBLIC_LISTING_TYPES.includes(listingType(listing)) && hasListingCoordinates(listing);
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
    const previousListing = payload.old_data || payload.oldData || payload.previous || payload.previous_listing || null;
    const changedFields = Array.isArray(payload.changed_fields) ? payload.changed_fields : [];
    const isUpdateEvent = payload.event?.type === 'update';

    if (!previousListing && isUpdateEvent && changedFields.length && !changedFields.some((field) => PUBLIC_VISIBILITY_FIELDS.includes(field))) {
      console.log(`nearby_listing skipped for listing ${listing?.id || 'unknown'}: already discoverable or normal edit with no public visibility change`);
      return Response.json({ skipped: true, reason: 'already discoverable' });
    }

    if (!listing?.id) {
      console.log('nearby_listing skipped: not public - missing listing id');
      return Response.json({ skipped: true, reason: 'not public' });
    }

    if (!hasListingCoordinates(listing)) {
      console.log(`nearby_listing skipped for listing ${listing.id}: missing coordinates`);
      return Response.json({ skipped: true, reason: 'missing coordinates' });
    }

    if (!isPublicDiscoverable(listing)) {
      console.log(`nearby_listing skipped for listing ${listing.id}: not public`);
      return Response.json({ skipped: true, reason: 'not public' });
    }

    if (previousListing && isPublicDiscoverable(previousListing)) {
      console.log(`nearby_listing skipped for listing ${listing.id}: already discoverable before this change`);
      return Response.json({ skipped: true, reason: 'already discoverable' });
    }

    if (!previousListing) {
      const existingListingDeliveries = await base44.asServiceRole.entities.PushNotificationDeliveryLog.filter({ notification_type: 'nearby_listing', source_id: listing.id });
      if (existingListingDeliveries.length) {
        console.log(`nearby_listing skipped for listing ${listing.id}: duplicate delivery log exists`);
        return Response.json({ skipped: true, reason: 'duplicate delivery log exists' });
      }
    }

    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ listings_near_me_push_enabled: true });
    if (!prefs.length) {
      console.log(`nearby_listing skipped for listing ${listing.id}: user preferences disabled`);
      return Response.json({ success: true, created: 0, reason: 'user preferences disabled' });
    }

    const users = await base44.asServiceRole.entities.User.list();
    let created = 0;
    const lat = listingLat(listing);
    const lng = listingLng(listing);
    const ownerUserId = listing.ownerUserId ?? listing.owner_user_id ?? listing.created_by_id;

    for (const pref of prefs) {
      if (pref.user_id === ownerUserId) continue;
      const user = users.find((u) => u.id === pref.user_id);
      const coords = userLatLng(user || {});
      if (!coords) {
        console.log(`nearby_listing skipped for user ${pref.user_id} on listing ${listing.id}: missing coordinates`);
        continue;
      }
      const distance = milesBetween(coords.lat, coords.lng, lat, lng);
      if (distance > (pref.listings_near_me_radius_miles || 2)) continue;
      const dedupeKey = `nearby_listing_${pref.user_id}_${listing.id}`;
      const existing = await base44.asServiceRole.entities.PushNotificationDeliveryLog.filter({ dedupe_key: dedupeKey });
      if (existing.length) {
        console.log(`nearby_listing skipped for user ${pref.user_id} on listing ${listing.id}: duplicate delivery log exists`);
        continue;
      }
      await base44.asServiceRole.entities.Notification.create({ userId: pref.user_id, user_id: pref.user_id, title: 'New listing near you', message: `${listing.title || 'A Yardit listing'} is ${distance.toFixed(1)} miles from your saved area.`, type: 'nearby_listing', related_entity_type: 'listing', related_entity_id: listing.id, metadata: { dedupe_key: dedupeKey, listing_id: listing.id }, read: false, is_read: false });
      created++;
    }
    return Response.json({ success: true, created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});