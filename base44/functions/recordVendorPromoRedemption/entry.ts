import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { promo_code_id, promo_code, vendor_account_id, tier_selected, discount_type, discount_value, discount_applied_dollars, checkout_session_id } = body;

    if (!promo_code_id || !vendor_account_id || !tier_selected) {
      return Response.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Create redemption record
    const redemption = await base44.asServiceRole.entities.VendorPromoRedemption.create({
      promo_code_id,
      promo_code: promo_code || '',
      user_id: user.id,
      user_email: user.email || '',
      vendor_account_id,
      tier_selected,
      discount_type: discount_type || '',
      discount_value: discount_value || 0,
      discount_applied_dollars: discount_applied_dollars || 0,
      redeemed_at: new Date().toISOString(),
      checkout_session_id: checkout_session_id || null,
    });

    // Increment redemptions_used on the promo code
    const promoCodes = await base44.asServiceRole.entities.VendorPromoCode.filter({ id: promo_code_id });
    const promoCode = promoCodes?.[0];
    if (promoCode) {
      const newCount = (promoCode.redemptions_used || 0) + 1;
      await base44.asServiceRole.entities.VendorPromoCode.update(promo_code_id, {
        redemptions_used: newCount,
        updated_at: new Date().toISOString(),
      });
      // Auto-deactivate if max redemptions reached
      if (promoCode.max_redemptions != null && newCount >= promoCode.max_redemptions) {
        await base44.asServiceRole.entities.VendorPromoCode.update(promo_code_id, { active: false });
      }
    }

    console.log('Promo redemption recorded', { promo_code_id, userId: user.id, tier_selected });
    return Response.json({ ok: true, redemption_id: redemption.id });
  } catch (error) {
    console.error('recordVendorPromoRedemption error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to record redemption.' }, { status: 500 });
  }
});