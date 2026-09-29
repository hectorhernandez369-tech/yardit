import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ADMIN_ROLES = new Set(['admin', 'master', 'supervisor', 'super_master']);
const ADMIN_PATCH_FIELDS = new Set([
  'title',
  'display_title',
  'description',
  'status',
  'statusReason',
  'safety_warning',
  'halloween_featured_badge',
  'halloween_spot_type',
  'halloween_icon_key',
  'halloween_tags',
  'halloween_candy_available',
  'halloween_walkthrough',
  'halloween_lights',
  'halloween_sound',
  'halloween_jump_scares',
  'halloween_suggested_age',
  'halloween_start_date',
  'halloween_end_date',
  'halloween_start_time',
  'halloween_end_time',
  'viewing_start_time',
  'viewing_end_time',
  'custom_icon_url',
]);

function normalizeEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}

async function hasActiveAdminAccess(base44, user) {
  if (!user) return false;
  if (ADMIN_ROLES.has(String(user.role || '').toLowerCase())) return true;

  const email = normalizeEmail(user.email);
  const [byUserId, byEmail] = await Promise.all([
    base44.asServiceRole.entities.AdminProfile.filter({ user_id: user.id }).catch(() => []),
    email ? base44.asServiceRole.entities.AdminProfile.filter({ email }).catch(() => []) : Promise.resolve([]),
  ]);

  return [...(byUserId || []), ...(byEmail || [])].some((profile) => profile?.is_active === true);
}

function pickAllowedPatch(patch = {}) {
  const clean = {};
  for (const [key, value] of Object.entries(patch || {})) {
    if (ADMIN_PATCH_FIELDS.has(key)) clean[key] = value;
  }
  return clean;
}

function normalizeAddress(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(street)\b/g, 'st')
    .replace(/\b(avenue)\b/g, 'ave')
    .replace(/\b(road)\b/g, 'rd')
    .replace(/\b(drive)\b/g, 'dr')
    .replace(/\b(lane)\b/g, 'ln')
    .replace(/\b(court)\b/g, 'ct')
    .replace(/\b(boulevard)\b/g, 'blvd')
    .replace(/\b(place)\b/g, 'pl')
    .replace(/[^a-z0-9]/g, '');
}

