import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const MAPBOX_TOKEN = 'pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA';

function getAppMode(settings) {
  const appModeSetting = (settings || []).find((setting) => setting.key === 'app_mode');
  return appModeSetting?.value === 'demo' ? 'demo' : 'live';
}

async function geocodeUserAddress(user) {
  if (user?.address_lat && user?.address_lng) {
    return { lat: user.address_lat, lng: user.address_lng };
  }

  if (!user?.street_address || !user?.city || !user?.state || !user?.zip_code) {
    return { lat: null, lng: null };
  }

  const query = `${user.street_address}, ${user.city}, ${user.state}, ${user.zip_code}`;
  const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=1&access_token=${MAPBOX_TOKEN}`);
  const data = await response.json();
  const feature = data?.features?.[0];

  if (!feature) {
    return { lat: null, lng: null };
  }

  return {
    lat: feature.center[1],
    lng: feature.center[0],
  };
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json().catch(() => ({}));
    const base44 = createClientFromRequest(req);
    const listing = payload?.data || null;

    if (!listing?.id) {
      return Response.json({ skipped: true, reason: 'No listing payload provided' });
    }

    if (listing.listingType === 'neighborhood_sale') {
      return Response.json({ skipped: true, reason: 'Neighborhood sale listings are excluded' });
    }

    // Skip profile address enforcement for admin-assisted listings
    if (
      listing.created_by_admin === true ||
      listing.assisted_listing === true ||
      listing.owner_type === 'guest_assisted' ||
      listing.location_source === 'address_search' ||
      listing.location_source === 'map_pin' ||
      listing.location_source === 'admin_selected'
    ) {
      return Response.json({ skipped: true, reason: 'Admin-assisted listings are excluded from profile lock' });
    }

    const settings = await base44.asServiceRole.entities.AppSetting.list();
    if (getAppMode(settings) !== 'live') {
      return Response.json({ skipped: true, reason: 'App is not in live mode' });
    }

    let owner = null;

    if (listing.ownerUserId) {
      const usersById = await base44.asServiceRole.entities.User.filter({ id: listing.ownerUserId });
      owner = usersById[0] || null;
    }

    if (!owner && listing.created_by) {
      const usersByEmail = await base44.asServiceRole.entities.User.filter({ email: listing.created_by });
      owner = usersByEmail[0] || null;
    }

    if (!owner?.street_address || !owner?.city || !owner?.state || !owner?.zip_code) {
      return Response.json({ skipped: true, reason: 'Owner profile address is incomplete' });
    }

    const coords = await geocodeUserAddress(owner);
    const nextLat = owner.address_lat ?? coords.lat ?? listing.lat ?? null;
    const nextLng = owner.address_lng ?? coords.lng ?? listing.lng ?? null;
    const nextState = String(owner.state || '').toUpperCase().slice(0, 2);

    const updates = {
      addressText: owner.street_address,
      city: owner.city,
      state: nextState,
      zip: owner.zip_code,
      ...(nextLat !== null ? { lat: nextLat } : {}),
      ...(nextLng !== null ? { lng: nextLng } : {}),
    };

    const unchanged =
      listing.addressText === updates.addressText &&
      listing.city === updates.city &&
      listing.state === updates.state &&
      listing.zip === updates.zip &&
      (nextLat === null || listing.lat === nextLat) &&
      (nextLng === null || listing.lng === nextLng);

    if (unchanged) {
      return Response.json({ skipped: true, reason: 'Listing already matches profile address' });
    }

    await base44.asServiceRole.entities.Listing.update(listing.id, updates);

    return Response.json({ success: true, listing_id: listing.id, updates });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});