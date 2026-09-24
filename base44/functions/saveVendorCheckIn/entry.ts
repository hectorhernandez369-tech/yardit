import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const TIER_RULES = {
  free: { fridayToSundayOnly: true, dailyLimit: 1, maxHours: 4, logoPin: false, animation: false },
  starter: { fridayToSundayOnly: false, dailyLimit: null, maxHours: null, logoPin: false, animation: false },
  pro: { fridayToSundayOnly: false, dailyLimit: null, maxHours: null, logoPin: true, animation: false },
  growth: { fridayToSundayOnly: false, dailyLimit: null, maxHours: null, logoPin: true, animation: true },
};

function sameUtcDay(a, b) {
  return a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const payload = body?.checkin || {};
    const pinId = String(payload.vendor_pin_id || '');
    const accountId = String(payload.vendor_account_id || '');
    if (!pinId || !accountId) return Response.json({ error: 'Missing vendor check-in details' }, { status: 400 });

    const [pinRows, accountRows] = await Promise.all([
      base44.asServiceRole.entities.VendorPin.filter({ id: pinId }, '-created_date', 1),
      base44.asServiceRole.entities.VendorAccount.filter({ id: accountId }, '-created_date', 1),
    ]);
    const pin = pinRows?.[0];
    const account = accountRows?.[0];
    if (!pin || !account || pin.vendor_account_id !== account.id) return Response.json({ error: 'Vendor pin not found' }, { status: 404 });

    const owner = account.owner_user_id === user.id || account.owner_email === user.email;
    const admin = ['admin','master','super_master'].includes(String(user.role || '').toLowerCase());
    let authorized = owner || admin;
    if (!authorized && user.email) {
      const rows = await base44.asServiceRole.entities.VendorAuthorizedUser.filter({ vendor_account_id: account.id });
      authorized = (rows || []).some((row) =>
        ['active','accepted'].includes(row.status) &&
        String(row.authorized_email || '').toLowerCase() === String(user.email).toLowerCase() &&
        (!Array.isArray(row.assigned_pin_ids) || row.assigned_pin_ids.length === 0 || row.assigned_pin_ids.includes(pin.id))
      );
    }
    if (!authorized) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const tier = ['free','starter','pro','growth'].includes(account.vendor_tier) ? account.vendor_tier : 'free';
    const rules = TIER_RULES[tier];
    const now = new Date();

    if (rules.fridayToSundayOnly && ![5,6,0].includes(now.getDay())) {
      return Response.json({ error: 'Free Vendor check-ins are available Friday through Sunday.' }, { status: 403 });
    }

    const existingId = String(body?.existing_checkin_id || '');
    if (!existingId && rules.dailyLimit) {
      const rows = await base44.asServiceRole.entities.VendorPinCheckIn.filter({ vendor_account_id: account.id }, '-created_date', 200);
      const usedToday = (rows || []).filter((row) => {
        const d = new Date(row.checkin_start_time || row.created_date);
        return !Number.isNaN(d.getTime()) && sameUtcDay(d, now);
      }).length;
      if (usedToday >= rules.dailyLimit) {
        return Response.json({ error: 'Free Vendor includes 1 check-in per day.' }, { status: 403 });
      }
    }

    const start = new Date(payload.checkin_start_time || now);
    const end = new Date(payload.checkin_end_time);
    if (Number.isNaN(end.getTime()) || end <= start) return Response.json({ error: 'Choose a valid check-in end time.' }, { status: 400 });

    if (rules.maxHours) {
      const durationHours = (end.getTime() - start.getTime()) / 3600000;
      if (durationHours > rules.maxHours + 0.02) return Response.json({ error: `Free Vendor check-ins are limited to ${rules.maxHours} hours.` }, { status: 403 });
    }

    const pinAnimation = rules.animation && ['pulse','bounce'].includes(payload.pin_animation) ? payload.pin_animation : 'none';
    const requestedIconStyle = body?.pin_icon_style === 'truck_logo' ? 'truck_logo' : 'default';
    const pinIconStyle = rules.logoPin ? requestedIconStyle : 'default';

    if (pin.pin_icon_style !== pinIconStyle) {
      await base44.asServiceRole.entities.VendorPin.update(pin.id, { pin_icon_style: pinIconStyle });
    }

    const savePayload = {
      vendor_pin_id: pin.id,
      vendor_account_id: account.id,
      checked_in_by_email: user.email || '',
      checkin_latitude: Number(payload.checkin_latitude),
      checkin_longitude: Number(payload.checkin_longitude),
      checkin_geocoded_address: String(payload.checkin_geocoded_address || ''),
      checkin_display_address: String(payload.checkin_display_address || ''),
      checkin_start_time: start.toISOString(),
      checkin_end_time: end.toISOString(),
      pin_animation: pinAnimation,
      status: 'live',
    };

    const saved = existingId
      ? await base44.asServiceRole.entities.VendorPinCheckIn.update(existingId, savePayload)
      : await base44.asServiceRole.entities.VendorPinCheckIn.create(savePayload);

    return Response.json({ ok: true, checkIn: saved, pin_icon_style: pinIconStyle });
  } catch (error) {
    return Response.json({ error: error?.message || 'Could not save vendor check-in' }, { status: 500 });
  }
});