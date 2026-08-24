import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function appUrl(path = "/Notifications") {
  const base = String(Deno.env.get('APP_BASE_URL') || 'https://yardit.app').trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function compactRecord(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== ''));
}

function relationId(value) {
  if (!value) return '';
  if (typeof value === 'object') return String(value.id || value._id || '');
  return String(value);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const profiles = await base44.asServiceRole.entities.AdminProfile.filter({ user_id: user.id });
    const emailProfiles = profiles.length ? [] : await base44.asServiceRole.entities.AdminProfile.filter({ email: user.email?.toLowerCase() });
    const adminProfile = profiles[0] || emailProfiles[0];
    const isMasterAdmin = ['master', 'super_master'].includes(user.role) || adminProfile?.role_label === 'master';

    if (!isMasterAdmin) {
      return Response.json({ success: false, error: 'Only master admins can send launch push alerts.' }, { status: 403 });
    }

    const { title, message, url, deep_link, dry_run } = await req.json();
    const cleanTitle = String(title || 'Yardit is launching soon!').trim().slice(0, 80);
    const cleanMessage = String(message || 'Get ready to discover yard sales, local vendors, and neighborhood events near you.').trim().slice(0, 180);
    const notificationPath = String(deep_link || '/Notifications').trim() || '/Notifications';
    const launchUrl = String(url || appUrl(notificationPath)).trim();

    if (dry_run) {
      return Response.json({ success: true, dry_run: true, title: cleanTitle, message: cleanMessage, url: launchUrl, deep_link: notificationPath });
    }

    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const dedupeBatch = `launch_push_${Date.now()}`;
    const results = [];

    for (const recipientUser of allUsers) {
      const recipientId = relationId(recipientUser.id);
      if (!recipientId) continue;
      try {
        const response = await base44.asServiceRole.functions.invoke('deliverNotificationPush', compactRecord({
          user_id: recipientId,
          user_email: recipientUser.email,
          title: cleanTitle,
          message: cleanMessage,
          type: 'launch_alert',
          recipient: 'Yardit user',
          trigger: 'Master admin launch alert',
          delivery_methods: ['push', 'bell'],
          deep_link: notificationPath,
          dedupe_key: `${dedupeBatch}_${recipientId}`,
          registry_status: 'active',
          registry_version: '2026-08-24',
          metadata: { source: 'launch_push_alert', url: launchUrl },
        }));
        const delivery = response?.data || response;
        results.push({ user_id: recipientId, email: recipientUser.email, ...delivery });
      } catch (error) {
        results.push({ user_id: recipientId, email: recipientUser.email, success: false, error: error.message });
      }
    }

    const delivered = results.filter((row) => row.success === true && Number(row.recipient_count || 0) > 0).length;
    const deliveredDevices = results.reduce((sum, row) => sum + (row.success === true ? Number(row.recipient_count || 0) : 0), 0);
    const noRecipient = results.filter((row) => row.reason === 'No active OneSignal recipient').length;
    const disabled = results.filter((row) => row.reason === 'Push disabled').length;
    const failed = results.filter((row) => row.success === false && !row.skipped).length;

    return Response.json({
      success: delivered > 0,
      recipients: deliveredDevices,
      users_delivered: delivered,
      users_checked: results.length,
      users_no_active_recipient: noRecipient,
      users_push_disabled: disabled,
      users_failed: failed,
      bell_notifications_created: results.filter((row) => row.history_notification_id).length,
      deep_link: notificationPath,
      results,
      error: delivered > 0 ? undefined : 'No active OneSignal recipient received the launch alert.',
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});