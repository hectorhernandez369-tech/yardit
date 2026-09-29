import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

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
    .replace(/\b(highway)\b/g, 'hwy')
    .replace(/\b(north)\b/g, 'n')
    .replace(/\b(south)\b/g, 's')
    .replace(/\b(east)\b/g, 'e')
    .replace(/\b(west)\b/g, 'w')
    .replace(/\b(california)\b/g, 'ca')
    .replace(/[^a-z0-9]/g, '');
}

function getHouseNumber(value = '') {
  const match = String(value).match(/\b(\d+[a-z]?)\b/i);
  return match ? match[1].toLowerCase() : '';
}

function editDistance(a = '', b = '') {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let left = i;
    let diag = i - 1;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(up + 1, left + 1, diag + cost);
      prev[j] = next;
      diag = up;
      left = next;
    }
    prev[0] = i;
  }
  return prev[b.length];
}

function fuzzySameProperty(input, street, full) {
  const inputHouse = getHouseNumber(input);
  const recordHouse = getHouseNumber(street);
  if (!inputHouse || !recordHouse || inputHouse !== recordHouse) return false;

  const needle = normalizeAddress(input);
  const normalizedStreet = normalizeAddress(street);
  const normalizedFull = normalizeAddress(full);
  const streetDistance = editDistance(needle, normalizedStreet);
  const fullDistance = editDistance(needle, normalizedFull);

  return streetDistance <= 2 || fullDistance <= 2;
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
      return needle === street ||
        needle === full ||
        needle.includes(street) ||
        full.includes(needle) ||
        fuzzySameProperty(rawAddress, record.property_address || '', [
          record.property_address,
          record.property_city,
          record.property_state,
          record.property_zip,
        ].filter(Boolean).join(' '));
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
      assistedId: assisted.id,
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