import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const accountId = String(body?.vendor_account_id || '');
    const action = String(body?.action || 'create');
    const rows = await base44.asServiceRole.entities.VendorAccount.filter({ id: accountId }, '-created_date', 1);
    const account = rows?.[0];
    if (!account) return Response.json({ error: 'Vendor account not found' }, { status: 404 });
    const owner = account.owner_user_id === user.id || account.owner_email === user.email;
    const admin = ['admin','master','super_master'].includes(String(user.role || '').toLowerCase());
    if (!owner && !admin) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (!['pro','growth'].includes(String(account.vendor_tier || 'free'))) {
      return Response.json({ error: 'Deals & specials require Pro or Growth.' }, { status: 403 });
    }

    if (action === 'deactivate') {
      const dealId = String(body?.deal_id || '');
      const dealRows = await base44.asServiceRole.entities.VendorDeal.filter({ id: dealId }, '-created_date', 1);
      const deal = dealRows?.[0];
      if (!deal || deal.vendor_account_id !== accountId) return Response.json({ error: 'Deal not found' }, { status: 404 });
      await base44.asServiceRole.entities.VendorDeal.update(dealId, { status: 'inactive' });
      return Response.json({ ok: true });
    }

    const deal = body?.deal || {};
    const title = String(deal.title || '').trim();
    if (!title) return Response.json({ error: 'Deal title is required.' }, { status: 400 });
    const endsAt = deal.ends_at ? new Date(deal.ends_at) : null;
    if (endsAt && Number.isNaN(endsAt.getTime())) return Response.json({ error: 'Choose a valid end date.' }, { status: 400 });

    const payload = {
      vendor_account_id: accountId,
      title,
      description: String(deal.description || '').trim(),
      promo_code: String(deal.promo_code || '').trim(),
      starts_at: deal.starts_at || new Date().toISOString(),
      ends_at: deal.ends_at || null,
      status: 'active',
      created_by_user_id: user.id || '',
    };

    const created = await base44.asServiceRole.entities.VendorDeal.create(payload);
    return Response.json({ ok: true, deal: created });
  } catch (error) {
    return Response.json({ error: error?.message || 'Could not save deal' }, { status: 500 });
  }
});