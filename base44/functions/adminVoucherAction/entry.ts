import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const nowIso = () => new Date().toISOString();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'master', 'super_master', 'supervisor'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action, voucher_id, reason, notes } = body;

    if (!voucher_id || !action) return Response.json({ error: 'voucher_id and action required' }, { status: 400 });

    const vouchers = await base44.asServiceRole.entities.UserVoucher.filter({ id: voucher_id });
    const voucher = vouchers?.[0];
    if (!voucher) return Response.json({ error: 'Voucher not found' }, { status: 404 });

    switch (action) {
      case 'activate': {
        await base44.asServiceRole.entities.UserVoucher.update(voucher_id, {
          status: 'active',
          activated_at: nowIso(),
        });
        break;
      }
      case 'revoke': {
        await base44.asServiceRole.entities.UserVoucher.update(voucher_id, {
          status: 'revoked',
          revoked_at: nowIso(),
          revoked_reason: reason || 'Admin revocation',
        });
        break;
      }
      case 'clear_hold': {
        await base44.asServiceRole.entities.UserVoucher.update(voucher_id, {
          status: 'active',
          on_hold_reason: '',
          activated_at: voucher.activated_at || nowIso(),
        });
        // Close fraud review if exists
        const reviews = await base44.asServiceRole.entities.VoucherFraudReview.filter({ voucher_id, status: 'open' });
        for (const r of (reviews || [])) {
          await base44.asServiceRole.entities.VoucherFraudReview.update(r.id, {
            status: 'cleared',
            disposition: notes || 'Cleared by admin',
            admin_notes: notes || '',
            resolved_at: nowIso(),
          });
        }
        break;
      }
      case 'manual_redeem': {
        await base44.asServiceRole.entities.UserVoucher.update(voucher_id, {
          status: 'redeemed',
          redeemed_at: nowIso(),
          redemption_device_info: `admin:${user.email}`,
        });
        await base44.asServiceRole.entities.VoucherRedemption.create({
          voucher_id,
          campaign_id: voucher.campaign_id,
          redeemed_by_user: voucher.user_id,
          redeemed_at: nowIso(),
          notes: `Manual admin redemption by ${user.email}. ${notes || ''}`,
        });
        break;
      }
      case 'regenerate_qr': {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let newToken = '';
        for (let i = 0; i < 12; i++) newToken += chars[Math.floor(Math.random() * chars.length)];
        const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://app.yardit.com';
        const redeemUrl = `${appBaseUrl}/reward/redeem/${newToken}`;
        const newQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(redeemUrl)}&format=png&ecc=H`;
        await base44.asServiceRole.entities.UserVoucher.update(voucher_id, {
          qr_token: newToken,
          qr_image_url: newQrImageUrl,
        });
        break;
      }
      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    console.log(`[adminVoucherAction] Action "${action}" on voucher ${voucher_id} by admin ${user.email}`);
    return Response.json({ success: true, action });
  } catch (error) {
    console.error('[adminVoucherAction] Error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});