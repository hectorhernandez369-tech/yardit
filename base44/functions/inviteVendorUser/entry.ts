import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const BASE_LIMITS = { free: 1, starter: 1, pro: 2, growth: 3 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const accountId = String(body?.vendor_account_id || '');
    const accountRows = await base44.asServiceRole.entities.VendorAccount.filter({ id: accountId }, '-created_date', 1);
    const account = accountRows?.[0];
    if (!account) return Response.json({ error: 'Vendor account not found' }, { status: 404 });
    if (account.owner_user_id !== user.id && account.owner_email !== user.email) return Response.json({ error: 'Only the business owner can invite users.' }, { status: 403 });

    const tier = ['free','starter','pro','growth'].includes(account.vendor_tier) ? account.vendor_tier : 'free';
    const maxUsers = BASE_LIMITS[tier] + (tier === 'free' ? 0 : Math.max(0, Number(account.extra_users_count || 0)));
    const existing = await base44.asServiceRole.entities.VendorAuthorizedUser.filter({ vendor_account_id: accountId });
    const activeCount = (existing || []).filter((row) => ['pending','active','accepted'].includes(row.status)).length;
    if (activeCount >= maxUsers) return Response.json({ error: `Your ${tier} plan allows ${maxUsers} authorized user${maxUsers === 1 ? '' : 's'}.` }, { status: 403 });

    const email = String(body?.authorized_email || '').trim().toLowerCase();
    if (!email) return Response.json({ error: 'Email is required.' }, { status: 400 });
    const duplicate = (existing || []).find((row) => String(row.authorized_email || '').toLowerCase() === email && row.status !== 'removed');
    if (duplicate) return Response.json({ error: 'That user is already invited to this business.' }, { status: 409 });

    const now = new Date().toISOString();
    const authUser = await base44.asServiceRole.entities.VendorAuthorizedUser.create({
      vendor_account_id: accountId,
      authorized_email: email,
      first_name: String(body?.first_name || ''),
      last_name: String(body?.last_name || ''),
      phone: String(body?.phone || ''),
      assigned_pin_ids: [],
      status: 'pending',
      added_by_owner_user_id: user.id,
      invited_at: now,
    });
    await base44.asServiceRole.entities.Notification.create({
      user_email: email,
      title: 'Vendor Dashboard Invitation',
      message: `You've been invited to access ${account.business_name} on Yardit.`,
      type: 'vendor_access_invite',
      related_entity_type: 'VendorAuthorizedUser',
      related_entity_id: authUser.id,
      read: false,
      is_read: false,
      metadata: { authorized_user_id: authUser.id, vendor_account_id: account.id, business_name: account.business_name },
    });
    return Response.json({ ok: true, authorizedUser: authUser });
  } catch (error) {
    return Response.json({ error: error?.message || 'Could not invite vendor user' }, { status: 500 });
  }
});