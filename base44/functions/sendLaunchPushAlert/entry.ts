import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function appUrl(path = "/Notifications") {
  const base = String(Deno.env.get('APP_BASE_URL') || 'https://yardit.app').trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
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
    if (!isMasterAdmin) return Response.json({ error: 'Only master admins can send launch push alerts.' }, { status: 403 });

    const { title, message, url, deep_link, dry_run } = await req.json();
    const cleanTitle = String(title || 'Yardit launch alert').trim().slice(0, 80);
    const cleanMessage = String(message || 'Yardit has a launch update.').trim().slice(0, 180);
    const notificationPath = String(deep_link || '/ComingSoon').trim() || '/ComingSoon';
    const launchUrl = String(url || appUrl(notificationPath)).trim();

    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    if (dry_run) {
      return Response.json({ success: true, dry_run: true, attempted: allUsers.length, title: cleanTitle, message: cleanMessage, url: launchUrl, deep_link: notificationPath });
    }

    const batch = `launch_push_${Date.now()}`;
    const results = [];
    for (const recipientUser of allUsers) {
      try {
        const response = await base44.asServiceRole.functions.invoke('deliverNotificationPush', {
          user_id: recipientUser.id,
          userId: recipientUser.id,
          user_email: recipientUser.email,
          title: cleanTitle,
          message: cleanMessage,
          type: 'launch_alert',
          delivery_methods: ['push', 'bell'],
          deep_link: notificationPath,
          metadata: { source: 'launch_push_alert', url: launchUrl },
          dedupe_key: `${batch}_${recipientUser.id}`,
          registry_status: 'active',
          registry_version: '2026-08-24',
        });
        const delivery = response?.data || response || {};
        results.push({
          user_id: recipientUser.id,
          sent: delivery.success === true && Number(delivery.recipient_count || 0) > 0,
          recipient_count: Number(delivery.recipient_count || 0),
          skipped: delivery.skipped === true,
          reason: delivery.reason || null,
          error: delivery.error || null,
        });
      } catch (error) {
        results.push({ user_id: recipientUser.id, sent: false, recipient_count: 0, skipped: false, error: error.message });
      }
    }

    const sent = results.filter((row) => row.sent).length;
    const deliveredDevices = results.reduce((sum, row) => sum + Number(row.recipient_count || 0), 0);
    const skipped = results.filter((row) => row.skipped).length;
    const failed = results.filter((row) => !row.sent && !row.skipped).length;

    return Response.json({
      success: sent > 0,
      attempted: allUsers.length,
      recipients: sent,
      delivered_devices: deliveredDevices,
      skipped,
      failed,
      results,
      deep_link: notificationPath,
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});