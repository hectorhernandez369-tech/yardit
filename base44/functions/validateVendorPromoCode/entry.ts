import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

function checkGeoLimit(promo, vendorLat, vendorLng) {
  if (!promo.geographic_limit_enabled) return { valid: true, status: 'skipped', distance: null };
  const geoType = promo.geographic_limit_type || 'none';
  if (geoType === 'none') return { valid: true, status: 'skipped', distance: null };

  if (geoType === 'city_zip') {
    // No coordinate check for city_zip — handled at listing/vendor level via address text
    return { valid: true, status: 'skipped', distance: null };
  }

  if (geoType === 'radius') {
    if (!promo.geo_center_lat || !promo.geo_center_lng || !promo.geo_radius_miles) {
      return { valid: true, status: 'skipped', distance: null };
    }
    if (!vendorLat || !vendorLng) {
      // No coordinates provided — skip silently (can't validate)
      return { valid: true, status: 'skipped', distance: null };
    }
    const dist = haversineDistance(promo.geo_center_lat, promo.geo_center_lng, vendorLat, vendorLng);
    if (dist > promo.geo_radius_miles) {
      return { valid: false, status: 'failed', distance: Math.round(dist * 10) / 10 };
    }
    return { valid: true, status: 'passed', distance: Math.round(dist * 10) / 10 };
  }

  return { valid: true, status: 'skipped', distance: null };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ valid: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { code, tier, vendor_lat, vendor_lng } = body;

    if (!code || !tier) {
      return Response.json({ valid: false, error: 'Code and tier are required.' }, { status: 400 });
    }

    const allCodes = await base44.asServiceRole.entities.VendorPromoCode.filter({ code: code.toUpperCase() });
    const promo = allCodes?.[0];

    if (!promo) {
      return Response.json({ valid: false, error: 'Promo code not found.' });
    }

    if (!promo.active) {
      return Response.json({ valid: false, error: 'This promo code is no longer active.' });
    }

    const now = new Date();

    if (promo.valid_start_date && new Date(promo.valid_start_date) > now) {
      return Response.json({ valid: false, error: 'This promo code is not yet valid.' });
    }

    const redeemCutoff = promo.redeem_by_date || promo.valid_end_date;
    if (redeemCutoff && new Date(redeemCutoff) < now) {
      return Response.json({ valid: false, error: 'This promo code is no longer accepting new redemptions.' });
    }

    if (promo.applies_to_tiers && promo.applies_to_tiers.length > 0) {
      if (!promo.applies_to_tiers.includes(tier)) {
        return Response.json({ valid: false, error: `This promo code is not valid for the ${tier} plan.` });
      }
    }

    const currentRedemptions = promo.current_redemptions ?? promo.redemptions_used ?? 0;
    if (promo.max_redemptions != null && currentRedemptions >= promo.max_redemptions) {
      return Response.json({ valid: false, error: 'Promo code has reached maximum redemptions.' });
    }

    if (promo.one_use_per_user) {
      const existing = await base44.asServiceRole.entities.VendorPromoRedemption.filter({
        promo_code_id: promo.id,
        user_id: user.id,
      });
      const activeExisting = existing?.filter(r => r.redemption_status === 'active' || !r.redemption_status);
      if (activeExisting && activeExisting.length > 0) {
        return Response.json({ valid: false, error: 'You have already used this promo code.' });
      }
    }

    // Geographic validation
    const geoCheck = checkGeoLimit(promo, vendor_lat, vendor_lng);
    if (!geoCheck.valid) {
      return Response.json({
        valid: false,
        error: 'This promo code is not available in your area.',
        geo_distance_miles: geoCheck.distance,
      });
    }

    // Compute benefit expiration for display
    let benefitsExpireAt = null;
    if (promo.promotion_duration_type === 'preset_days' && promo.promotion_duration_days) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + promo.promotion_duration_days);
      benefitsExpireAt = expDate.toISOString();
    } else if (promo.promotion_duration_type === 'fixed_end_date' && promo.promotion_end_date) {
      benefitsExpireAt = promo.promotion_end_date;
    }

    console.log('Promo code validated', { code: promo.code, userId: user.id, tier, geoStatus: geoCheck.status });
    return Response.json({
      valid: true,
      geo_validation_status: geoCheck.status,
      geo_validation_distance_miles: geoCheck.distance,
      promo: {
        id: promo.id,
        code: promo.code,
        promo_name: promo.promo_name,
        description: promo.description,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        applies_to_tiers: promo.applies_to_tiers,
        promotion_duration_type: promo.promotion_duration_type,
        promotion_duration_days: promo.promotion_duration_days,
        promotion_end_date: promo.promotion_end_date,
        is_founding_vendor: promo.is_founding_vendor,
        founding_recurring_price: promo.founding_recurring_price,
        founding_forfeits_on_cancel: promo.founding_forfeits_on_cancel,
        benefits_expire_at: benefitsExpireAt,
        redeem_by_date: promo.redeem_by_date,
      },
    });
  } catch (error) {
    console.error('validateVendorPromoCode error:', error?.message || error);
    return Response.json({ valid: false, error: 'Validation failed. Please try again.' }, { status: 500 });
  }
});