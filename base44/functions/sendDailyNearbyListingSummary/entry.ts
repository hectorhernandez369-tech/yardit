import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const REGISTRY_VERSION = '2026-06-24';
const PUBLIC_LISTING_TYPES = ['yard_sale', 'neighborhood_sale', 'event'];
const SKIP_STATUSES = ['draft', 'hidden', 'under_review', 'suspended', 'completed', 'expired', 'closed', 'cancelled', 'canceled', 'payment_pending', 'pending_payment'];

function milesBetween(lat1, lon1, lat2, lon2) {
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getYmd(date, timeZoneId) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: timeZoneId || 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
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

function userLatLng(user) {
  const data = user.data || {};
  const lat = user.primary_latitude ?? user.address_lat ?? data.primary_latitude ?? data.address_lat;
  const lng = user.primary_longitude ?? user.address_lng ?? data.primary_longitude ?? data.address_lng;
  const verified = user.primary_address_verified === true || user.address_verified === true || user.address_confirmation_status === 'confirmed' || data.primary_address_verified === true || data.address_verified === true || data.address_confirmation_status === 'confirmed';
  return verified && typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null;
}

function isCandidateListing(listing, now) {
  if (!listing?.id || !PUBLIC_LISTING_TYPES.includes(listingType(listing))) return false;
  if (SKIP_STATUSES.includes(String(listing.status || '').toLowerCase())) return false;
  if (typeof listingLat(listing) !== 'number' || typeof listingLng(listing) !== 'number') return false;
  const tz = listing.timeZoneId || 'America/Los_Angeles';
  const today = getYmd(now, tz);
  const activeDates = Array.isArray(listing.activeDates) ? listing.activeDates : [];
  if (activeDates.includes(today)) return true;
  if (listing.startDateTime) return getYmd(new Date(listing.startDateTime), tz) === today;
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const runDate = getYmd(now, 'UTC');

    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ push_enabled: true, listings_near_me_push_enabled: true });
    if (!prefs.length) return Response.json({ success: true, created: 0, reason: 'no opted-in users' });

    const [users, listings] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Listing.list('-created_date', 500),
    ]);

    const candidates = listings.filter((listing) => isCandidateListing(listing, now));
    let created = 0;
    const summaries = [];

    for (const pref of prefs) {
      const user = users.find((item) => item.id === pref.user_id);
      const coords = userLatLng(user || {});
      if (!coords) continue;

      const radius = Number(pref.listings_near_me_radius_miles || 2);
      const nearby = candidates.filter((listing) => {
        const ownerUserId = listing.ownerUserId ?? listing.owner_user_id ?? listing.created_by_id;
        if (ownerUserId && ownerUserId === pref.user_id) return false;
        return milesBetween(coords.lat, coords.lng, listingLat(listing), listingLng(listing)) <= radius;
      });

      if (!nearby.length) continue;

      const dedupeKey = `nearby_listings_daily_digest_${pref.user_id}_${runDate}`;
      const existing = await base44.asServiceRole.entities.Notification.filter({ dedupe_key: dedupeKey });
      if (existing.length) continue;

      const count = nearby.length;
      const title = 'Yard sales near you today';
      const message = count === 1
        ? '1 Yardit listing is happening near you today.'
        : `${count} Yardit listings are happening near you today.`;

      const notification = {
        userId: pref.user_id,
        user_id: pref.user_id,
        type: 'nearby_listings_daily_digest',
        title,
        message,
        recipient: 'users with Listings Near Me enabled',
        trigger: 'Daily 5:00 AM nearby listings summary',
        delivery_methods: ['push'],
        deep_link: '/?nearbyToday=1',
        dedupe_key: dedupeKey,
        registry_status: 'active',
        registry_version: REGISTRY_VERSION,
        related_entity_type: 'listing_summary',
        related_entity_id: runDate,
        metadata: {
          dedupe_key: dedupeKey,
          listing_ids: nearby.map((listing) => listing.id),
          listing_count: count,
          radius_miles: radius,
          url: '/?nearbyToday=1',
        },
        read: true,
        is_read: true,
      };
      const delivery = await base44.asServiceRole.functions.invoke('deliverNotificationPush', notification);
      if (delivery?.data?.success || delivery?.success) created++;
      summaries.push({ user_id: pref.user_id, count, radius });
    }

    return Response.json({ success: true, created, candidate_count: candidates.length, summaries });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});