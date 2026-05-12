import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BATCH_LIMIT = 25;
const SCHEMA_VERSION = '2026-05-12-batch-safe-legacy-repair';
const SENSITIVE_FIELDS = new Set([
  'ownerUserId',
  'owner_user_id',
  'owner_email',
  'owner_name',
  'payment_status',
  'stripe_payment_intent_id',
  'stripe_checkout_session_id',
  'stripe_customer_id',
  'stripe_subscription_id',
  'stripe_price_id',
  'paid_tier',
  'paid_amount',
  'paid_at',
  'refunded_at',
  'refund_status',
  'subscription_status',
  'vendor_tier',
  'current_period_start',
  'current_period_end',
  'cancel_at_period_end',
  'payment_failed_at',
  'last_payment_status',
  'status',
  'visibility_status',
  'is_active',
]);

const nowIso = () => new Date().toISOString();
const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';
const relId = (value) => (value && typeof value === 'object' ? value.id : value);

function safePatch(patch) {
  return Object.fromEntries(Object.entries(patch).filter(([key]) => !SENSITIVE_FIELDS.has(key)));
}

async function assertMaster(base44) {
  const user = await base44.auth.me();
  if (!user) {
    return { allowed: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (user.role === 'master' || user.role_label === 'master') {
    return { allowed: true, user };
  }

  const profiles = await base44.asServiceRole.entities.AdminProfile.filter({ is_active: true }, '-updated_date', 200);
  const profile = profiles.find((item) => relId(item.user_id) === user.id || item.email === user.email || item.user_email === user.email);
  const isMaster = profile?.role_label === 'master' || profile?.role === 'master' || profile?.access_level === 'master';

  if (!isMaster) {
    return { allowed: false, response: Response.json({ error: 'Forbidden: Master Admin access required' }, { status: 403 }) };
  }

  return { allowed: true, user, profile };
}

async function getRecord(base44, entityName, id) {
  if (!entityName || !id || !base44.asServiceRole.entities[entityName]) return null;
  const records = await base44.asServiceRole.entities[entityName].filter({ id }, '-updated_date', 1);
  return records?.[0] || null;
}

function buildPatch(issue, record) {
  const entityType = issue.affected_entity_type;
  const patch = {
    migration_completed: true,
    migration_completed_at: nowIso(),
    schema_version: SCHEMA_VERSION,
  };

  if (entityType === 'Listing') {
    if (isBlank(record.timeZoneId)) patch.timeZoneId = 'America/Los_Angeles';
    if (!Array.isArray(record.photoUrls)) patch.photoUrls = [];
    if (!Array.isArray(record.activeDates)) patch.activeDates = [];
    if (record.is_demo_listing === undefined) patch.is_demo_listing = false;
  }

  if (entityType === 'VendorAccount') {
    if (isBlank(record.vendor_display_name) && !isBlank(record.business_name)) patch.vendor_display_name = record.business_name;
    if (!Array.isArray(record.organization_user_ids)) patch.organization_user_ids = [];
    if (!Array.isArray(record.organization_staff_emails)) patch.organization_staff_emails = [];
  }

  if (entityType === 'VendorEvent') {
    if (isBlank(record.timeZoneId)) patch.timeZoneId = 'America/Los_Angeles';
    if (!Array.isArray(record.photos)) patch.photos = [];
  }

  if (entityType === 'EventCollaborator') {
    if (isBlank(record.invited_at)) patch.invited_at = record.created_date || nowIso();
  }

  if (entityType === 'Notification') {
    if (record.is_read === undefined) patch.is_read = false;
  }

  return safePatch(patch);
}

function shouldSkipIssue(issue) {
  if (!['open', 'reviewed'].includes(issue.status)) return 'Issue is not open or reviewed';
  if (issue.metadata?.safe_repair !== true) return 'Issue is not marked safe for automatic repair';
  if (!issue.affected_entity_type || !issue.affected_entity_id) return 'Issue has no target record';
  return null;
}

function missingRequiredFields(entityType, record) {
  const requiredByEntity = {
    Listing: ['ownerUserId', 'listingType', 'title', 'city', 'zip', 'lat', 'lng', 'timeZoneId', 'tier', 'category', 'startDateTime', 'endDateTime'],
    VendorAccount: ['business_name', 'owner_user_id', 'owner_email', 'vendor_account_number', 'vendor_tier', 'subscription_status', 'is_active'],
    VendorEvent: ['organizer_user_id', 'organizer_business_id', 'title', 'event_type', 'status', 'startDateTime', 'endDateTime', 'latitude', 'longitude'],
    EventCollaborator: ['event_id', 'organization_id', 'role', 'status'],
  };

  return (requiredByEntity[entityType] || []).filter((field) => isBlank(record[field]));
}

async function markIssue(base44, issue, status, note, actor) {
  await base44.asServiceRole.entities.SystemHealthIssue.update(issue.id, {
    status,
    reviewed_by: actor,
    resolved_by: status === 'resolved' ? actor : issue.resolved_by,
    resolved_at: status === 'resolved' ? nowIso() : issue.resolved_at,
    metadata: {
      ...(issue.metadata || {}),
      last_safe_repair_note: note,
      last_safe_repair_at: nowIso(),
    },
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await assertMaster(base44);
    if (!auth.allowed) return auth.response;

    const actor = auth.user.email || auth.user.id || 'master-admin';
    const issues = await base44.asServiceRole.entities.SystemHealthIssue.list('-last_detected_at', 500);
    const candidates = issues
      .filter((issue) => ['open', 'reviewed'].includes(issue.status))
      .sort((a, b) => {
        const severityRank = { CRITICAL: 0, WARNING: 1, NOTICE: 2 };
        const safeA = a.metadata?.safe_repair === true ? 0 : 1;
        const safeB = b.metadata?.safe_repair === true ? 0 : 1;
        return safeA - safeB || (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3);
      })
      .slice(0, BATCH_LIMIT);

    const summary = {
      scanned: 0,
      repaired: 0,
      skipped: 0,
      failed: 0,
      needs_manual_review: 0,
      logs: [],
    };

    for (const issue of candidates) {
      summary.scanned += 1;
      const skipReason = shouldSkipIssue(issue);

      if (skipReason) {
        summary.skipped += 1;
        if (skipReason.includes('not marked safe') || skipReason.includes('no target')) summary.needs_manual_review += 1;
        summary.logs.push({ issue_id: issue.id, action: 'skipped', reason: skipReason });
        continue;
      }

      const record = await getRecord(base44, issue.affected_entity_type, issue.affected_entity_id);
      if (!record) {
        summary.needs_manual_review += 1;
        summary.logs.push({ issue_id: issue.id, action: 'manual_review', reason: 'Target record was not found' });
        await markIssue(base44, issue, 'reviewed', 'Target record was not found during batch repair.', actor);
        continue;
      }

      const missingFields = missingRequiredFields(issue.affected_entity_type, record);
      if (missingFields.length > 0) {
        summary.needs_manual_review += 1;
        summary.logs.push({ issue_id: issue.id, action: 'manual_review', reason: `Missing required fields: ${missingFields.join(', ')}` });
        await markIssue(base44, issue, 'reviewed', `Skipped batch repair because required fields are missing: ${missingFields.join(', ')}`, actor);
        continue;
      }

      const patch = buildPatch(issue, record);
      if (Object.keys(patch).length === 0) {
        summary.skipped += 1;
        summary.logs.push({ issue_id: issue.id, action: 'skipped', reason: 'No safe fields needed repair' });
        await markIssue(base44, issue, 'reviewed', 'No safe fields needed repair.', actor);
        continue;
      }

      try {
        await base44.asServiceRole.entities[issue.affected_entity_type].update(record.id, patch);
        await markIssue(base44, issue, 'resolved', `Batch repair applied safe fields: ${Object.keys(patch).join(', ')}`, actor);
        summary.repaired += 1;
        summary.logs.push({ issue_id: issue.id, entity: issue.affected_entity_type, record_id: record.id, action: 'repaired', fields: Object.keys(patch) });
      } catch (error) {
        summary.failed += 1;
        summary.logs.push({ issue_id: issue.id, entity: issue.affected_entity_type, record_id: record.id, action: 'failed', reason: error.message });
      }
    }

    await base44.asServiceRole.entities.AdminAuditLog.create({
      user_id: auth.user.id,
      admin_employee_id: auth.profile?.employee_id || actor,
      action_type: 'run_safe_legacy_repair_batch',
      target_type: 'system',
      target_id: 'legacy_repair',
      success: true,
      metadata: JSON.stringify(summary),
    });

    return Response.json({
      message: `Safe repair batch complete: ${summary.repaired} repaired, ${summary.skipped} skipped, ${summary.needs_manual_review} need review.`,
      batch_limit: BATCH_LIMIT,
      ...summary,
    });
  } catch (error) {
    console.error('runSafeLegacyRepair error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});