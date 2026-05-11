import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const nowIso = () => new Date().toISOString();
const relId = (value) => value && typeof value === 'object' ? value.id : value;
const norm = (value) => String(value || '').trim().toLowerCase();
const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';
const safeArray = (value) => Array.isArray(value) ? value : [];

const VALID_VENDOR_TIERS = ['free', 'starter', 'pro', 'growth', 'event_organizer'];
const VISIBLE_LISTING_STATUSES = ['active', 'activated_locked', 'scheduled', 'collecting_participants', 'ready_for_payment'];
const HIDDEN_LISTING_STATUSES = ['expired', 'completed', 'cancelled', 'closed', 'hidden', 'suspended'];
const PUBLIC_EVENT_STATUSES = ['published', 'active'];
const OWNER_ONLY_PERMISSION_KEYS = ['transfer_owner', 'delete_event', 'billing_manage', 'owner'];

function displayVendor(vendor) {
  return vendor?.business_name || vendor?.vendor_display_name || vendor?.legal_business_name || vendor?.owner_email || vendor?.id || 'Vendor account';
}

function addIssue(issues, issue) {
  issues.set(issue.issue_key, {
    status: 'open',
    first_detected_at: nowIso(),
    last_detected_at: nowIso(),
    ...issue,
  });
}

function findDuplicates(records, field) {
  const buckets = new Map();
  for (const record of records) {
    const value = norm(record[field]);
    if (!value) continue;
    if (!buckets.has(value)) buckets.set(value, []);
    buckets.get(value).push(record);
  }
  return [...buckets.entries()].filter(([, items]) => items.length > 1);
}

async function listAll(base44, entityName) {
  const out = [];
  let offset = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities[entityName].list('-created_date', 200, offset);
    out.push(...batch);
    if (batch.length < 200) break;
    offset += 200;
  }
  return out;
}

async function assertMaster(base44) {
  const user = await base44.auth.me();
  if (!user) return null;
  const profilesByUser = await base44.asServiceRole.entities.AdminProfile.filter({ user_id: user.id });
  const profilesByEmail = await base44.asServiceRole.entities.AdminProfile.filter({ email: String(user.email || '').toLowerCase() });
  const profile = profilesByUser[0] || profilesByEmail[0];
  if (!profile || profile.is_active !== true || profile.role_label !== 'master') return null;
  return { user, profile };
}

