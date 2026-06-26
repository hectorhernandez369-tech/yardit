import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Validate a residential promo code.
 * Body: { code, user_id, listing_location: { state, county, city, town, zip, lat, lng }, selected_tier, listing_price_cents }
 * Returns: { valid, reason, promoCode, discountPercent, discountAmount, finalAmount, discountBucket }
 */

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointInPolygon(lat, lng, points = []) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || points.length < 3) return false;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = Number(points[i].lng);
    const yi = Number(points[i].lat);
    const xj = Number(points[j].lng);
    const yj = Number(points[j].lat);
    const intersects = ((yi > lat) !== (yj > lat)) && (lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function shiftYmd(ymd, dayDelta) {
  const [year, month, day] = String(ymd || '').slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + dayDelta);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function buildEarlyVisibilityResult(promoCode, listingStartDate, normalizedCode) {
  const days = Math.max(0, Number(promoCode?.early_visibility_days || 0));
  if (promoCode?.early_visibility_enabled !== true || days <= 0 || !listingStartDate) {
    return { enabled: false, days: 0, visibility_start_date: '', promo_code: '' };
  }
  const startDate = String(listingStartDate).slice(0, 10);
  let visibilityStartDate = shiftYmd(startDate, -days);
  if (visibilityStartDate > startDate) visibilityStartDate = startDate;
  return { enabled: true, days, visibility_start_date: visibilityStartDate, promo_code: promoCode?.code || normalizedCode };
}

function checkGeoLimit(promo, loc) {
  if (!promo.geographic_limit_enabled) return { valid: true, status: 'skipped', distance: null };
  const geoType = promo.geographic_limit_type || 'none';
  if (geoType === 'none') return { valid: true, status: 'skipped', distance: null };

  if (geoType === 'city_zip') {
    const normalize = (s) => String(s || '').trim().toLowerCase();
    const eligible_cities = (promo.eligible_cities || []).map(normalize);
    const eligible_zips = (promo.eligible_zips || []).map(normalize);

    const locCity = normalize(loc.city);
    const locTown = normalize(loc.town);
    const locZip = normalize(loc.zip);

    const cityMatch = eligible_cities.length === 0 || eligible_cities.includes(locCity) || eligible_cities.includes(locTown);
    const zipMatch = eligible_zips.length === 0 || eligible_zips.includes(locZip);

    if (eligible_cities.length > 0 && eligible_zips.length > 0) {
      if (!cityMatch && !zipMatch) return { valid: false, status: 'failed', distance: null };
    } else if (eligible_cities.length > 0 && !cityMatch) {
      return { valid: false, status: 'failed', distance: null };
    } else if (eligible_zips.length > 0 && !zipMatch) {
      return { valid: false, status: 'failed', distance: null };
    }
    return { valid: true, status: 'passed', distance: null };
  }

  if (geoType === 'radius') {
    if (!promo.geo_center_lat || !promo.geo_center_lng || !promo.geo_radius_miles) {
      return { valid: false, status: 'failed', distance: null };
    }
    const listingLat = Number(loc.lat);
    const listingLng = Number(loc.lng);
    if (!Number.isFinite(listingLat) || !Number.isFinite(listingLng)) {
      return { valid: false, status: 'failed', distance: null };
    }
    const dist = haversineDistance(promo.geo_center_lat, promo.geo_center_lng, listingLat, listingLng);
    if (dist > promo.geo_radius_miles) {
      return { valid: false, status: 'failed', distance: Math.round(dist * 10) / 10 };
    }
    return { valid: true, status: 'passed', distance: Math.round(dist * 10) / 10 };
  }

  if (geoType === 'polygon') {
    const listingLat = Number(loc.lat);
    const listingLng = Number(loc.lng);
    const points = Array.isArray(promo.geo_polygon_coordinates) ? promo.geo_polygon_coordinates : [];
    if (!pointInPolygon(listingLat, listingLng, points)) {
      return { valid: false, status: 'failed', distance: null };
    }
    return { valid: true, status: 'passed', distance: null };
  }

  return { valid: true, status: 'skipped', distance: null };
}

function checkCoverage(promoCode, loc) {
  const coverageType = promoCode.coverage_type || 'nationwide';

  if (coverageType === 'nationwide') return { valid: true };

  const normalize = (s) => String(s || '').trim().toLowerCase();
  const locState = normalize(loc.state);
  const locCounty = normalize(loc.county);
  const locCity = normalize(loc.city);
  const locTown = normalize(loc.town);
  const locZip = normalize(loc.zip);

  if (coverageType === 'custom' && promoCode.coverage_rules) {
    const rules = promoCode.coverage_rules;
    const states = (rules.states || []).map(normalize);
    const counties = (rules.counties || []).map(normalize);
    const cities = (rules.cities || []).map(normalize);
    const zips = (rules.zips || []).map(normalize);

    if (states.length > 0 && !states.includes(locState)) {
      return { valid: false, reason: 'Promo code is not available in your state.' };
    }
    if (counties.length > 0 && !counties.includes(locCounty)) {
      return { valid: false, reason: 'Promo code is not available in your county.' };
    }
    if (cities.length > 0 && !cities.includes(locCity) && !cities.includes(locTown)) {
      return { valid: false, reason: 'Promo code is not available in your city.' };
    }
    if (zips.length > 0 && !zips.includes(locZip)) {
      return { valid: false, reason: 'Promo code is not available for your ZIP code.' };
    }
    return { valid: true };
  }

  if (coverageType === 'state') {
    if (!promoCode.coverage_state || normalize(promoCode.coverage_state) !== locState) {
      return { valid: false, reason: 'Promo code is not available in your state.' };
    }
  }
  if (coverageType === 'county') {
    if (!promoCode.coverage_county || normalize(promoCode.coverage_county) !== locCounty) {
      return { valid: false, reason: 'Promo code is not available in your county.' };
    }
  }
  if (coverageType === 'city' || coverageType === 'town') {
    const target = normalize(promoCode.coverage_city || promoCode.coverage_town || '');
    if (!target || (target !== locCity && target !== locTown)) {
      return { valid: false, reason: 'Promo code is not available in your city/town.' };
    }
  }
  if (coverageType === 'zip') {
    if (!promoCode.coverage_zip || normalize(promoCode.coverage_zip) !== locZip) {
      return { valid: false, reason: 'Promo code is not available for your ZIP code.' };
    }
  }

  return { valid: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const rawCode = String(body?.code || '').trim().toUpperCase();
    const userId = body?.user_id || '';
    const listingLocation = body?.listing_location || {};
    const selectedTier = String(body?.selected_tier || '').toLowerCase();
    const listingPriceCents = Number(body?.listing_price_cents || 0);
    const listingPriceDollars = listingPriceCents / 100;
    const selectedRangeStartDate = body?.selected_range_start_date || body?.selectedRangeStartDate || body?.listing_start_date || '';

    if (!rawCode) {
      return Response.json({ valid: false, reason: 'No promo code provided.' });
    }

    const allCodes = await base44.asServiceRole.entities.ResidentialPromoCode.filter({ code: rawCode });
    const promoCode = (allCodes || []).find(c => c.code === rawCode);

    if (!promoCode) {
      return Response.json({ valid: false, reason: 'Promo code not found.' });
    }

    if (promoCode.status !== 'active') {
      return Response.json({ valid: false, reason: `Promo code is ${promoCode.status}.` });
    }

    const now = new Date();
    if (promoCode.starts_at && new Date(promoCode.starts_at) > now) {
      return Response.json({ valid: false, reason: 'Promo code is not yet active.' });
    }
    if (promoCode.expires_at && new Date(promoCode.expires_at) < now) {
      return Response.json({ valid: false, reason: 'Promo code has expired.' });
    }

    if (promoCode.applies_to_tiers && promoCode.applies_to_tiers.length > 0) {
      if (!promoCode.applies_to_tiers.includes(selectedTier)) {
        return Response.json({ valid: false, reason: `Promo code does not apply to ${selectedTier} listings.` });
      }
    }

    if (selectedTier === 'free') {
      return Response.json({ valid: false, reason: 'Promo codes cannot be applied to free listings.' });
    }

    // Legacy address coverage check
    const coverageCheck = checkCoverage(promoCode, listingLocation);
    if (!coverageCheck.valid) {
      return Response.json({ valid: false, reason: coverageCheck.reason });
    }

    // New geo limit check (city_zip or radius)
    const geoCheck = checkGeoLimit(promoCode, listingLocation);
    if (!geoCheck.valid) {
      return Response.json({
        valid: false,
        reason: 'This promo code is not available in your area.',
        geo_distance_miles: geoCheck.distance,
      });
    }

    if (promoCode.max_total_uses != null && promoCode.total_used_count >= promoCode.max_total_uses) {
      return Response.json({ valid: false, reason: 'Promo code has reached its usage limit.' });
    }

    if (userId) {
      const perUserLimit = Number(promoCode.per_user_limit || 1);
      const userRedemptions = await base44.asServiceRole.entities.ResidentialPromoRedemption.filter({
        promo_code_id: promoCode.id,
        user_id: userId,
        status: 'completed'
      });
      if ((userRedemptions || []).length >= perUserLimit) {
        return Response.json({ valid: false, reason: 'You have already used this promo code.' });
      }
    }

    let discountPercent;
    let discountBucket;
    const earlyEnabled = promoCode.early_discount_enabled === true;
    const earlyUsed = Number(promoCode.early_discount_used_count || 0);
    const earlyLimit = Number(promoCode.early_discount_limit || 0);

    if (earlyEnabled && earlyUsed < earlyLimit) {
      discountPercent = Number(promoCode.early_discount_percent || 0);
      discountBucket = 'early';
    } else {
      discountPercent = Number(promoCode.default_discount_percent || 0);
      discountBucket = 'default';
    }

    let discountAmount = Math.round((listingPriceDollars * discountPercent / 100) * 100) / 100;
    let finalAmount = Math.max(0, Math.round((listingPriceDollars - discountAmount) * 100) / 100);
    if (discountAmount > listingPriceDollars) {
      discountAmount = listingPriceDollars;
    }

    console.log(`[PROMO] Code: ${rawCode} | Tier: ${selectedTier} | Bucket: ${discountBucket} | Discount: ${discountPercent}% | Final: $${finalAmount} | Geo: ${geoCheck.status}`);

    return Response.json({
      valid: true,
      reason: 'Promo code applied successfully.',
      geo_validation_status: geoCheck.status,
      geo_validation_distance_miles: geoCheck.distance,
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        title: promoCode.title,
        early_visibility_enabled: promoCode.early_visibility_enabled === true,
        early_visibility_days: Number(promoCode.early_visibility_days || 0),
      },
      earlyVisibilityEnabled: promoCode.early_visibility_enabled === true,
      earlyVisibilityDays: Number(promoCode.early_visibility_days || 0),
      discountPercent,
      discountAmount,
      finalAmount,
      discountBucket,
      originalAmount: listingPriceDollars,
      earlyVisibility: buildEarlyVisibilityResult(promoCode, selectedRangeStartDate, rawCode),
    });
  } catch (error) {
    console.error('[PROMO] Validation error:', error?.message || error);
    return Response.json({ valid: false, reason: 'Unable to validate promo code. Please try again.' }, { status: 500 });
  }
});