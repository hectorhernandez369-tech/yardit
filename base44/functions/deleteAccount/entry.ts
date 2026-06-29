import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const protectedRoles = new Set(['admin', 'master', 'super_master', 'owner', 'developer']);

async function runIfEntityExists(action) {
  try {
    return await action();
  } catch (error) {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    if (!payload.passwordConfirmed || !payload.understandsPermanent) {
      return Response.json({ error: 'Final confirmation is required before deleting this account.' }, { status: 400 });
    }

    if (user.isAdmin || protectedRoles.has(user.role)) {
      return Response.json({ error: 'Admin, owner, and developer accounts must be reviewed by Yardit Support before deletion.' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const userId = user.id;
    const retainedDataNotice = 'Payment records, fraud prevention records, safety reports, support history, legal compliance records, dispute records, and audit logs may be retained as required.';

    await base44.asServiceRole.entities.UserActivityLog.create({
      user_id: userId,
      event_type: 'account_deletion_started',
      event_label: 'Account Deletion Started',
      target_type: 'account',
      target_id: userId,
      source_page: 'Settings',
      created_at: now,
      details_json: {
        method: 'safe_deactivation',
        retained_data_notice: retainedDataNotice
      }
    });

    await runIfEntityExists(() => base44.asServiceRole.entities.PushSubscription.updateMany(
      { user_id: userId },
      { $set: { is_active: false, permission_status: 'not_enabled', updated_at: now } }
    ));

    await runIfEntityExists(() => base44.asServiceRole.entities.NotificationPreference.updateMany(
      { user_id: userId },
      { $set: {
        push_enabled: false,
        alerts_push_enabled: false,
        account_alerts_push_enabled: false,
        billing_alerts_push_enabled: false,
        approval_alerts_push_enabled: false,
        safety_alerts_push_enabled: false,
        support_alerts_push_enabled: false,
        policy_alerts_push_enabled: false,
        listings_near_me_push_enabled: false,
        vendor_near_me_push_enabled: false,
        marketing_push_enabled: false,
        last_updated_at: now
      } }
    ));

    await runIfEntityExists(() => base44.asServiceRole.entities.VendorNotificationSubscription.updateMany(
      { user_id: userId },
      { $set: { subscription_enabled: false, updated_at: now } }
    ));

    await runIfEntityExists(() => base44.asServiceRole.entities.SavedListing.deleteMany({ user_id: userId }));
    await runIfEntityExists(() => base44.asServiceRole.entities.SavedNeighborhood.deleteMany({ user_id: userId }));
    await runIfEntityExists(() => base44.asServiceRole.entities.TrackedListing.deleteMany({ user_id: userId }));

    const publicListingStatuses = ['active', 'activated_locked', 'scheduled', 'collecting_participants', 'ready_for_payment', 'payment_pending', 'payment_pending_adjustment', 'under_review'];
    for (const status of publicListingStatuses) {
      await runIfEntityExists(() => base44.asServiceRole.entities.Listing.updateMany(
        { ownerUserId: userId, status },
        { $set: { status: 'hidden', statusReason: 'Account deleted by user' } }
      ));
    }

    await runIfEntityExists(() => base44.asServiceRole.entities.VendorAccount.updateMany(
      { owner_user_id: userId },
      { $set: { is_active: false, description: '', phone: '', business_phone: '', email: '', website: '', facebook_url: '', instagram_url: '', tiktok_url: '' } }
    ));

    await base44.asServiceRole.entities.User.update(userId, {
      first_name: '',
      last_name: '',
      username: '',
      phone: '',
      phone_number: '',
      profile_photo_url: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
      address: '',
      primary_address: '',
      primary_address_verified: false,
      has_primary_address: false,
      address_confirmation_status: 'unconfirmed',
      accountStatus: 'deleted',
      account_deletion_status: 'completed',
      account_deletion_requested_at: now,
      account_deleted_at: now,
      account_deletion_method: 'safe_deactivation',
      account_deletion_retention_notice: retainedDataNotice
    });

    await base44.asServiceRole.entities.UserActivityLog.create({
      user_id: userId,
      event_type: 'account_deleted',
      event_label: 'Account Deleted',
      target_type: 'account',
      target_id: userId,
      source_page: 'Settings',
      created_at: now,
      details_json: {
        method: 'safe_deactivation',
        public_content_hidden: true,
        push_disabled: true,
        retained_data_notice: retainedDataNotice
      }
    });

    return Response.json({
      success: true,
      behavior: 'safe_deactivation',
      retained_data_notice: retainedDataNotice
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});