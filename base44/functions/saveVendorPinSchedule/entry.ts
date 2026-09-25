import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const pinId = String(body?.pin_id || '');
    const action = String(body?.action || 'save');
    if (!pinId) return Response.json({ error: 'Missing pin_id' }, { status: 400 });

    const pins = await base44.asServiceRole.entities.VendorPin.filter({ id: pinId }, '-created_date', 1);
    const pin = pins?.[0];
    if (!pin) return Response.json({ error: 'Pin not found' }, { status: 404 });
    const accounts = await base44.asServiceRole.entities.VendorAccount.filter({ id: pin.vendor_account_id }, '-created_date', 1);
    const account = accounts?.[0];
    if (!account) return Response.json({ error: 'Vendor account not found' }, { status: 404 });

    const owner = account.owner_user_id === user.id || account.owner_email === user.email;
    const admin = ['admin','master','super_master'].includes(String(user.role || '').toLowerCase());
    if (!owner && !admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (action === 'clear') {
      await base44.asServiceRole.entities.VendorPin.update(pinId, {
        scheduled_date: null, scheduled_start_time: null, scheduled_end_time: null, recurring_schedule: [],
        scheduled_location_label: null, scheduled_lat: null, scheduled_lng: null, schedule_status: 'draft',
        schedule_notes: null, scheduled_by_user_id: null, scheduled_by_name: null,
      });
      return Response.json({ ok: true });
    }

    if (!['pro','growth'].includes(String(account.vendor_tier || 'free'))) {
      return Response.json({ error: 'Scheduled locations require Pro or Growth.' }, { status: 403 });
    }

    const patch = body?.schedule || {};
    await base44.asServiceRole.entities.VendorPin.update(pinId, {
      scheduled_date: patch.scheduled_date || null,
      scheduled_start_time: patch.scheduled_start_time || null,
      scheduled_end_time: patch.scheduled_end_time || null,
      recurring_schedule: Array.isArray(patch.recurring_schedule) ? patch.recurring_schedule : [],
      scheduled_location_label: String(patch.scheduled_location_label || ''),
      scheduled_lat: patch.scheduled_lat === null || patch.scheduled_lat === '' ? null : Number(patch.scheduled_lat),
      scheduled_lng: patch.scheduled_lng === null || patch.scheduled_lng === '' ? null : Number(patch.scheduled_lng),
      schedule_status: patch.schedule_status || 'draft',
      schedule_notes: String(patch.schedule_notes || ''),
      scheduled_by_user_id: user.id || '',
      scheduled_by_name: user.full_name || user.email || '',
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error?.message || 'Could not save vendor schedule' }, { status: 500 });
  }
});