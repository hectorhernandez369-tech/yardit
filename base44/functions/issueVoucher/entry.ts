import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const nowIso = () => new Date().toISOString();

function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 12; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function generatePromoCode(prefix = 'YH') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${suffix}`;
}

async function generateVerificationHash(token, userId, campaignId) {
  const data = `${token}:${userId}:${campaignId}:${Date.now()}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { campaign_id, user_id, user_email, trigger_type, source_reference_id, force_admin = false } = body;

    if (!campaign_id || !user_id) {
      return Response.json({ error: 'campaign_id and user_id required' }, { status: 400 });
    }

    // Load campaign
    const campaigns = await base44.asServiceRole.entities.VoucherCampaign.filter({ id: campaign_id });
    const campaign = campaigns?.[0];
    if (!campaign) return Response.json({ error: 'Campaign not found' }, { status: 404 });
    if (!force_admin && campaign.status !== 'active') return Response.json({ error: 'Campaign not active' }, { status: 400 });

    // Check distribution limit
    if (campaign.distribution_limit && (campaign.issued_count || 0) >= campaign.distribution_limit) {
      return Response.json({ error: 'Campaign distribution limit reached' }, { status: 400 });
    }

    // Check per-user limit
    const existing = await base44.asServiceRole.entities.UserVoucher.filter({
      campaign_id,
      user_id,
    });
    const activeVouchers = (existing || []).filter(v => !['revoked','canceled','expired'].includes(v.status));
    if (!force_admin && campaign.redemption_limit_per_user && activeVouchers.length >= campaign.redemption_limit_per_user) {
      return Response.json({ error: 'User has reached redemption limit for this campaign' }, { status: 400 });
    }

    // Generate unique token and promo code
    const qrToken = generateToken();
    const promoCode = generatePromoCode(campaign.promo_prefix || 'YH');
    const verificationHash = await generateVerificationHash(qrToken, user_id, campaign_id);

    // Compute expiration
    const expirationDate = campaign.end_date || null;

    // Determine initial status — pending unless admin forced or no delay needed
    const status = force_admin ? 'active' : (campaign.activation_delay_hours > 0 ? 'pending' : 'active');
    const activatedAt = status === 'active' ? nowIso() : null;

    // QR image URL — points to the redemption page
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://app.yardit.com';
    const redeemUrl = `${appBaseUrl}/reward/redeem/${qrToken}`;
    const qrLogoParam = campaign.qr_logo ? `&logo=${encodeURIComponent(campaign.qr_logo)}` : '';
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(redeemUrl)}&format=png&ecc=H${qrLogoParam}`;

    const voucher = await base44.asServiceRole.entities.UserVoucher.create({
      user_id,
      campaign_id,
      qr_token: qrToken,
      promo_code: promoCode,
      qr_image_url: qrImageUrl,
      status,
      reward_title: campaign.reward_title,
      reward_description: campaign.public_description || '',
      business_name: campaign.business_name || '',
      campaign_image: campaign.campaign_image || '',
      start_date: campaign.start_date || nowIso(),
      expiration_date: expirationDate,
      activated_at: activatedAt,
      source_trigger_type: trigger_type || '',
      source_reference_id: source_reference_id || '',
      verification_hash: verificationHash,
      created_at: nowIso(),
    });

    // Increment issued count
    await base44.asServiceRole.entities.VoucherCampaign.update(campaign_id, {
      issued_count: (campaign.issued_count || 0) + 1,
    });

    console.log(`[issueVoucher] Issued voucher ${voucher.id} to user ${user_id} for campaign ${campaign_id}`);

    return Response.json({
      success: true,
      voucher,
      redeem_url: redeemUrl,
    });
  } catch (error) {
    console.error('[issueVoucher] Error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});