function distanceFeet(lat1, lng1, lat2, lng2) {
  if (![lat1, lng1, lat2, lng2].every((v) => Number.isFinite(Number(v)))) return Infinity;
  const R = 20902231;
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLng = ((Number(lng2) - Number(lng1)) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((Number(lat1) * Math.PI) / 180) *
      Math.cos((Number(lat2) * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function canManageLocation(base44, user, location) {
  if (!user || !location) return false;
  if (String(location.owner_user_id || '') === String(user.id)) return true;
  if (String(location.created_by_id || '') === String(user.id)) return true;
  return hasActiveAdminAccess(base44, user);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');

    if (action === 'admin_patch') {
      if (!(await hasActiveAdminAccess(base44, user))) {
        return Response.json({ error: 'Active Yardit admin access is required.' }, { status: 403 });
      }

      const locationId = String(body.location_id || '');
      if (!locationId) return Response.json({ error: 'Missing location_id' }, { status: 400 });

      const rows = await base44.asServiceRole.entities.Location.filter({ id: locationId }).catch(() => []);
      const location = rows?.[0];
      if (!location) return Response.json({ error: 'Location not found' }, { status: 404 });

      const patch = pickAllowedPatch(body.patch || {});
      if (!Object.keys(patch).length) return Response.json({ error: 'No allowed fields to update.' }, { status: 400 });

      await base44.asServiceRole.entities.Location.update(locationId, patch);
      return Response.json({ ok: true, location: { ...location, ...patch } });
    }

    if (action === 'cancel_halloween_location') {
      const locationId = String(body.location_id || '');
      if (!locationId) return Response.json({ error: 'Missing location_id' }, { status: 400 });

      const rows = await base44.asServiceRole.entities.Location.filter({ id: locationId }).catch(() => []);
      const location = rows?.[0];
      if (!location || location.type !== 'halloween_candy') {
        return Response.json({ error: 'Halloween Spot not found.' }, { status: 404 });
      }
      if (!(await canManageLocation(base44, user, location))) {
        return Response.json({ error: 'You do not have permission to cancel this Halloween Spot.' }, { status: 403 });
      }

      const now = new Date().toISOString();
      await base44.asServiceRole.entities.Location.update(location.id, { status: 'inactive' });

      const assistedRows = await base44.asServiceRole.entities.AssistedHalloweenSpot.list('-created_date', 500).catch(() => []);
      const targetAddress = normalizeAddress(location.address || [location.street_address, location.city, location.state, location.zip_code].filter(Boolean).join(' '));
      const related = (assistedRows || []).filter((record) => {
        if (!['pending_owner_approval', 'assisted_active_unclaimed'].includes(record.assisted_status)) return false;
        if (String(record.location_id || '') === String(location.id)) return true;
        const assistedAddress = normalizeAddress([
          record.property_address,
          record.property_city,
          record.property_state,
          record.property_zip,
        ].filter(Boolean).join(' '));
        const sameAddress = !!targetAddress && assistedAddress === targetAddress;
        const sameCoordinates = distanceFeet(
          location.latitude,
          location.longitude,
          record.latitude,
          record.longitude
        ) <= 75;
        return sameAddress || sameCoordinates;
      });

      for (const record of related) {
        await base44.asServiceRole.entities.AssistedHalloweenSpot.update(record.id, {
          assisted_status: 'assisted_declined',
          owner_declined_at: now,
          assisted_qr_token: `__cancelled__${record.id}`,
        }).catch(() => {});
        if (record.location_id && String(record.location_id) !== String(location.id)) {
          await base44.asServiceRole.entities.Location.update(record.location_id, { status: 'inactive' }).catch(() => {});
        }
      }

      return Response.json({ ok: true, cancelled: true, assisted_records_closed: related.length });
    }

    if (action === 'claim_pending_ownership') {
      const reservationId = String(body.reservation_id || '');
      if (!reservationId) return Response.json({ error: 'Missing reservation_id' }, { status: 400 });

      const reservations = await base44.asServiceRole.entities.PendingHalloweenOwnership.filter({ id: reservationId }).catch(() => []);
      const reservation = reservations?.[0];
      if (!reservation || reservation.status !== 'pending') {
        return Response.json({ error: 'Pending Halloween ownership reservation not found.' }, { status: 404 });
      }

      if (normalizeEmail(reservation.email) !== normalizeEmail(user.email)) {
        return Response.json({ error: 'This reservation does not belong to your account.' }, { status: 403 });
      }

      const locations = await base44.asServiceRole.entities.Location.filter({ id: reservation.location_id }).catch(() => []);
      const location = locations?.[0];
      if (!location) return Response.json({ error: 'Halloween Spot not found.' }, { status: 404 });

      const now = new Date().toISOString();
      await base44.asServiceRole.entities.Location.update(location.id, {
        owner_user_id: user.id,
        ownership_claimed_at: now,
      });
      await base44.asServiceRole.entities.PendingHalloweenOwnership.update(reservation.id, {
        status: 'claimed',
        claimed_user_id: user.id,
        claimed_at: now,
      });

      return Response.json({ ok: true, location_id: location.id });
    }

    if (action === 'recalculate_holiday_rating') {
      const locationId = String(body.location_id || '');
      const seasonYear = Number(body.season_year);
      if (!locationId || !Number.isInteger(seasonYear)) {
        return Response.json({ error: 'Missing location_id or season_year.' }, { status: 400 });
      }

      const locations = await base44.asServiceRole.entities.Location.filter({ id: locationId }).catch(() => []);
      const location = locations?.[0];
      if (!location || location.type !== 'holiday_lights') {
        return Response.json({ error: 'Holiday lights location not found.' }, { status: 404 });
      }

      const ratings = await base44.asServiceRole.entities.LightRating.filter({
        listing_id: locationId,
        season_year: seasonYear,
      }).catch(() => []);

      const total = (ratings || []).reduce((sum, rating) => sum + Number(rating.rating_value || 0), 0);
      const count = ratings?.length || 0;
      const average = count ? total / count : 0;

      await base44.asServiceRole.entities.Location.update(locationId, {
        average_rating: average,
        ratings_count: count,
        holiday_score: total,
      });

      return Response.json({ ok: true, average_rating: average, ratings_count: count, holiday_score: total });
    }

    if (action === 'apply_holiday_report_threshold') {
      const locationId = String(body.location_id || '');
      const reason = String(body.reason || '');
      if (!locationId || !['YARD_SALE_INSTEAD', 'VENDOR_ACTIVITY'].includes(reason)) {
        return Response.json({ error: 'Invalid report threshold request.' }, { status: 400 });
      }

      const locations = await base44.asServiceRole.entities.Location.filter({ id: locationId }).catch(() => []);
      const location = locations?.[0];
      if (!location || location.type !== 'holiday_lights') {
        return Response.json({ error: 'Holiday lights location not found.' }, { status: 404 });
      }

      const reports = await base44.asServiceRole.entities.LightReport.filter({
        listing_id: locationId,
        reason,
      }).catch(() => []);

      if ((reports?.length || 0) >= 2) {
        await base44.asServiceRole.entities.Location.update(locationId, {
          status: 'under_review',
          display_active: false,
        });
        return Response.json({ ok: true, hidden: true, report_count: reports.length });
      }

      return Response.json({ ok: true, hidden: false, report_count: reports?.length || 0 });
    }

    return Response.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('manageSeasonalLocation error:', error?.message || error);
    return Response.json({ error: error?.message || 'Seasonal location action failed.' }, { status: 500 });
  }
});
