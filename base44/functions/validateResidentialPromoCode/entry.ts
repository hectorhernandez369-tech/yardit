import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Validate a residential promo code.
 * Body: { code, user_id, listing_location: { state, county, city, town, zip }, selected_tier, listing_price_cents }
 * Returns: { valid, reason, promoCode, discountPercent, discountAmount, finalAmount, discountBucket }
 */
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

    if (!rawCode) {
      return Response.json({ valid: false, reason: 'No promo code provided.' });
    }

    // Fetch all active promo codes matching this code
    const allCodes = await base44.asServiceRole.entities.ResidentialPromoCode.filter({ code: rawCode });
    const promoCode = (allCodes || []).find(c => c.code === rawCode);

    if (!promoCode) {
      return Response.json({ valid: false, reason: 'Promo code not found.' });
    }

    // Check status
    if (promoCode.status !== 'active') {
      return Response.json({ valid: false, reason: `Promo code is ${promoCode.status}.` });
    }

    // Check date window
    const now = new Date();
    if (promoCode.starts_at && new Date(promoCode.starts_at) > now) {
      return Response.json({ valid: false, reason: 'Promo code is not yet active.' });
    }
    if (promoCode.expires_at && new Date(promoCode.expires_at) < now) {
      return Response.json({ valid: false, reason: 'Promo code has expired.' });
    }

    // Check tier eligibility
    if (promoCode.applies_to_tiers && promoCode.applies_to_tiers.length > 0) {
      if (!promoCode.applies_to_tiers.includes(selectedTier)) {
        return Response.json({ valid: false, reason: `Promo code does not apply to ${selectedTier} listings.` });
      }
    }

    // Free tier cannot get a cash discount
    if (selectedTier === 'free') {
      return Response.json({ valid: false, reason: 'Promo codes cannot be applied to free listings.' });
    }

    // Check coverage
    const coverageCheck = checkCoverage(promoCode, listingLocation);
    if (!coverageCheck.valid) {
      return Response.json({ valid: false, reason: coverageCheck.reason });
    }

    // Check total uses
    if (promoCode.max_total_uses != null && promoCode.total_used_count >= promoCode.max_total_uses) {
      return Response.json({ valid: false, reason: 'Promo code has reached its usage limit.' });
    }

    // Check per-user limit
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

    // Determine discount bucket
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

    // Calculate amounts
    let discountAmount = Math.round((listingPriceDollars * discountPercent / 100) * 100) / 100;
    let finalAmount = Math.max(0, Math.round((listingPriceDollars - discountAmount) * 100) / 100);
    // Ensure discount doesn't exceed price
    if (discountAmount > listingPriceDollars) {
      discountAmount = listingPriceDollars;
    }

    console.log(`[PROMO] Code: ${rawCode} | Tier: ${selectedTier} | Bucket: ${discountBucket} | Discount: ${discountPercent}% | Final: $${finalAmount}`);

    return Response.json({
      valid: true,
      reason: 'Promo code applied successfully.',
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        title: promoCode.title,
      },
      discountPercent,
      discountAmount,
      finalAmount,
      discountBucket,
      originalAmount: listingPriceDollars,
    });
  } catch (error) {
    console.error('[PROMO] Validation error:', error?.message || error);
    return Response.json({ valid: false, reason: 'Unable to validate promo code. Please try again.' }, { status: 500 });
  }
});

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