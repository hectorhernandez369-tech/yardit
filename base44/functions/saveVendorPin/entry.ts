import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const BASE_LIMITS = { free: 1, starter: 1, pro: 2, growth: 3 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const accountId = String(body?.vendor_account_id || '');
    const action = String(body?.action || 'create');
    const pinId = String(body?.pin_id || '');
    const pinData = body?.pin || {};
    const rows = await base44.asServiceRole.entities.VendorAccount.filter({ id: accountId }, '-created_date', 1);
    const account = rows?.[0];
    if (!account) return Response.json({ error: 'Vendor account not found' }, { status: 404 });

    const owner = account.owner_user_id === user.id || account.owner_email === user.email;
    const admin = ['admin','master','super_master'].includes(String(user.role || '').toLowerCase());
    if (!owner && !admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const tier = ['free','starter','pro','growth'].includes(account.vendor_tier) ? account.vendor_tier : 'free';
    const maxPins = BASE_LIMITS[tier] + (tier === 'free' ? 0 : Math.max(0, Number(account.extra_pins_count || 0)));

    if (action === 'create') {
      const pins = await base44.asServiceRole.entities.VendorPin.filter({ vendor_account_id: accountId });
      const activeCount = (pins || []).filter((pin) => pin.is_active !== false).length;
      if (activeCount >= maxPins) return Response.json({ error: `Your ${tier} plan allows ${maxPins} active pin${maxPins === 1 ? '' : 's'}.` }, { status: 403 });
      const created = await base44.asServiceRole.entities.VendorPin.create({
        vendor_account_id: accountId,
        pin_name: String(pinData.pin_name || '').trim(),
        description: String(pinData.description || '').trim(),
        is_active: true,
        pin_logo_url: String(pinData.pin_logo_url || ''),
        pin_icon_style: ['pro','growth'].includes(tier) && pinData.pin_icon_style === 'truck_logo' ? 'truck_logo' : 'default',
        assigned_users: Array.isArray(pinData.assigned_users) ? pinData.assigned_users : [],
      });
      return Response.json({ ok: true, pin: created });
    }

    if (!pinId) return Response.json({ error: 'Missing pin_id' }, { status: 400 });
    const pinRows = await base44.asServiceRole.entities.VendorPin.filter({ id: pinId }, '-created_date', 1);
    const pin = pinRows?.[0];
    if (!pin || pin.vendor_account_id !== accountId) return Response.json({ error: 'Pin not found' }, { status: 404 });

    if (action === 'deactivate') {
      await base44.asServiceRole.entities.VendorPin.update(pinId, { is_active: false });
      return Response.json({ ok: true });
    }

    const updated = await base44.asServiceRole.entities.VendorPin.update(pinId, {
      pin_name: String(pinData.pin_name || pin.pin_name || '').trim(),
      description: String(pinData.description || ''),
      is_active: pinData.is_active !== false,
      pin_logo_url: String(pinData.pin_logo_url || ''),
      pin_icon_style: ['pro','growth'].includes(tier) && pinData.pin_icon_style === 'truck_logo' ? 'truck_logo' : 'default',
      assigned_users: Array.isArray(pinData.assigned_users) ? pinData.assigned_users : [],
    });
    return Response.json({ ok: true, pin: updated });
  } catch (error) {
    return Response.json({ error: error?.message || 'Could not save vendor pin' }, { status: 500 });
  }
});