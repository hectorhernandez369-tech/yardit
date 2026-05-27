import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token } = body;

    if (!token) return Response.json({ error: 'Token required' }, { status: 400 });

    const vouchers = await base44.asServiceRole.entities.UserVoucher.filter({ qr_token: token });
    const voucher = vouchers?.[0];
    if (!voucher) return Response.json({ error: 'Reward not found' }, { status: 404 });

    // Load campaign
    const campaigns = await base44.asServiceRole.entities.VoucherCampaign.filter({ id: voucher.campaign_id });
    const campaign = campaigns?.[0] || null;

    // Check expiration
    if (voucher.status === 'active' && voucher.expiration_date && new Date(voucher.expiration_date) < new Date()) {
      await base44.asServiceRole.entities.UserVoucher.update(voucher.id, { status: 'expired' });
      voucher.status = 'expired';
    }

    // Load redemption business if set
    let business = null;
    if (campaign?.verified_business_only && voucher.redemption_business_id) {
      const businesses = await base44.asServiceRole.entities.RedemptionBusiness.filter({ id: voucher.redemption_business_id });
      business = businesses?.[0] || null;
    }

    // Load vendor account if campaign is linked to a Yardit vendor
    let linkedVendor = null;
    if (campaign?.business_link_type === 'yardit_vendor' && campaign?.vendor_id) {
      const vendors = await base44.asServiceRole.entities.VendorAccount.filter({ id: campaign.vendor_id });
      linkedVendor = vendors?.[0] || null;
    }

    return Response.json({ voucher, campaign, business, linkedVendor });
  } catch (error) {
    console.error('[getVoucherByToken] Error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});