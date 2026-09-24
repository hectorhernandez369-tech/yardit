import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const LIMITS = { free: 0, starter: 4, pro: 12, growth: null };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const accountId = String(body?.vendor_account_id || '');
    const text = String(body?.text || '').trim();
    if (!accountId || !text) return Response.json({ error: 'Missing vendor update details' }, { status: 400 });
    if (text.length > 280) return Response.json({ error: 'Updates must be 280 characters or less' }, { status: 400 });

    const accounts = await base44.asServiceRole.entities.VendorAccount.filter({ id: accountId }, '-created_date', 1);
    const account = accounts?.[0];
    if (!account) return Response.json({ error: 'Vendor account not found' }, { status: 404 });
    const authorized = account.owner_user_id === user.id || account.owner_email === user.email || ['admin','master','super_master'].includes(String(user.role || '').toLowerCase());
    if (!authorized) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const tier = ['free','starter','pro','growth'].includes(account.vendor_tier) ? account.vendor_tier : 'free';
    const limit = LIMITS[tier];
    if (limit === 0) return Response.json({ error: 'Public updates require Starter or higher.' }, { status: 403 });

    if (limit !== null) {
      const updates = await base44.asServiceRole.entities.VendorUpdate.filter({ vendor_account_id: accountId }, '-created_date', 200);
      const now = new Date();
      const used = (updates || []).filter((item) => {
        const d = new Date(item.created_date);
        return !Number.isNaN(d.getTime()) && d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
      }).length;
      if (used >= limit) return Response.json({ error: `${tier === 'starter' ? 'Starter' : 'Pro'} includes ${limit} public updates per month. Upgrade for more.` }, { status: 403 });
    }

    const created = await base44.asServiceRole.entities.VendorUpdate.create({ vendor_account_id: accountId, text, likes: 0, liked_by: [] });
    return Response.json({ ok: true, update: created });
  } catch (error) {
    return Response.json({ error: error?.message || 'Could not post update' }, { status: 500 });
  }
});