import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ONESIGNAL_APP_ID = "44d72407-6c94-4258-95f7-fd22c3157040";

function appUrl(path = "/Notifications") {
  const base = String(Deno.env.get('APP_BASE_URL') || '').trim().replace(/\/$/, '');
  if (!base) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function compactRecord(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== ''));
}

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

    const { title, message, url, deep_link, dry_run } = await req.json();
    const cleanTitle = String(title || 'Yardit is launching soon!').trim().slice(0, 80);
    const cleanMessage = String(message || 'Get ready to discover yard sales, local vendors, and neighborhood events near you.').trim().slice(0, 180);
    const notificationPath = String(deep_link || '/Notifications').trim() || '/Notifications';
    const launchUrl = String(url || appUrl(notificationPath)).trim();

    if (dry_run) {
      return Response.json({ success: true, dry_run: true, title: cleanTitle, message: cleanMessage, url: launchUrl, deep_link: notificationPath });
    }

    const rawApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
    if (!rawApiKey) return Response.json({ error: 'OneSignal API key is not configured.' }, { status: 500 });
    const apiKey = rawApiKey.trim().replace(/^Basic\s+/i, '').replace(/^Key\s+/i, '');

    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const dedupeBatch = `launch_push_${Date.now()}`;
    const bellRecords = allUsers.map((recipientUser) => compactRecord({
      userId: recipientUser.id,
      user_id: recipientUser.id,
      user_email: recipientUser.email,
      title: cleanTitle,
      message: cleanMessage,
      read: false,
      is_read: false,
      type: 'account_update',
      delivery_methods: ['bell'],
      deep_link: notificationPath,
      dedupe_key: `${dedupeBatch}_${recipientUser.id}`,
      registry_status: 'active',
      registry_version: '2026-06-24',
      metadata: { source: 'launch_push_alert', url: launchUrl }
    }));
    if (bellRecords.length) await base44.asServiceRole.entities.Notification.bulkCreate(bellRecords);

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ['All'],
      headings: { en: cleanTitle },
      contents: { en: cleanMessage },
      chrome_web_icon: appUrl('/yardit-notification-icon-192.png'),
      chrome_web_badge: appUrl('/yardit-notification-badge-72.png'),
      ...(launchUrl ? { url: launchUrl } : {})
    };

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Key ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      return Response.json({ success: false, error: result.errors || result.error || 'OneSignal rejected the push alert.' });
    }

    return Response.json({ success: true, notification_id: result.id, recipients: result.recipients || 0, bell_notifications_created: bellRecords.length, deep_link: notificationPath });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});