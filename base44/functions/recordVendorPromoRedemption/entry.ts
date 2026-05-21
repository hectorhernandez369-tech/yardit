import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      promo_code_id, promo_code, vendor_account_id, vendor_business_name,
      tier_selected, discount_type, discount_value, discount_applied_dollars,
      checkout_session_id, benefits_expire_at
    } = body;

    if (!promo_code_id || !vendor_account_id || !tier_selected) {
      return Response.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Fetch promo to compute benefits_expire_at if not passed
    const promoCodes = await base44.asServiceRole.entities.VendorPromoCode.filter({ id: promo_code_id });
    const promoCode = promoCodes?.[0];

    let computedExpiry = benefits_expire_at || null;
    if (!computedExpiry && promoCode) {
      const now = new Date();
      if (promoCode.promotion_duration_type === 'preset_days' && promoCode.promotion_duration_days) {
        const expDate = new Date(now);
        expDate.setDate(expDate.getDate() + promoCode.promotion_duration_days);
        computedExpiry = expDate.toISOString();
      } else if (promoCode.promotion_duration_type === 'fixed_end_date' && promoCode.promotion_end_date) {
        computedExpiry = promoCode.promotion_end_date;
      }
    }

    // Create redemption record
    const redemption = await base44.asServiceRole.entities.VendorPromoRedemption.create({
      promo_code_id,
      promo_code: promo_code || '',
      user_id: user.id,
      user_email: user.email || '',
      vendor_account_id,
      vendor_business_name: vendor_business_name || '',
      tier_selected,
      discount_type: discount_type || '',
      discount_value: discount_value || 0,
      discount_applied_dollars: discount_applied_dollars || 0,
      redeemed_at: new Date().toISOString(),
      benefits_expire_at: computedExpiry,
      redemption_status: 'active',
      checkout_session_id: checkout_session_id || null,
    });

    // Update promo code counters
    if (promoCode) {
      const newRedemptionsUsed = (promoCode.redemptions_used || 0) + 1;
      const newCurrentRedemptions = (promoCode.current_redemptions ?? promoCode.redemptions_used ?? 0) + 1;
      const updatePayload = {
        redemptions_used: newRedemptionsUsed,
        current_redemptions: newCurrentRedemptions,
        updated_at: new Date().toISOString(),
      };
      // Auto-deactivate only if max reached AND no slot recovery allowed
      if (promoCode.max_redemptions != null && newCurrentRedemptions >= promoCode.max_redemptions && !promoCode.allow_slot_recovery) {
        updatePayload.active = false;
      }
      await base44.asServiceRole.entities.VendorPromoCode.update(promo_code_id, updatePayload);
    }

    console.log('Promo redemption recorded', { promo_code_id, userId: user.id, tier_selected });
    return Response.json({ ok: true, redemption_id: redemption.id });
  } catch (error) {
    console.error('recordVendorPromoRedemption error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to record redemption.' }, { status: 500 });
  }
});