function checkVendorAccounts(issues, vendors, reservations) {
  const reservationByKey = new Set(reservations.map((r) => `${r.type}:${norm(r.value)}:${r.vendor_account_id}`));

  for (const vendor of vendors) {
    const name = displayVendor(vendor);
    if (isBlank(vendor.owner_email)) addIssue(issues, { issue_key: `vendor:${vendor.id}:missing-owner-email`, severity: 'WARNING', category: 'VendorAccount Health', title: 'Vendor account is missing an owner email', description: 'This vendor account does not have an owner email attached, so searches, invites, and support lookup may not work correctly.', affected_entity_type: 'VendorAccount', affected_entity_id: vendor.id, affected_display_name: name, suggested_fix: 'Repair the account by attaching the owner email or review the account owner manually.', metadata: { safe_repair: false } });
    if (isBlank(vendor.owner_user_id)) addIssue(issues, { issue_key: `vendor:${vendor.id}:missing-owner-user`, severity: 'WARNING', category: 'VendorAccount Health', title: 'Vendor account is missing an owner user ID', description: 'This vendor account is not linked to a user ID, so ownership checks and dashboard access may not work correctly.', affected_entity_type: 'VendorAccount', affected_entity_id: vendor.id, affected_display_name: name, suggested_fix: 'Manual review required to confirm the correct owner before changing ownership.', metadata: { safe_repair: false } });
    if (isBlank(vendor.vendor_account_number)) addIssue(issues, { issue_key: `vendor:${vendor.id}:missing-number`, severity: 'WARNING', category: 'VendorAccount Health', title: 'Vendor account is missing an account number', description: 'This vendor account does not have a vendor account number, so support lookup and identity matching may not work correctly.', affected_entity_type: 'VendorAccount', affected_entity_id: vendor.id, affected_display_name: name, suggested_fix: 'Generate a new vendor account number and reserve it.', metadata: { safe_repair: true, repair_action: 'repairVendorIdentity' } });
    if (isBlank(vendor.vendor_slug)) addIssue(issues, { issue_key: `vendor:${vendor.id}:missing-slug`, severity: 'WARNING', category: 'VendorAccount Health', title: 'Vendor account is missing a public slug', description: 'This vendor account does not have a public page slug, so public profile links may not work.', affected_entity_type: 'VendorAccount', affected_entity_id: vendor.id, affected_display_name: name, suggested_fix: 'Generate a safe public slug and reserve it.', metadata: { safe_repair: true, repair_action: 'repairVendorIdentity' } });
    if (isBlank(vendor.vendor_tier)) addIssue(issues, { issue_key: `vendor:${vendor.id}:missing-tier`, severity: 'NOTICE', category: 'VendorAccount Health', title: 'Vendor account is missing a tier', description: 'This vendor account does not have a tier saved. Older accounts can safely default to Free until reviewed.', affected_entity_type: 'VendorAccount', affected_entity_id: vendor.id, affected_display_name: name, suggested_fix: 'Set the vendor tier to Free unless billing records show a paid tier.', metadata: { safe_repair: true, repair_action: 'defaultVendorTier' } });
    if (!isBlank(vendor.vendor_tier) && !VALID_VENDOR_TIERS.includes(vendor.vendor_tier)) addIssue(issues, { issue_key: `vendor:${vendor.id}:invalid-tier`, severity: 'WARNING', category: 'VendorAccount Health', title: 'Vendor account has an invalid tier', description: 'This vendor account has a tier value Yardit does not recognize, so feature access may be inconsistent.', affected_entity_type: 'VendorAccount', affected_entity_id: vendor.id, affected_display_name: name, suggested_fix: 'Manual review required before changing paid feature access.', metadata: { safe_repair: false } });
    if (vendor.vendor_tier === 'event_organizer' && !['active', 'trialing'].includes(vendor.subscription_status)) addIssue(issues, { issue_key: `vendor:${vendor.id}:organizer-unpaid`, severity: 'CRITICAL', category: 'Subscription / Tier Health', title: 'Event Organizer tier does not have an active subscription', description: 'This account has Event Organizer features but does not show an active or trialing subscription.', affected_entity_type: 'VendorAccount', affected_entity_id: vendor.id, affected_display_name: name, suggested_fix: 'Manual billing review required before changing access.', metadata: { safe_repair: false } });
    if (['active', 'trialing'].includes(vendor.subscription_status) && vendor.is_active === false) addIssue(issues, { issue_key: `vendor:${vendor.id}:subscription-inactive-account`, severity: 'WARNING', category: 'Subscription / Tier Health', title: 'Active subscription is attached to an inactive vendor account', description: 'This account appears to have an active subscription but the vendor account is inactive.', affected_entity_type: 'VendorAccount', affected_entity_id: vendor.id, affected_display_name: name, suggested_fix: 'Manual billing and account status review required.', metadata: { safe_repair: false } });
    if (!isBlank(vendor.vendor_account_number) && !reservationByKey.has(`vendor_account_number:${norm(vendor.vendor_account_number)}:${vendor.id}`)) addIssue(issues, { issue_key: `vendor:${vendor.id}:number-reservation-missing`, severity: 'WARNING', category: 'VendorAccountIdentityReservation Health', title: 'Vendor account number is missing its reservation record', description: 'This vendor has an account number, but the identity reservation record that protects it from reuse is missing.', affected_entity_type: 'VendorAccount', affected_entity_id: vendor.id, affected_display_name: name, suggested_fix: 'Create the missing identity reservation.', metadata: { safe_repair: true, repair_action: 'repairVendorIdentity' } });
    if (!isBlank(vendor.vendor_slug) && !reservationByKey.has(`vendor_slug:${norm(vendor.vendor_slug)}:${vendor.id}`)) addIssue(issues, { issue_key: `vendor:${vendor.id}:slug-reservation-missing`, severity: 'WARNING', category: 'VendorAccountIdentityReservation Health', title: 'Vendor slug is missing its reservation record', description: 'This vendor has a public slug, but the identity reservation record that protects it from reuse is missing.', affected_entity_type: 'VendorAccount', affected_entity_id: vendor.id, affected_display_name: name, suggested_fix: 'Create the missing identity reservation.', metadata: { safe_repair: true, repair_action: 'repairVendorIdentity' } });
  }

  for (const [value, items] of findDuplicates(vendors, 'vendor_account_number')) addIssue(issues, { issue_key: `vendor-number-duplicate:${value}`, severity: 'CRITICAL', category: 'VendorAccount Health', title: 'Duplicate vendor account number', description: 'More than one vendor account is using the same account number, which can break support lookup and ownership matching.', affected_entity_type: 'VendorAccount', affected_entity_id: items.map((v) => v.id).join(','), affected_display_name: value, suggested_fix: 'Manual review required before changing account numbers.', metadata: { safe_repair: false } });
  for (const [value, items] of findDuplicates(vendors, 'vendor_slug')) addIssue(issues, { issue_key: `vendor-slug-duplicate:${value}`, severity: 'CRITICAL', category: 'VendorAccount Health', title: 'Duplicate vendor public slug', description: 'More than one vendor account is using the same public slug, so public vendor pages may route to the wrong account.', affected_entity_type: 'VendorAccount', affected_entity_id: items.map((v) => v.id).join(','), affected_display_name: value, suggested_fix: 'Manual review required before changing public URLs.', metadata: { safe_repair: false } });
}

