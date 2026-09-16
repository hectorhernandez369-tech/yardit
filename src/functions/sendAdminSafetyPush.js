import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const Deno = globalThis.Deno;

function uniq(values) {
  return [...new Set((values || []).filter(Boolean))];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const title = String(body?.title || 'Yardit safety alert').trim();
    const message = String(body?.message || 'A safety report requires prompt review.').trim();
    const url = String(body?.url || '').trim();

    const adminProfiles = await base44.asServiceRole.entities.AdminProfile.list();
    const activeAdminIds = uniq((adminProfiles || [])
      .filter((profile) => profile.is_active === true)
      .map((profile) => profile.user_id));

    if (!activeAdminIds.length) {
      return Response.json({ success: true, recipients: 0, reason: 'no_active_admins' });
    }

    const subscriptions = await base44.asServiceRole.entities.PushSubscription.list();
    const subscriptionIds = uniq((subscriptions || [])
      .filter((sub) =>
        activeAdminIds.includes(sub.user_id) &&
        sub.permission_status === 'enabled' &&
        sub.is_active === true &&
        sub.onesignal_subscription_id
      )
      .map((sub) => sub.onesignal_subscription_id));

    if (!subscriptionIds.length) {
      return Response.json({ success: true, recipients: 0, reason: 'no_enabled_admin_subscriptions' });
    }

    const appId = Deno.env.get('ONESIGNAL_APP_ID') || Deno.env.get('ONE_SIGNAL_APP_ID') || '';
    const restApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY') || Deno.env.get('ONESIGNAL_API_KEY') || Deno.env.get('ONE_SIGNAL_REST_API_KEY') || '';

    if (!appId || !restApiKey) {
      return Response.json({
        success: false,
        error: 'OneSignal server credentials are not configured for targeted admin push.',
        missing: {
          app_id: !appId,
          rest_api_key: !restApiKey,
        },
        recipients: subscriptionIds.length,
      }, { status: 503 });
    }

    const payload = {
      app_id: appId,
      include_subscription_ids: subscriptionIds,
      headings: { en: title },
      contents: { en: message },
      ...(url ? { url } : {}),
      data: {
        type: 'admin_safety_priority',
        destination: '/AdminLite?section=astra',
      },
    };

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${restApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.errors) {
      console.error('sendAdminSafetyPush OneSignal error', result);
      return Response.json({ success: false, error: result?.errors || 'OneSignal request failed', recipients: subscriptionIds.length }, { status: 502 });
    }

    return Response.json({
      success: true,
      recipients: subscriptionIds.length,
      onesignal_id: result?.id || '',
    });
  } catch (error) {
    console.error('sendAdminSafetyPush error', error);
    return Response.json({ error: error?.message || 'Admin safety push failed' }, { status: 500 });
  }
});
