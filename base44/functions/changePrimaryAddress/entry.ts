import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MAPBOX_TOKEN = 'pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA';
const CHANGE_COOLDOWN_DAYS = 365;
const MAX_GPS_DISTANCE_FEET = 300;
const MAX_GPS_ACCURACY_FEET = 500;

const feetBetween = (lat1, lng1, lat2, lng2) => {
  const R = 20902231;
  const toRad = (value) => Number(value) * Math.PI / 180;
  const dLat = toRad(Number(lat2) - Number(lat1));
  const dLng = toRad(Number(lng2) - Number(lng1));
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

function getLastChangedAt(user) {
  return user?.primary_address_last_changed_at || user?.data?.primary_address_last_changed_at || '';
}

function getNextAllowedAt(user) {
  const data = user?.data && typeof user.data === 'object' ? user.data : {};
  const changeCount = Number(user?.address_change_count || data.address_change_count || 0);
  if (changeCount <= 0) return null;

  const raw = getLastChangedAt(user);
  if (!raw) return null;
  const changed = new Date(raw);
  if (Number.isNaN(changed.getTime())) return null;
  return new Date(changed.getTime() + CHANGE_COOLDOWN_DAYS * 86400000);
}

function extractAddressParts(feature, fallback = {}) {
  let city = fallback.city || '';
  let state = fallback.state || '';
  let zip = fallback.zip_code || '';
  for (const item of feature?.context || []) {
    if (item.id?.startsWith('place')) city = item.text;
    if (item.id?.startsWith('region')) state = item.short_code?.replace('US-', '') || item.text;
    if (item.id?.startsWith('postcode')) zip = item.text;
  }
  return {
    street_address: feature?.address ? `${feature.address} ${feature.text}` : String(fallback.street_address || '').trim(),
    city: String(city || '').trim(),
    state: String(state || '').toUpperCase().slice(0, 2),
    zip_code: String(zip || '').trim(),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const streetAddress = String(body?.street_address || '').trim();
    const city = String(body?.city || '').trim();
    const state = String(body?.state || '').trim();
    const zipCode = String(body?.zip_code || '').trim();
    const gpsLat = Number(body?.gps_lat);
    const gpsLng = Number(body?.gps_lng);
    const gpsAccuracyFeet = Number(body?.gps_accuracy_feet || 0);

    if (!streetAddress || !city || !state || !zipCode) {
      return Response.json({ error: 'A complete address is required.' }, { status: 400 });
    }
    if (!Number.isFinite(gpsLat) || !Number.isFinite(gpsLng)) {
      return Response.json({ error: 'GPS confirmation is required to change your primary address.' }, { status: 400 });
    }
    if (gpsAccuracyFeet > MAX_GPS_ACCURACY_FEET) {
      return Response.json({
        error: 'Your GPS location is not precise enough. Move somewhere with a clearer signal and try again.',
        code: 'gps_accuracy_low',
      }, { status: 400 });
    }

    const nextAllowedAt = getNextAllowedAt(user);
    if (nextAllowedAt && nextAllowedAt.getTime() > Date.now()) {
      return Response.json({
        error: 'Your primary address can only be changed once every 365 days. You can request a Yardit review if you moved sooner.',
        code: 'address_change_locked',
        next_allowed_at: nextAllowedAt.toISOString(),
      }, { status: 409 });
    }

    const query = [streetAddress, city, state, zipCode].join(', ');
    const mapboxResponse = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1&types=address`
    );
    const mapboxData = await mapboxResponse.json();
    const feature = mapboxData?.features?.[0];
    if (!mapboxResponse.ok || !feature?.center || feature?.place_type?.[0] !== 'address') {
      return Response.json({ error: 'We could not verify that as a physical street address.' }, { status: 400 });
    }

    const [targetLng, targetLat] = feature.center;
    const distanceFeet = feetBetween(gpsLat, gpsLng, targetLat, targetLng);
    if (!Number.isFinite(distanceFeet) || distanceFeet > MAX_GPS_DISTANCE_FEET) {
      return Response.json({
        error: `You must be near the new address to confirm it. Your phone is about ${Math.round(distanceFeet)} feet away.`,
        code: 'gps_too_far',
        distance_feet: Math.round(distanceFeet),
      }, { status: 400 });
    }

    const parts = extractAddressParts(feature, { street_address: streetAddress, city, state, zip_code: zipCode });
    const now = new Date().toISOString();
    const existingData = user?.data && typeof user.data === 'object' ? user.data : {};
    const nextChangeCount = Number(user?.address_change_count || existingData.address_change_count || 0) + 1;

    const update = {
      has_primary_address: true,
      primary_address_verified: true,
      address_verified: true,
      primary_address: feature.place_name || query,
      primary_latitude: targetLat,
      primary_longitude: targetLng,
      primary_address_verified_at: now,
      primary_address_last_changed_at: now,
      address_change_count: nextChangeCount,
      address_verification_required: false,
      street_address: parts.street_address,
      city: parts.city,
      state: parts.state,
      zip_code: parts.zip_code,
      address_lat: targetLat,
      address_lng: targetLng,
      address_confirmation_status: 'confirmed',
      address: feature.place_name || query,
      data: {
        ...existingData,
        has_primary_address: true,
        primary_address_verified: true,
        address_verified: true,
        primary_address: feature.place_name || query,
        primary_latitude: targetLat,
        primary_longitude: targetLng,
        primary_address_verified_at: now,
        primary_address_last_changed_at: now,
        address_change_count: nextChangeCount,
        address_verification_required: false,
        street_address: parts.street_address,
        city: parts.city,
        state: parts.state,
        zip_code: parts.zip_code,
        address_lat: targetLat,
        address_lng: targetLng,
        address_confirmation_status: 'confirmed',
        address: feature.place_name || query,
      },
    };

    await base44.asServiceRole.entities.User.update(user.id, update);

    await base44.asServiceRole.entities.UserActivityLog.create({
      user_id: user.id,
      event_type: 'primary_address_changed',
      event_label: 'Primary Address Changed',
      target_type: 'account',
      target_id: user.id,
      source_page: 'Profile',
      created_at: now,
      details_json: {
        gps_confirmed: true,
        gps_distance_feet: Math.round(distanceFeet),
        gps_accuracy_feet: Math.round(gpsAccuracyFeet || 0),
        change_count: nextChangeCount,
      },
    }).catch(() => null);

    return Response.json({
      ok: true,
      address: update,
      next_allowed_at: new Date(Date.now() + CHANGE_COOLDOWN_DAYS * 86400000).toISOString(),
      gps_distance_feet: Math.round(distanceFeet),
    });
  } catch (error) {
    console.error('changePrimaryAddress failed', error?.message || error);
    return Response.json({ error: error?.message || 'Address change failed.' }, { status: 500 });
  }
});
