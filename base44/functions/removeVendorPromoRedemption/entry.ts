import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { redemption_id, recover_slot } = body;

    if (!redemption_id) {
      return Response.json({ error: 'redemption_id is required.' }, { status: 400 });
    }

    // Fetch redemption
    const redemptions = await base44.asServiceRole.entities.VendorPromoRedemption.filter({ id: redemption_id });
    const redemption = redemptions?.[0];
    if (!redemption) {
      return Response.json({ error: 'Redemption not found.' }, { status: 404 });
    }

    // Mark redemption as removed
    await base44.asServiceRole.entities.VendorPromoRedemption.update(redemption_id, {
      redemption_status: 'removed',
      removed_at: new Date().toISOString(),
      removed_by_admin_id: user.id,
      removed_by_admin_email: user.email,
      slot_recovered: !!recover_slot,
    });

    // Optionally recover slot
    if (recover_slot) {
      const promoCodes = await base44.asServiceRole.entities.VendorPromoCode.filter({ id: redemption.promo_code_id });
      const promoCode = promoCodes?.[0];
      if (promoCode && promoCode.allow_slot_recovery) {
        const newCount = Math.max(0, (promoCode.current_redemptions ?? 0) - 1);
        // If we recovered a slot and the code was auto-deactivated, reactivate it
        const reactivate = promoCode.max_redemptions != null && newCount < promoCode.max_redemptions && !promoCode.active;
        await base44.asServiceRole.entities.VendorPromoCode.update(redemption.promo_code_id, {
          current_redemptions: newCount,
          ...(reactivate ? { active: true } : {}),
          updated_at: new Date().toISOString(),
        });
        console.log('Slot recovered for promo', redemption.promo_code_id, 'new count:', newCount);
      } else {
        console.warn('Slot recovery requested but not allowed for promo', redemption.promo_code_id);
      }
    }

    // Audit log
    await base44.asServiceRole.entities.AdminAuditLog.create({
      admin_id: user.id,
      admin_email: user.email,
      action_type: 'vendor_promo_redemption_removed',
      target_entity_type: 'VendorPromoRedemption',
      target_entity_id: redemption_id,
      description: `Removed promo redemption ${redemption_id} (slot_recovered=${!!recover_slot})`,
    }).catch(() => {});

    console.log('Redemption removed', { redemption_id, recover_slot, admin: user.email });
    return Response.json({ ok: true });
  } catch (error) {
    console.error('removeVendorPromoRedemption error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to remove redemption.' }, { status: 500 });
  }
});