import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

function resolvePublicContactVisibility(accountVisibility = 'hide', eventVisibility = 'inherit') {
  const eventValue = String(eventVisibility || 'inherit').toLowerCase();
  if (eventValue === 'show') return true;
  if (eventValue === 'hide') return false;
  return String(accountVisibility || 'hide').toLowerCase() === 'show';
}

function sanitizeAccount(account, event = null) {
  const contactVisible = resolvePublicContactVisibility(account?.public_contact_visibility, event?.public_contact_visibility);
  return {
    id: account.id,
    business_name: account.business_name || '',
    vendor_display_name: account.vendor_display_name || account.business_name || '',
    business_logo: account.business_logo || '',
    logo_url: account.business_logo || '',
    business_category: account.business_category || '',
    vendor_slug: account.vendor_slug || '',
    description: account.description || '',
    location: account.location || account.business_address || '',
    hero_background_color: account.hero_background_color || '#FFFFFF',
    featured_photo_url: account.featured_photo_url || '',
    photo_urls: account.photo_urls || [],
    facebook_url: account.facebook_url || '',
    instagram_url: account.instagram_url || '',
    tiktok_url: account.tiktok_url || '',
    vendor_tier: account.vendor_tier || 'free',
    is_active: account.is_active !== false,
    is_verified_vendor: !!account.is_verified_vendor,
    owner_user_id: account.owner_user_id || '',
    public_contact_visibility: account.public_contact_visibility || 'hide',
    public_contact_visible: contactVisible,
    phone: contactVisible ? account.business_phone || account.phone || '' : '',
    business_phone: contactVisible ? account.business_phone || account.phone || '' : '',
    email: contactVisible ? account.email || '' : '',
    website: contactVisible ? account.website || '' : '',
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const accountIds = new Set(Array.isArray(body.accountIds) ? body.accountIds.filter(Boolean) : []);
    if (body.accountId) accountIds.add(body.accountId);

    let event = null;
    if (body.eventId) {
      const events = await base44.asServiceRole.entities.VendorEvent.filter({ id: body.eventId }, '-created_date', 1);
      event = events[0] || null;
      if (event?.organizer_business_id) accountIds.add(event.organizer_business_id);
    }

    let accounts = [];
    if (body.vendorSlug) {
      accounts = await base44.asServiceRole.entities.VendorAccount.filter({ vendor_slug: body.vendorSlug }, '-created_date', 1);
    } else if (accountIds.size > 0) {
      const allAccounts = await base44.asServiceRole.entities.VendorAccount.list('-updated_date', 500);
      accounts = allAccounts.filter((account) => accountIds.has(account.id));
    }

    const sanitized = accounts
      .filter((account) => account?.is_active !== false)
      .map((account) => sanitizeAccount(account, event && account.id === event.organizer_business_id ? event : null));

    return Response.json({ account: sanitized[0] || null, accounts: sanitized });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});