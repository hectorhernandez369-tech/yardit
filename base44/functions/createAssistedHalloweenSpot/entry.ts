import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function generateToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getAppBaseUrl(req, explicitBaseUrl = '') {
  const configured = String(Deno.env.get('APP_BASE_URL') || '').trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(configured)) return configured;
  const explicit = String(explicitBaseUrl || '').trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(explicit)) return explicit;
  const origin = req.headers.get('origin');
  if (origin && /^https?:\/\//i.test(origin)) return origin.replace(/\/$/, '');
  return new URL(req.url).origin;
}

function buildQrImageUrl(approvalUrl, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(approvalUrl)}&ecc=M`;
}

function getDistanceFeet(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every((v) => Number.isFinite(Number(v)))) return Infinity;
  const R = 20902231;
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((Number(lat1) * Math.PI) / 180) *
      Math.cos((Number(lat2) * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function ymdInPacific(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function verifiedUserCoordinates(user) {
  const data = user?.data || {};
  const verified =
    user?.primary_address_verified === true ||
    user?.address_verified === true ||
    user?.address_confirmation_status === 'confirmed' ||
    data.primary_address_verified === true ||
    data.address_verified === true ||
    data.address_confirmation_status === 'confirmed';
  const lat = user?.primary_latitude ?? user?.address_lat ?? data.primary_latitude ?? data.address_lat;
  const lng = user?.primary_longitude ?? user?.address_lng ?? data.primary_longitude ?? data.address_lng;
  if (!verified || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null;
  return { lat: Number(lat), lng: Number(lng) };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [byUserId, byEmail] = await Promise.all([
      base44.asServiceRole.entities.AdminProfile.filter({ user_id: user.id }).catch(() => []),
      base44.asServiceRole.entities.AdminProfile.filter({ email: String(user.email || '').toLowerCase() }).catch(() => []),
    ]);
    const adminProfile = [...byUserId, ...byEmail].find((p) => p?.is_active === true);
    if (!adminProfile && user.role !== 'super_master') {
      return Response.json({ error: 'Active Yardit admin access is required.' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const {
      addressText = '', city = '', state = '', zip = '', lat, lng,
      title = '', description = '', photoUrls = [],
      halloween_spot_type = 'halloween_decorations',
      halloween_tags = [], halloween_candy_available = false,
      halloween_walkthrough = false, halloween_lights = false,
      halloween_sound = false, halloween_jump_scares = false,
      halloween_suggested_age = '', halloween_host_name = '',
      halloween_admission = '', halloween_parking_notes = '',
      halloween_activities = '', halloween_start_date = '',
      halloween_end_date = '', halloween_start_time = '',
      halloween_end_time = '', full_icon_activation_time = '17:00',
      location_source = 'address_search',
      appBaseUrl: clientAppBaseUrl = '',
    } = payload;
    if (!addressText || !city || !state || !zip) {
      return Response.json({ error: 'A complete property address is required.' }, { status: 400 });
    }
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return Response.json({ error: 'Valid coordinates are required.' }, { status: 400 });
    }
    if (!title.trim()) return Response.json({ error: 'A title is required.' }, { status: 400 });
    const createdDate = ymdInPacific(new Date());
    const createdYear = Number(createdDate.slice(0, 4));
    const thisHalloween = `${createdYear}-10-31`;
    const effectiveEndDate = createdDate <= thisHalloween ? thisHalloween : `${createdYear + 1}-10-31`;
    const effectiveStartDate = halloween_spot_type === 'trick_or_treat' ? effectiveEndDate : (halloween_start_date || createdDate);
    const finalEndDate = halloween_spot_type === 'trick_or_treat' ? effectiveEndDate : (halloween_end_date || effectiveEndDate);
    const effectiveStartTime = halloween_start_time || '17:00';
    const effectiveEndTime = halloween_end_time || '22:00';
    const effectiveActivationTime = full_icon_activation_time || '17:00';

    const startDateTime = new Date(`${effectiveStartDate}T${effectiveStartTime}:00`).toISOString();
    const endDateTime = new Date(`${finalEndDate}T${effectiveEndTime}:00`).toISOString();

    const nearby = await base44.asServiceRole.entities.Location.filter({ type: 'halloween_candy' }, '-created_date', 500);
    const duplicate = (nearby || []).find((spot) => {
      if (!['active', 'draft'].includes(spot.status)) return false;
      if (getDistanceFeet(lat, lng, spot.latitude, spot.longitude) > 50) return false;
      const existingStart = spot.halloween_start_date || String(spot.start_date_time || '').slice(0, 10);
      const existingEnd = spot.halloween_end_date || String(spot.end_date_time || '').slice(0, 10) || existingStart;
      return existingStart && existingEnd && existingStart <= finalEndDate && existingEnd >= effectiveStartDate;
    });
    if (duplicate) {
      return Response.json({ error: 'There is already a Halloween Spot at or very near this property for those dates.', duplicateLocationId: duplicate.id }, { status: 409 });
    }

    const token = generateToken();
    const now = new Date();
    const expiresAt = new Date(`${finalEndDate}T23:59:59`);
    const appBaseUrl = getAppBaseUrl(req, clientAppBaseUrl);
    const approvalUrl = `${appBaseUrl}/assisted-halloween?token=${token}`;
    const qrImageUrl = buildQrImageUrl(approvalUrl);
    const fullAddress = [addressText, city, state, zip].filter(Boolean).join(', ');

    const location = await base44.asServiceRole.entities.Location.create({
      type: 'halloween_candy',
      tier: 'free',
      title: title.trim(),
      display_title: title.trim(),
      street_address: addressText,
      city,
      state,
      zip_code: zip,
      address: fullAddress,
      latitude: Number(lat),
      longitude: Number(lng),
      description,
      photos: (photoUrls || []).slice(0, 3),
      start_date_time: startDateTime,
      end_date_time: endDateTime,
      expires_at: endDateTime,
      status: 'draft',
      payment_status: 'free',
      halloween_icon_key: halloween_spot_type,
      halloween_spot_type,
      halloween_tags,
      halloween_featured_badge: 'none',
      halloween_candy_available: !!halloween_candy_available,
      halloween_walkthrough: !!halloween_walkthrough,
      halloween_lights: !!halloween_lights,
      halloween_sound: !!halloween_sound,
      halloween_jump_scares: !!halloween_jump_scares,
      halloween_suggested_age,
      halloween_host_name,
      halloween_admission,
      halloween_parking_notes,
      halloween_activities,
      halloween_start_date: effectiveStartDate,
      halloween_end_date: finalEndDate,
      halloween_start_time: effectiveStartTime,
      halloween_end_time: effectiveEndTime,
      viewing_start_time: effectiveStartTime,
      viewing_end_time: effectiveEndTime,
      full_icon_activation_time: effectiveActivationTime,
      owner_user_id: '',
    });

    let assisted;
    try {
      assisted = await base44.asServiceRole.entities.AssistedHalloweenSpot.create({
        location_id: location.id,
        assisted_status: 'pending_owner_approval',
        assisted_qr_token: token,
        approval_url: approvalUrl,
        qr_image_url: qrImageUrl,
        assisted_qr_created_at: now.toISOString(),
        assisted_qr_expires_at: expiresAt.toISOString(),
        admin_creator_id: user.id,
        admin_creator_email: user.email || '',
        property_address: addressText,
        property_city: city,
        property_state: state,
        property_zip: zip,
        latitude: Number(lat),
        longitude: Number(lng),
        location_source,
        qr_scan_count: 0,
      });
    } catch (error) {
      await base44.asServiceRole.entities.Location.delete(location.id);
      throw error;
    }

    await base44.asServiceRole.entities.AdminAuditLog.create({
      user_id: user.id,
      admin_employee_id: adminProfile?.employee_id || user.email || user.id,
      action_type: 'admin_created_assisted_halloween_spot',
      target_type: 'AssistedHalloweenSpot',
      target_id: assisted.id,
      success: true,
      metadata: JSON.stringify({ location_id: location.id, address: fullAddress, created_at: now.toISOString() }),
    }).catch(() => {});

    return Response.json({
      ok: true,
      locationId: location.id,
      assistedId: assisted.id,
      token,
      approvalUrl,
      qrImageUrl,
      expiresAt: expiresAt.toISOString(),
      saleFormattedAddress: fullAddress,
      title: location.title,
    });
  } catch (error) {
    console.error('createAssistedHalloweenSpot error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to create assisted Halloween Spot.' }, { status: 500 });
  }
});