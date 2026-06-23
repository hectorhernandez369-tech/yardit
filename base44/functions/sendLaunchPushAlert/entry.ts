import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ONESIGNAL_APP_ID = "44d72407-6c94-4258-95f7-fd22c3157040";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const profiles = await base44.asServiceRole.entities.AdminProfile.filter({ user_id: user.id });
    const emailProfiles = profiles.length ? [] : await base44.asServiceRole.entities.AdminProfile.filter({ email: user.email?.toLowerCase() });
    const adminProfile = profiles[0] || emailProfiles[0];
    const isMasterAdmin = ['master', 'super_master'].includes(user.role) || adminProfile?.role_label === 'master';

    if (!isMasterAdmin) {
      return Response.json({ error: 'Only master admins can send launch push alerts.' }, { status: 403 });
    }

    const { title, message, url, dry_run } = await req.json();
    const cleanTitle = String(title || 'Yardit is launching soon!').trim().slice(0, 80);
    const cleanMessage = String(message || 'Get ready to discover yard sales, local vendors, and neighborhood events near you.').trim().slice(0, 180);
    const launchUrl = String(url || Deno.env.get('APP_BASE_URL') || '').trim();

    if (dry_run) {
      return Response.json({ success: true, dry_run: true, title: cleanTitle, message: cleanMessage, url: launchUrl });
    }

    const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
    if (!apiKey) return Response.json({ error: 'OneSignal API key is not configured.' }, { status: 500 });

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ['All'],
      headings: { en: cleanTitle },
      contents: { en: cleanMessage },
      ...(launchUrl ? { url: launchUrl } : {})
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Basic ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      return Response.json({ success: false, error: result.errors || result.error || 'OneSignal rejected the push alert.' });
    }

    return Response.json({ success: true, notification_id: result.id, recipients: result.recipients || 0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});