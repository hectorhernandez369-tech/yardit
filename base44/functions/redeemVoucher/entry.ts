import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const nowIso = () => new Date().toISOString();

function getDistanceFeet(lat1, lon1, lat2, lon2) {
  const R = 20925524.9; // Earth radius in feet
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { token, user_lat, user_lng, device_info, notes } = body;

    if (!token) return Response.json({ error: 'Token required' }, { status: 400 });

    // Find voucher by token
    const vouchers = await base44.asServiceRole.entities.UserVoucher.filter({ qr_token: token });
    const voucher = vouchers?.[0];
    if (!voucher) return Response.json({ error: 'Invalid or unknown reward code.' }, { status: 404 });

    // Already redeemed
    if (voucher.status === 'redeemed') {
      return Response.json({ error: 'This reward has already been redeemed.', already_redeemed: true }, { status: 409 });
    }

    // Check status
    if (voucher.status === 'on_hold') {
      return Response.json({ error: 'This reward is currently on hold pending review.', on_hold: true }, { status: 403 });
    }
    if (voucher.status === 'revoked') {
      return Response.json({ error: 'This reward has been revoked.', revoked: true }, { status: 403 });
    }
    if (voucher.status === 'expired') {
      return Response.json({ error: 'This reward has expired.', expired: true }, { status: 403 });
    }
    if (voucher.status === 'pending') {
      return Response.json({ error: 'This reward is not yet active.', pending: true }, { status: 403 });
    }
    if (voucher.status !== 'active') {
      return Response.json({ error: 'This reward cannot be redeemed.', status: voucher.status }, { status: 403 });
    }

    // Check expiration
    if (voucher.expiration_date && new Date(voucher.expiration_date) < new Date()) {
      await base44.asServiceRole.entities.UserVoucher.update(voucher.id, { status: 'expired' });
      return Response.json({ error: 'This reward has expired.', expired: true }, { status: 403 });
    }

    // Load campaign for additional checks
    const campaigns = await base44.asServiceRole.entities.VoucherCampaign.filter({ id: voucher.campaign_id });
    const campaign = campaigns?.[0];

    // Radius check
    if (campaign?.redemption_radius_feet && user_lat && user_lng) {
      let businessLat, businessLng;

      if (voucher.redemption_business_id) {
        const businesses = await base44.asServiceRole.entities.RedemptionBusiness.filter({ id: voucher.redemption_business_id });
        const biz = businesses?.[0];
        if (biz?.latitude && biz?.longitude) {
          businessLat = biz.latitude;
          businessLng = biz.longitude;
        }
      }

      const checkLat = businessLat || user_lat;
      const checkLng = businessLng || user_lng;
      const distance = getDistanceFeet(user_lat, user_lng, checkLat, checkLng);

      if (distance > campaign.redemption_radius_feet) {
        return Response.json({
          error: 'Redemption unavailable at this location.',
          outside_radius: true,
          distance_feet: Math.round(distance),
          required_feet: campaign.redemption_radius_feet,
        }, { status: 403 });
      }
    }

    // Get client IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '';

    // Mark as redeemed
    await base44.asServiceRole.entities.UserVoucher.update(voucher.id, {
      status: 'redeemed',
      redeemed_at: nowIso(),
      redemption_device_info: device_info || '',
      redemption_ip: ip,
    });

    // Create redemption record
    await base44.asServiceRole.entities.VoucherRedemption.create({
      voucher_id: voucher.id,
      campaign_id: voucher.campaign_id,
      redeemed_by_user: voucher.user_id,
      redeemed_at: nowIso(),
      location: (user_lat && user_lng) ? `${user_lat},${user_lng}` : '',
      device_info: device_info || '',
      ip_address: ip,
      notes: notes || '',
    });

    console.log(`[redeemVoucher] Voucher ${voucher.id} redeemed successfully`);

    return Response.json({ success: true, redeemed_at: nowIso() });
  } catch (error) {
    console.error('[redeemVoucher] Error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});