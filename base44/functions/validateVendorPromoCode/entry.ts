import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ valid: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { code, tier } = body;

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

    // Valid start date check
    if (promo.valid_start_date && new Date(promo.valid_start_date) > now) {
      return Response.json({ valid: false, error: 'This promo code is not yet valid.' });
    }

    // Redeem window check (prefer redeem_by_date, fall back to valid_end_date)
    const redeemCutoff = promo.redeem_by_date || promo.valid_end_date;
    if (redeemCutoff && new Date(redeemCutoff) < now) {
      return Response.json({ valid: false, error: 'This promo code is no longer accepting new redemptions.' });
    }

    // Tier eligibility
    if (promo.applies_to_tiers && promo.applies_to_tiers.length > 0) {
      if (!promo.applies_to_tiers.includes(tier)) {
        return Response.json({ valid: false, error: `This promo code is not valid for the ${tier} plan.` });
      }
    }

    // Max redemptions check using current_redemptions
    const currentRedemptions = promo.current_redemptions ?? promo.redemptions_used ?? 0;
    if (promo.max_redemptions != null && currentRedemptions >= promo.max_redemptions) {
      return Response.json({ valid: false, error: 'Promo code has reached maximum redemptions.' });
    }

    // One use per user
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

    // Compute benefit expiration for display
    let benefitsExpireAt = null;
    if (promo.promotion_duration_type === 'preset_days' && promo.promotion_duration_days) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + promo.promotion_duration_days);
      benefitsExpireAt = expDate.toISOString();
    } else if (promo.promotion_duration_type === 'fixed_end_date' && promo.promotion_end_date) {
      benefitsExpireAt = promo.promotion_end_date;
    }

    console.log('Promo code validated', { code: promo.code, userId: user.id, tier });
    return Response.json({
      valid: true,
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