function checkReservations(issues, vendors, reservations) {
  const vendorIds = new Set(vendors.map((v) => v.id));
  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const buckets = new Map();
  for (const r of reservations) {
    const key = `${r.type}:${norm(r.value)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(r);
    if (r.vendor_account_id && !vendorIds.has(r.vendor_account_id)) addIssue(issues, { issue_key: `reservation:${r.id}:missing-vendor`, severity: 'WARNING', category: 'VendorAccountIdentityReservation Health', title: 'Identity reservation points to a missing vendor account', description: 'This reserved account number or slug is linked to a vendor account that no longer exists.', affected_entity_type: 'VendorAccountIdentityReservation', affected_entity_id: r.id, affected_display_name: r.value, suggested_fix: 'Manual review required before retiring or reassigning this identity.', metadata: { safe_repair: false } });
    const vendor = vendorById.get(r.vendor_account_id);
    if (vendor && r.type === 'vendor_account_number' && norm(vendor.vendor_account_number) !== norm(r.value)) addIssue(issues, { issue_key: `reservation:${r.id}:wrong-number-owner`, severity: 'WARNING', category: 'VendorAccountIdentityReservation Health', title: 'Account number reservation does not match the vendor record', description: 'This account number reservation is attached to a vendor, but the vendor record shows a different account number.', affected_entity_type: 'VendorAccountIdentityReservation', affected_entity_id: r.id, affected_display_name: r.value, suggested_fix: 'Manual identity review required.', metadata: { safe_repair: false } });
    if (vendor && r.type === 'vendor_slug' && norm(vendor.vendor_slug) !== norm(r.value)) addIssue(issues, { issue_key: `reservation:${r.id}:wrong-slug-owner`, severity: 'WARNING', category: 'VendorAccountIdentityReservation Health', title: 'Slug reservation does not match the vendor record', description: 'This slug reservation is attached to a vendor, but the vendor record shows a different public slug.', affected_entity_type: 'VendorAccountIdentityReservation', affected_entity_id: r.id, affected_display_name: r.value, suggested_fix: 'Manual identity review required.', metadata: { safe_repair: false } });
  }
  for (const [key, items] of buckets.entries()) {
    const vendorCount = new Set(items.map((r) => r.vendor_account_id)).size;
    if (items.length > 1) addIssue(issues, { issue_key: `reservation-duplicate:${key}`, severity: vendorCount > 1 ? 'CRITICAL' : 'WARNING', category: 'VendorAccountIdentityReservation Health', title: 'Duplicate identity reservation', description: 'The same vendor identity value appears in more than one reservation record, which can cause future account number or slug conflicts.', affected_entity_type: 'VendorAccountIdentityReservation', affected_entity_id: items.map((r) => r.id).join(','), affected_display_name: key, suggested_fix: 'Manual review required before deleting or retiring duplicate reservations.', metadata: { safe_repair: false } });
  }
}

function checkCollaborations(issues, collaborators, events, vendors) {
  const eventById = new Map(events.map((e) => [e.id, e]));
  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  for (const collab of collaborators) {
    const event = eventById.get(collab.event_id);
    const vendor = vendorById.get(collab.organization_id);
    const name = `${collab.organization_name || vendor?.business_name || 'Organization'} → ${event?.title || collab.event_id || 'Event'}`;
    if (collab.status === 'pending' && new Date(collab.invited_at || collab.created_date || 0).getTime() < cutoff) addIssue(issues, { issue_key: `collab:${collab.id}:stale-pending`, severity: 'WARNING', category: 'Event Organizer Collaboration Health', title: 'Pending collaboration invite is older than 14 days', description: 'This collaboration invitation has been pending for more than 14 days and may confuse organizers or keep stale records around.', affected_entity_type: 'EventCollaborator', affected_entity_id: collab.id, affected_display_name: name, suggested_fix: 'Mark the stale invitation as removed if it is no longer needed.', metadata: { safe_repair: true, repair_action: 'expirePendingCollaborator' } });
    if (collab.status === 'accepted' && !collab.permissions) addIssue(issues, { issue_key: `collab:${collab.id}:missing-permissions`, severity: 'WARNING', category: 'Event Organizer Collaboration Health', title: 'Accepted collaborator is missing permissions', description: 'This accepted collaborator does not have a saved permission set, so event access may behave unpredictably.', affected_entity_type: 'EventCollaborator', affected_entity_id: collab.id, affected_display_name: name, suggested_fix: 'Fill safe default permissions based on the collaborator role.', metadata: { safe_repair: true, repair_action: 'defaultCollaboratorPermissions' } });
    if (collab.status === 'accepted' && !event) addIssue(issues, { issue_key: `collab:${collab.id}:missing-event`, severity: 'WARNING', category: 'Event Organizer Collaboration Health', title: 'Accepted collaborator is linked to a missing event', description: 'This collaborator has accepted access, but the event record is missing.', affected_entity_type: 'EventCollaborator', affected_entity_id: collab.id, affected_display_name: name, suggested_fix: 'Manual review required before removing access.', metadata: { safe_repair: false } });
    if (collab.status === 'accepted' && !vendor) addIssue(issues, { issue_key: `collab:${collab.id}:missing-vendor`, severity: 'WARNING', category: 'Event Organizer Collaboration Health', title: 'Accepted collaborator is linked to a missing organization', description: 'This collaborator has accepted access, but the organization account is missing.', affected_entity_type: 'EventCollaborator', affected_entity_id: collab.id, affected_display_name: name, suggested_fix: 'Manual review required before removing access.', metadata: { safe_repair: false } });
    if (collab.status !== 'accepted' && collab.permissions && Object.values(collab.permissions).some(Boolean)) addIssue(issues, { issue_key: `collab:${collab.id}:inactive-has-access`, severity: 'CRITICAL', category: 'Event Organizer Collaboration Health', title: 'Inactive collaborator still appears to have access', description: 'This collaborator is pending, declined, or removed but still has permissions saved.', affected_entity_type: 'EventCollaborator', affected_entity_id: collab.id, affected_display_name: name, suggested_fix: 'Manual review required before changing access.', metadata: { safe_repair: false } });
    if (collab.permissions && OWNER_ONLY_PERMISSION_KEYS.some((key) => collab.permissions[key])) addIssue(issues, { issue_key: `collab:${collab.id}:owner-only-permissions`, severity: 'CRITICAL', category: 'Event Organizer Collaboration Health', title: 'Collaborator has owner-only permissions', description: 'This collaborator has permissions that should only belong to the event owner.', affected_entity_type: 'EventCollaborator', affected_entity_id: collab.id, affected_display_name: name, suggested_fix: 'Manual review required before removing owner-level permissions.', metadata: { safe_repair: false } });
    if (vendor && vendor.vendor_tier !== 'event_organizer') addIssue(issues, { issue_key: `collab:${collab.id}:non-organizer`, severity: 'WARNING', category: 'Event Organizer Collaboration Health', title: 'Collaborator organization is not an Event Organizer account', description: 'This collaboration invite is attached to a vendor account that is not currently marked as an Event Organizer.', affected_entity_type: 'EventCollaborator', affected_entity_id: collab.id, affected_display_name: name, suggested_fix: 'Manual review required to confirm whether this organization should have event collaboration access.', metadata: { safe_repair: false } });
    if (collab.status === 'accepted' && vendor && (vendor.is_active === false || !['active', 'trialing'].includes(vendor.subscription_status))) addIssue(issues, { issue_key: `collab:${collab.id}:inactive-or-unpaid-organizer`, severity: 'CRITICAL', category: 'Event Organizer Collaboration Health', title: 'Inactive or unpaid organizer still has collaboration access', description: 'This organization has accepted collaboration access but is inactive or does not have an active Event Organizer subscription.', affected_entity_type: 'EventCollaborator', affected_entity_id: collab.id, affected_display_name: name, suggested_fix: 'Manual billing and access review required.', metadata: { safe_repair: false } });
  }
}

function checkEvents(issues, events, vendors, collaborators) {
  const vendorIds = new Set(vendors.map((v) => v.id));
  const ownerCollabEvents = new Set(collaborators.filter((c) => c.is_primary_owner || c.role === 'owner').map((c) => c.event_id));
  for (const event of events) {
    const name = event.title || event.id;
    if (!event.organizer_business_id || !vendorIds.has(event.organizer_business_id)) addIssue(issues, { issue_key: `event:${event.id}:missing-owner-vendor`, severity: 'WARNING', category: 'Event Health', title: 'Event is missing its owner vendor account', description: 'This event is not linked to a valid owner organization, so organizer access and public attribution may not work correctly.', affected_entity_type: 'VendorEvent', affected_entity_id: event.id, affected_display_name: name, suggested_fix: 'Manual review required to confirm the correct event owner.', metadata: { safe_repair: false } });
    if (isBlank(event.latitude) || isBlank(event.longitude)) addIssue(issues, { issue_key: `event:${event.id}:missing-location`, severity: 'WARNING', category: 'Event Health', title: 'Event is missing map location', description: 'This event is missing latitude or longitude, so it may not appear correctly on the map.', affected_entity_type: 'VendorEvent', affected_entity_id: event.id, affected_display_name: name, suggested_fix: 'Add or confirm the event location.', metadata: { safe_repair: false } });
    if (isBlank(event.startDateTime) || isBlank(event.endDateTime)) addIssue(issues, { issue_key: `event:${event.id}:missing-dates`, severity: 'WARNING', category: 'Event Health', title: 'Event is missing start or end date', description: 'This event does not have a complete start and end time, so visibility and scheduling may not work correctly.', affected_entity_type: 'VendorEvent', affected_entity_id: event.id, affected_display_name: name, suggested_fix: 'Add the missing event date or time.', metadata: { safe_repair: false } });
    if (event.startDateTime && event.endDateTime && new Date(event.endDateTime) < new Date(event.startDateTime)) addIssue(issues, { issue_key: `event:${event.id}:end-before-start`, severity: 'WARNING', category: 'Event Health', title: 'Event ends before it starts', description: 'This event has an end date earlier than its start date, so scheduling and visibility may be wrong.', affected_entity_type: 'VendorEvent', affected_entity_id: event.id, affected_display_name: name, suggested_fix: 'Correct the event start and end dates.', metadata: { safe_repair: false } });
    if (event.endDateTime && new Date(event.endDateTime) < new Date() && PUBLIC_EVENT_STATUSES.includes(event.status)) addIssue(issues, { issue_key: `event:${event.id}:expired-visible`, severity: 'CRITICAL', category: 'Event Health', title: 'Expired event still appears publicly visible', description: 'This event has already ended but still has a public status.', affected_entity_type: 'VendorEvent', affected_entity_id: event.id, affected_display_name: name, suggested_fix: 'Mark the expired event as completed if it should no longer be public.', metadata: { safe_repair: true, repair_action: 'markExpiredEventCompleted' } });
    if (event.status === 'cancelled' && PUBLIC_EVENT_STATUSES.includes(event.status)) addIssue(issues, { issue_key: `event:${event.id}:cancelled-visible`, severity: 'CRITICAL', category: 'Event Health', title: 'Canceled event still appears publicly visible', description: 'This event is canceled but still appears to be public.', affected_entity_type: 'VendorEvent', affected_entity_id: event.id, affected_display_name: name, suggested_fix: 'Manual visibility review required.', metadata: { safe_repair: false } });
    if (!ownerCollabEvents.has(event.id)) addIssue(issues, { issue_key: `event:${event.id}:no-owner-collab`, severity: 'NOTICE', category: 'Event Health', title: 'Event has no owner collaborator record', description: 'This event works from its organizer fields, but it does not have an owner collaborator record for the newer collaboration system.', affected_entity_type: 'VendorEvent', affected_entity_id: event.id, affected_display_name: name, suggested_fix: 'Legacy migration can add an owner collaborator record if collaboration features require it.', metadata: { safe_repair: false } });
  }
}

function checkListings(issues, listings) {
  for (const listing of listings) {
    const name = listing.title || listing.event_name || listing.listingNumber || listing.id;
    if (VISIBLE_LISTING_STATUSES.includes(listing.status) && listing.endDateTime && new Date(listing.endDateTime) < new Date()) addIssue(issues, { issue_key: `listing:${listing.id}:expired-visible`, severity: 'CRITICAL', category: 'Listing / Map Visibility Health', title: 'Expired listing still appears map-visible', description: 'This listing has ended but still has a status that can keep it visible on the map.', affected_entity_type: 'Listing', affected_entity_id: listing.id, affected_display_name: name, suggested_fix: 'Mark the expired listing as expired or completed.', metadata: { safe_repair: true, repair_action: 'expireListing' } });
    if (HIDDEN_LISTING_STATUSES.includes(listing.status) && listing.map_visible === true) addIssue(issues, { issue_key: `listing:${listing.id}:hidden-map-visible`, severity: 'CRITICAL', category: 'Listing / Map Visibility Health', title: 'Hidden listing still has map visibility enabled', description: 'This listing is expired, canceled, hidden, or removed but still has map visibility enabled.', affected_entity_type: 'Listing', affected_entity_id: listing.id, affected_display_name: name, suggested_fix: 'Turn off map visibility for this listing.', metadata: { safe_repair: true, repair_action: 'disableListingMapVisibility' } });
    if (isBlank(listing.lat) || isBlank(listing.lng)) addIssue(issues, { issue_key: `listing:${listing.id}:missing-coordinates`, severity: 'WARNING', category: 'Listing / Map Visibility Health', title: 'Listing is missing coordinates', description: 'This listing is missing latitude or longitude, so it may not appear correctly on the map.', affected_entity_type: 'Listing', affected_entity_id: listing.id, affected_display_name: name, suggested_fix: 'Ask the owner or an admin to confirm the address and map pin.', metadata: { safe_repair: false } });
    if (isBlank(listing.timeZoneId)) addIssue(issues, { issue_key: `listing:${listing.id}:missing-timezone`, severity: 'WARNING', category: 'Listing / Map Visibility Health', title: 'Listing is missing a timezone', description: 'This listing does not have a timezone, so start and end times may be interpreted incorrectly.', affected_entity_type: 'Listing', affected_entity_id: listing.id, affected_display_name: name, suggested_fix: 'Repair the listing timezone from its location.', metadata: { safe_repair: false } });
    if (safeArray(listing.earlyVisibilityDates).some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(String(d)))) addIssue(issues, { issue_key: `listing:${listing.id}:bad-early-dates`, severity: 'WARNING', category: 'Listing / Map Visibility Health', title: 'Premium early visibility dates are malformed', description: 'This listing has early visibility dates that are not saved in the expected date format.', affected_entity_type: 'Listing', affected_entity_id: listing.id, affected_display_name: name, suggested_fix: 'Manual review required before changing premium visibility dates.', metadata: { safe_repair: false } });
  }
}

function checkNotifications(issues, notifications, collaborators) {
  const collaboratorIds = new Set(collaborators.map((c) => c.id));
  const unreadCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const spam = new Map();
  for (const n of notifications) {
    const recipient = n.userId || n.user_id || n.user_email;
    if (isBlank(recipient)) addIssue(issues, { issue_key: `notification:${n.id}:missing-recipient`, severity: 'WARNING', category: 'Notification Health', title: 'Notification is missing a recipient', description: 'This notification is not attached to a user or email, so nobody can receive it.', affected_entity_type: 'Notification', affected_entity_id: n.id, affected_display_name: n.title || n.type || n.id, suggested_fix: 'Manual review required before deleting or reassigning the notification.', metadata: { safe_repair: false } });
    if ((n.read === false || n.is_read === false) && new Date(n.created_date || 0).getTime() < unreadCutoff) addIssue(issues, { issue_key: `notification:${n.id}:old-unread`, severity: 'NOTICE', category: 'Notification Health', title: 'Unread notification is older than 30 days', description: 'This notification has been unread for more than 30 days and may no longer be useful.', affected_entity_type: 'Notification', affected_entity_id: n.id, affected_display_name: n.title || n.type || n.id, suggested_fix: 'No immediate action required unless this causes notification clutter.', metadata: { safe_repair: false } });
    if (n.related_entity_type === 'EventCollaborator' && n.related_entity_id && !collaboratorIds.has(n.related_entity_id)) addIssue(issues, { issue_key: `notification:${n.id}:missing-collab`, severity: 'WARNING', category: 'Notification Health', title: 'Collaboration notification points to a missing invite', description: 'This notification refers to an event collaboration invite that no longer exists.', affected_entity_type: 'Notification', affected_entity_id: n.id, affected_display_name: n.title || n.type || n.id, suggested_fix: 'Manual review required before removing the notification.', metadata: { safe_repair: false } });
    const key = `${recipient}:${n.type}:${n.related_entity_type}:${n.related_entity_id}`;
    if (!spam.has(key)) spam.set(key, []);
    spam.get(key).push(n);
  }
  for (const [key, items] of spam.entries()) {
    if (items.length > 5) addIssue(issues, { issue_key: `notification-spam:${key}`, severity: 'NOTICE', category: 'Notification Health', title: 'Possible duplicate notification spam', description: 'The same user appears to have received many notifications for the same action or record.', affected_entity_type: 'Notification', affected_entity_id: items.map((n) => n.id).join(','), affected_display_name: key, suggested_fix: 'Review the notification trigger before deleting records.', metadata: { safe_repair: false } });
  }
}

function checkAdmins(issues, adminProfiles, auditLogs) {
  for (const profile of adminProfiles) {
    const name = profile.email || profile.employee_id || profile.id;
    if (isBlank(profile.employee_id)) addIssue(issues, { issue_key: `admin:${profile.id}:missing-employee-id`, severity: 'CRITICAL', category: 'Admin / Security Health', title: 'Admin profile is missing an employee ID', description: 'This admin profile does not have an employee ID, so the second admin verification step may not work correctly.', affected_entity_type: 'AdminProfile', affected_entity_id: profile.id, affected_display_name: name, suggested_fix: 'Manual admin review required to assign a unique employee ID.', metadata: { safe_repair: false } });
    if (profile.is_active === false && profile.last_login_at) addIssue(issues, { issue_key: `admin:${profile.id}:inactive-login-history`, severity: 'WARNING', category: 'Admin / Security Health', title: 'Inactive admin has previous access history', description: 'This inactive admin has login history. Confirm that access is fully disabled.', affected_entity_type: 'AdminProfile', affected_entity_id: profile.id, affected_display_name: name, suggested_fix: 'Manual security review required.', metadata: { safe_repair: false } });
    if (!Array.isArray(profile.capabilities)) addIssue(issues, { issue_key: `admin:${profile.id}:missing-capabilities`, severity: 'WARNING', category: 'Admin / Security Health', title: 'Admin role is missing a permissions list', description: 'This admin profile does not have a saved permissions list, so access may rely on role defaults.', affected_entity_type: 'AdminProfile', affected_entity_id: profile.id, affected_display_name: name, suggested_fix: 'Review and save permissions for this admin profile.', metadata: { safe_repair: false } });
  }
  for (const [value, items] of findDuplicates(adminProfiles, 'employee_id')) addIssue(issues, { issue_key: `admin-employee-duplicate:${value}`, severity: 'CRITICAL', category: 'Admin / Security Health', title: 'Duplicate admin employee ID', description: 'More than one admin profile is using the same employee ID, which can break admin verification.', affected_entity_type: 'AdminProfile', affected_entity_id: items.map((p) => p.id).join(','), affected_display_name: value, suggested_fix: 'Manual security review required before changing employee IDs.', metadata: { safe_repair: false } });
  if (auditLogs.length === 0) addIssue(issues, { issue_key: 'admin-audit-log-empty', severity: 'NOTICE', category: 'Admin / Security Health', title: 'Admin audit log is empty', description: 'No admin audit logs were found. Sensitive admin actions should leave an audit trail.', affected_entity_type: 'AdminAuditLog', affected_entity_id: '', affected_display_name: 'Admin audit log', suggested_fix: 'Confirm audit logging is active for sensitive admin actions.', metadata: { safe_repair: false } });
}

function checkLegacy(issues, vendors, events, listings) {
  const oldCutoff = new Date('2026-05-11T00:00:00.000Z').getTime();
  for (const record of [...vendors.map((r) => ['VendorAccount', r]), ...events.map((r) => ['VendorEvent', r]), ...listings.map((r) => ['Listing', r])]) {
    const [type, item] = record;
    if (new Date(item.created_date || Date.now()).getTime() < oldCutoff && !item.migration_completed) addIssue(issues, { issue_key: `legacy:${type}:${item.id}:migration-flag`, severity: 'NOTICE', category: 'Legacy Migration Health', title: 'Legacy record has no migration completion flag', description: 'This older record does not show that it completed the latest migration pass. It may still work, but should be checked for missing defaults.', affected_entity_type: type, affected_entity_id: item.id, affected_display_name: item.business_name || item.title || item.id, suggested_fix: 'Run the appropriate repair or migration function when safe.', metadata: { safe_repair: false } });
  }
}

async function upsertIssues(base44, detectedIssues) {
  const existing = await listAll(base44, 'SystemHealthIssue');
  const existingByKey = new Map(existing.map((issue) => [issue.issue_key, issue]));
  let critical = 0;
  let warning = 0;
  let notice = 0;

  for (const issue of detectedIssues.values()) {
    if (issue.severity === 'CRITICAL') critical += 1;
    if (issue.severity === 'WARNING') warning += 1;
    if (issue.severity === 'NOTICE') notice += 1;
    const current = existingByKey.get(issue.issue_key);
    if (current) {
      await base44.asServiceRole.entities.SystemHealthIssue.update(current.id, {
        ...issue,
        first_detected_at: current.first_detected_at || issue.first_detected_at,
        status: current.status === 'ignored' ? 'ignored' : 'open',
        resolved_at: null,
      });
    } else {
      await base44.asServiceRole.entities.SystemHealthIssue.create(issue);
    }
  }

  let resolved = 0;
  for (const issue of existing) {
    if (!detectedIssues.has(issue.issue_key) && ['open', 'reviewed'].includes(issue.status)) {
      resolved += 1;
      await base44.asServiceRole.entities.SystemHealthIssue.update(issue.id, {
        status: 'resolved',
        resolved_at: nowIso(),
        resolved_by: 'system_health_scan',
      });
    }
  }

  return { critical, warning, notice, resolved };
}

async function repairIssue(base44, payload, adminEmail) {
  const issue = await base44.asServiceRole.entities.SystemHealthIssue.get(payload.issue_id);
  if (!issue?.metadata?.safe_repair) return { repaired: false, message: 'Manual review required.' };
  const action = issue.metadata.repair_action;

  if (action === 'repairVendorIdentity') {
    await base44.asServiceRole.functions.invoke('repairVendorAccounts', { secret: Deno.env.get('YARDIT_VENDOR_SYNC_SECRET') });
  } else if (action === 'defaultVendorTier') {
    await base44.asServiceRole.entities.VendorAccount.update(issue.affected_entity_id, { vendor_tier: 'free' });
  } else if (action === 'defaultCollaboratorPermissions') {
    await base44.asServiceRole.entities.EventCollaborator.update(issue.affected_entity_id, { permissions: { view: true, edit_schedule: false, manage_vendors: false } });
  } else if (action === 'expirePendingCollaborator') {
    await base44.asServiceRole.entities.EventCollaborator.update(issue.affected_entity_id, { status: 'removed', responded_at: nowIso() });
  } else if (action === 'markExpiredEventCompleted') {
    await base44.asServiceRole.entities.VendorEvent.update(issue.affected_entity_id, { status: 'completed' });
  } else if (action === 'expireListing') {
    await base44.asServiceRole.entities.Listing.update(issue.affected_entity_id, { status: 'expired' });
  } else if (action === 'disableListingMapVisibility') {
    await base44.asServiceRole.entities.Listing.update(issue.affected_entity_id, { map_visible: false });
  } else {
    return { repaired: false, message: 'Manual review required.' };
  }

  await base44.asServiceRole.entities.SystemHealthIssue.update(issue.id, { status: 'resolved', resolved_at: nowIso(), resolved_by: adminEmail });
  return { repaired: true, message: 'Safe repair completed.' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await assertMaster(base44);
    if (!auth) return Response.json({ error: 'Forbidden: Master Admin access required' }, { status: 403 });

    const payload = await req.json().catch(() => ({}));
    if (payload.action === 'repairIssue') {
      const result = await repairIssue(base44, payload, auth.user.email);
      return Response.json(result);
    }

    const [vendors, reservations, collaborators, events, listings, notifications, adminProfiles, auditLogs] = await Promise.all([
      listAll(base44, 'VendorAccount'),
      listAll(base44, 'VendorAccountIdentityReservation'),
      listAll(base44, 'EventCollaborator'),
      listAll(base44, 'VendorEvent'),
      listAll(base44, 'Listing'),
      listAll(base44, 'Notification'),
      listAll(base44, 'AdminProfile'),
      listAll(base44, 'AdminAuditLog'),
    ]);

    const issues = new Map();
    const errors = [];
    const checks = [
      () => checkVendorAccounts(issues, vendors, reservations),
      () => checkReservations(issues, vendors, reservations),
      () => checkCollaborations(issues, collaborators, events, vendors),
      () => checkEvents(issues, events, vendors, collaborators),
      () => checkListings(issues, listings),
      () => checkNotifications(issues, notifications, collaborators),
      () => checkAdmins(issues, adminProfiles, auditLogs),
      () => checkLegacy(issues, vendors, events, listings),
    ];

    for (const check of checks) {
      try { check(); } catch (error) { errors.push(error.message); }
    }

    const counts = await upsertIssues(base44, issues);
    return Response.json({
      total_scanned: vendors.length + reservations.length + collaborators.length + events.length + listings.length + notifications.length + adminProfiles.length + auditLogs.length,
      critical_count: counts.critical,
      warning_count: counts.warning,
      notice_count: counts.notice,
      resolved_count: counts.resolved,
      categories_checked: ['VendorAccount Health', 'VendorAccountIdentityReservation Health', 'Event Organizer Collaboration Health', 'Event Health', 'Listing / Map Visibility Health', 'Notification Health', 'Subscription / Tier Health', 'Admin / Security Health', 'Legacy Migration Health'],
      errors,
      scanned_at: nowIso(),
    });
  } catch (error) {
    console.error('runSystemHealthScan error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});