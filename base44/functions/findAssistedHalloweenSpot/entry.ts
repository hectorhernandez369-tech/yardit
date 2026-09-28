import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function normalizeAddress(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/\b(street)\b/g, 'st')
    .replace(/\b(avenue)\b/g, 'ave')
    .replace(/\b(road)\b/g, 'rd')
    .replace(/\b(drive)\b/g, 'dr')
    .replace(/\b(lane)\b/g, 'ln')
    .replace(/\b(court)\b/g, 'ct')
    .replace(/\b(boulevard)\b/g, 'blvd')
    .replace(/\b(place)\b/g, 'pl')
    .replace(/\b(california)\b/g, 'ca')
    .replace(/[^a-z0-9]/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const rawAddress = String(payload.address || '').trim();

    if (rawAddress.length < 5) {
      return Response.json({ status: 'invalid', error: 'Enter the property address.' }, { status: 400 });
    }

    const needle = normalizeAddress(rawAddress);
    const records = await base44.asServiceRole.entities.AssistedHalloweenSpot.list('-created_date', 500);

    const eligible = (records || []).filter((record) =>
      ['pending_owner_approval', 'assisted_active_unclaimed', 'claimed_active'].includes(record.assisted_status)
    );

    const candidates = eligible.filter((record) => {
      const street = normalizeAddress(record.property_address || '');
      const full = normalizeAddress([
        record.property_address,
        record.property_city,
        record.property_state,
        record.property_zip,
      ].filter(Boolean).join(' '));

      if (!street) return false;
      return needle === street || needle === full || needle.includes(street) || full.includes(needle);
    });

    if (candidates.length === 0) {
      return Response.json({ status: 'not_found' });
    }

    if (candidates.length > 1) {
      const exact = candidates.filter((record) => {
        const full = normalizeAddress([
          record.property_address,
          record.property_city,
          record.property_state,
          record.property_zip,
        ].filter(Boolean).join(' '));
        return full === needle;
      });
      if (exact.length !== 1) {
        return Response.json({
          status: 'multiple',
          message: 'More than one assisted Halloween Spot matched. Add the city or ZIP code.',
        });
      }
      candidates.splice(0, candidates.length, exact[0]);
    }

    const assisted = candidates[0];
    const locations = await base44.asServiceRole.entities.Location.filter({ id: assisted.location_id });
    const spot = locations?.[0] || null;
    if (!spot) return Response.json({ status: 'not_found' });

    const expiresAt = assisted.assisted_qr_expires_at ? new Date(assisted.assisted_qr_expires_at) : null;
    if (assisted.assisted_status === 'pending_owner_approval' && expiresAt && expiresAt <= new Date()) {
      await base44.asServiceRole.entities.AssistedHalloweenSpot.update(assisted.id, {
        assisted_status: 'assisted_expired',
      }).catch(() => {});
      return Response.json({ status: 'expired' });
    }

    return Response.json({
      status: assisted.assisted_status === 'claimed_active' ? 'claimed' :
        assisted.assisted_status === 'assisted_active_unclaimed' ? 'approved' : 'found',
      token: assisted.assisted_qr_token,
      spot: {
        id: spot.id,
        title: spot.display_title || spot.title || 'Halloween Spot',
        address: spot.address || [spot.street_address, spot.city, spot.state, spot.zip_code].filter(Boolean).join(', '),
        city: spot.city || '',
        state: spot.state || '',
        zip_code: spot.zip_code || '',
        description: spot.description || '',
        photos: spot.photos || [],
        halloween_spot_type: spot.halloween_spot_type || spot.halloween_icon_key || 'halloween_decorations',
        halloween_start_date: spot.halloween_start_date || '',
        halloween_end_date: spot.halloween_end_date || '',
        halloween_start_time: spot.halloween_start_time || '',
        halloween_end_time: spot.halloween_end_time || '',
        halloween_tags: spot.halloween_tags || [],
        halloween_candy_available: spot.halloween_candy_available === true,
        halloween_featured_badge: spot.halloween_featured_badge || 'none',
      },
    });
  } catch (error) {
    console.error('findAssistedHalloweenSpot error:', error?.message || error);
    return Response.json({ status: 'error', error: 'Could not search Halloween Spots.' }, { status: 500 });
  }
});
