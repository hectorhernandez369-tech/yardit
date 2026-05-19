import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { code, tier, vendor_account_id } = body;

    if (!code || !tier) {
      return Response.json({ valid: false, error: 'Code and tier are required.' }, { status: 400 });
    }

    // Find the code (case-insensitive by searching all and matching)
    const allCodes = await base44.asServiceRole.entities.VendorPromoCode.filter({ code: code.toUpperCase() });
    const promo = allCodes?.[0];

    if (!promo) {
      return Response.json({ valid: false, error: 'Promo code not found.' });
    }

    // Active check
    if (!promo.active) {
      return Response.json({ valid: false, error: 'This promo code is no longer active.' });
    }

    // Date range check
    const now = new Date();
    if (promo.valid_start_date && new Date(promo.valid_start_date) > now) {
      return Response.json({ valid: false, error: 'This promo code is not yet valid.' });
    }
    if (promo.valid_end_date && new Date(promo.valid_end_date) < now) {
      return Response.json({ valid: false, error: 'This promo code has expired.' });
    }

    // Tier eligibility
    if (promo.applies_to_tiers && promo.applies_to_tiers.length > 0) {
      if (!promo.applies_to_tiers.includes(tier)) {
        return Response.json({ valid: false, error: `This promo code is not valid for the ${tier} plan.` });
      }
    }

    // Max redemptions
    if (promo.max_redemptions != null && (promo.redemptions_used || 0) >= promo.max_redemptions) {
      return Response.json({ valid: false, error: 'This promo code has reached its maximum uses.' });
    }

    // One use per user
    if (promo.one_use_per_user) {
      const existing = await base44.asServiceRole.entities.VendorPromoRedemption.filter({
        promo_code_id: promo.id,
        user_id: user.id,
      });
      if (existing && existing.length > 0) {
        return Response.json({ valid: false, error: 'You have already used this promo code.' });
      }
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
      },
    });
  } catch (error) {
    console.error('validateVendorPromoCode error:', error?.message || error);
    return Response.json({ valid: false, error: 'Validation failed. Please try again.' }, { status: 500 });
  }
});