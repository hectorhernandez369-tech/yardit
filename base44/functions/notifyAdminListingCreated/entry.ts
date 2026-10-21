import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [byUserId, byEmail] = await Promise.all([
      base44.asServiceRole.entities.AdminProfile.filter({ user_id: user.id }).catch(() => []),
      base44.asServiceRole.entities.AdminProfile.filter({ email: String(user.email || '').toLowerCase() }).catch(() => []),
    ]);
    const adminProfile = [...byUserId, ...byEmail].find((profile) => profile?.is_active === true);
    if (!adminProfile && user.role !== 'super_master') {
      return Response.json({ error: 'Active Yardit admin access is required.' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const {
      listing_id = '',
      related_entity_type = 'Listing',
      title = 'Listing',
      listing_type = 'listing',
      city = '',
      state = '',
      deep_link = '',
      owner_approval_bypassed = false,
    } = payload;

    if (!listing_id) return Response.json({ error: 'Listing ID is required.' }, { status: 400 });

    const masterProfiles = await base44.asServiceRole.entities.AdminProfile
      .filter({ role_label: 'master', is_active: true })
      .catch(() => []);

    let delivered = 0;
    for (const masterProfile of masterProfiles || []) {
      if (!masterProfile.user_id) continue;

      const dedupeKey = `admin_listing_created_${listing_id}_${masterProfile.user_id}`;
      const locationText = [city, state].filter(Boolean).join(', ');
      const message = `${user.email || 'An admin'} created "${title}"${locationText ? ` in ${locationText}` : ''}.${owner_approval_bypassed ? ' Owner approval was bypassed.' : ''}`;
      const notification = {
        user_id: masterProfile.user_id,
        userId: masterProfile.user_id,
        title: 'Admin created a listing',
        message,
        type: 'admin_listing_created',
        related_entity_type,
        related_entity_id: listing_id,
        delivery_methods: ['push', 'bell'],
        deep_link,
        dedupe_key: dedupeKey,
        registry_status: 'active',
        registry_version: '2026-10-21',
        metadata: {
          dedupe_key: dedupeKey,
          listing_type,
          admin_creator_id: user.id,
          admin_creator_email: user.email || '',
          owner_approval_bypassed: owner_approval_bypassed === true,
        },
      };

      const existing = await base44.asServiceRole.entities.Notification.filter({ dedupe_key: dedupeKey }).catch(() => []);
      if (!existing?.length) {
        await base44.asServiceRole.entities.Notification.create({
          ...notification,
          read: false,
          is_read: false,
        }).catch(() => {});
      }

      await base44.asServiceRole.functions.invoke('deliverNotificationPush', { data: notification }).catch(() => {});
      delivered += 1;
    }

    return Response.json({ ok: true, recipients: delivered });
  } catch (error) {
    console.error('notifyAdminListingCreated error:', error?.message || error);
    return Response.json({ error: error?.message || 'Could not send admin listing notification.' }, { status: 500 });
  }
});
