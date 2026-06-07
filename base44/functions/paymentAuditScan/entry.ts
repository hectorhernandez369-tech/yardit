import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PAYMENT_ACCESS_CAPABILITIES = new Set([
  'billing.payments.view',
  'billing.history.view',
  'billing.refunds.approve',
  'billing.refunds.issue'
]);

const MASTER_ROLES = new Set(['master', 'super_master']);
const PAID_STATUSES = new Set(['paid', 'skipped_admin_promo', 'waived']);
const NO_CHARGE_STATUSES = new Set(['skipped_admin_promo', 'waived']);
const RECORD_TYPES = new Set(['listing', 'vendor_event', 'vendor_account', 'neighborhood_sale']);

function safeDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function cents(tx) {
  return Number(tx?.final_amount_cents ?? tx?.amount_cents ?? 0);
}

function parseMetadata(tx) {
  if (!tx?.metadata_json) return {};
  try {
    return JSON.parse(tx.metadata_json) || {};
  } catch {
    return {};
  }
}

function normalizeRecordType(value, tx) {
  const raw = String(value || '').toLowerCase();
  if (raw === 'listing' || raw === 'listings') return 'listing';
  if (raw === 'vendor_event' || raw === 'vendor_event_promotion' || raw === 'event') return 'vendor_event';
  if (raw === 'vendor_account' || raw === 'vendor') return 'vendor_account';
  if (raw === 'neighborhood_sale') return 'neighborhood_sale';
  if (tx?.transaction_type === 'listing_payment' || tx?.transaction_type === 'listing_upgrade') return 'listing';
  if (tx?.transaction_type === 'vendor_event_promotion_upgrade') return 'vendor_event';
  if (tx?.transaction_type === 'vendor_subscription' || tx?.transaction_type === 'vendor_tier_upgrade') return 'vendor_account';
  return raw || '';
}

function getTxRecordId(tx) {
  const meta = parseMetadata(tx);
  return tx?.yardit_record_id || meta.yardit_record_id || meta.listing_id || meta.event_id || meta.neighborhood_sale_id || meta.vendor_event_id || meta.vendor_account_id || '';
}

function getRecordLabel(record) {
  return record?.listingNumber || record?.listing_number || record?.event_name || record?.title || record?.organizer_business_name || record?.business_name || '';
}

function getRecordOwnerId(record) {
  return record?.ownerUserId || record?.organizer_user_id || record?.user_id || record?.created_by || '';
}

function buildKey(type, recordType, recordId, txId, extra = '') {
  return [type, recordType || 'none', recordId || 'none', txId || 'none', extra || ''].join('|');
}

function makeIssue({ type, severity, recordType, record, tx, suggestedFix, details }) {
  const recordId = record?.id || getTxRecordId(tx) || '';
  const paymentTransactionId = tx?.id || '';
  return {
    issue_key: buildKey(type, recordType, recordId, paymentTransactionId, tx?.stripe_checkout_session_id || tx?.stripe_payment_intent_id || ''),
    issue_type: type,
    severity,
    record_type: recordType || normalizeRecordType(tx?.yardit_record_type, tx),
    record_id: recordId,
    record_label: getRecordLabel(record),
    owner_user_id: getRecordOwnerId(record) || tx?.user_id || '',
    owner_email: tx?.user_email || '',
    payment_status: record?.payment_status || record?.status || tx?.status || tx?.payment_status || '',
    amount_cents: cents(tx) || Math.round(Number(record?.pricePaid || 0) * 100),
    stripe_checkout_session_id: tx?.stripe_checkout_session_id || record?.stripe_checkout_session_id || record?.pending_checkout_session_id || '',
    stripe_payment_intent_id: tx?.stripe_payment_intent_id || record?.stripe_payment_intent_id || '',
    payment_transaction_id: paymentTransactionId,
    created_date: tx?.created_date || record?.created_date || '',
    updated_date: tx?.updated_date || record?.updated_date || tx?.processed_at || tx?.received_at || '',
    suggested_fix: suggestedFix,
    details: details || ''
  };
}

function userHasPaymentAccess(user, adminProfile) {
  const role = adminProfile?.role_label || user?.role;
  if (MASTER_ROLES.has(role)) return true;
  const capabilities = Array.isArray(adminProfile?.capabilities) ? adminProfile.capabilities : [];
  return capabilities.some((capability) => PAYMENT_ACCESS_CAPABILITIES.has(capability));
}

async function getAuthorizedAdmin(base44, user) {
  const byUserId = await base44.asServiceRole.entities.AdminProfile.filter({ user_id: user.id });
  const byEmail = await base44.asServiceRole.entities.AdminProfile.filter({ email: String(user.email || '').toLowerCase() });
  const adminProfile = byUserId[0] || byEmail[0] || null;
  if (!adminProfile || adminProfile.is_active !== true || !userHasPaymentAccess(user, adminProfile)) return null;
  return adminProfile;
}

async function markReview(base44, user, body) {
  const status = body.review_status || 'reviewed';
  const existing = await base44.asServiceRole.entities.PaymentAuditReview.filter({ issue_key: body.issue_key });
  const payload = {
    issue_key: body.issue_key,
    issue_type: body.issue_type || '',
    record_type: body.record_type || '',
    record_id: body.record_id || '',
    payment_transaction_id: body.payment_transaction_id || '',
    review_status: status,
    review_note: body.review_note || '',
    reviewed_by: user.id,
    reviewed_by_email: user.email,
    reviewed_at: new Date().toISOString()
  };
  const saved = existing[0]
    ? await base44.asServiceRole.entities.PaymentAuditReview.update(existing[0].id, payload)
    : await base44.asServiceRole.entities.PaymentAuditReview.create(payload);
  return saved;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const adminProfile = await getAuthorizedAdmin(base44, user);
    if (!adminProfile) return Response.json({ error: 'Forbidden: Payment audit access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    if (body.action === 'markReview') {
      const saved = await markReview(base44, user, body);
      return Response.json({ ok: true, review: saved });
    }

    const thresholdMinutes = Number(body.threshold_minutes || 30);
    const thresholdMs = thresholdMinutes * 60 * 1000;
    const now = Date.now();

    const [listings, transactions, vendorEvents, vendorAccounts, reviews, users] = await Promise.all([
      base44.asServiceRole.entities.Listing.list('-created_date', 1000),
      base44.asServiceRole.entities.PaymentTransaction.list('-created_date', 2000),
      base44.asServiceRole.entities.VendorEvent.list('-created_date', 1000).catch(() => []),
      base44.asServiceRole.entities.VendorAccount.list('-created_date', 1000).catch(() => []),
      base44.asServiceRole.entities.PaymentAuditReview.list('-updated_date', 1000).catch(() => []),
      base44.asServiceRole.entities.User.list().catch(() => [])
    ]);

    const usersById = new Map(users.map((u) => [u.id, u]));
    const listingById = new Map(listings.map((l) => [l.id, l]));
    const vendorEventById = new Map(vendorEvents.map((event) => [event.id, event]));
    const vendorAccountById = new Map(vendorAccounts.map((account) => [account.id, account]));
    const reviewsByKey = new Map(reviews.map((review) => [review.issue_key, review]));
    const issues = [];

    const recordExists = (recordType, recordId) => {
      if (!recordId) return false;
      if (recordType === 'listing' || recordType === 'neighborhood_sale') return listingById.has(recordId);
      if (recordType === 'vendor_event') return vendorEventById.has(recordId);
      if (recordType === 'vendor_account') return vendorAccountById.has(recordId);
      return false;
    };

    const getRecord = (recordType, recordId) => {
      if (recordType === 'listing' || recordType === 'neighborhood_sale') return listingById.get(recordId) || null;
      if (recordType === 'vendor_event') return vendorEventById.get(recordId) || null;
      if (recordType === 'vendor_account') return vendorAccountById.get(recordId) || null;
      return null;
    };

    const txsByLinkedListing = new Map();
    for (const tx of transactions) {
      if (normalizeRecordType(tx.yardit_record_type, tx) === 'listing' && tx.yardit_record_id) {
        if (!txsByLinkedListing.has(tx.yardit_record_id)) txsByLinkedListing.set(tx.yardit_record_id, []);
        txsByLinkedListing.get(tx.yardit_record_id).push(tx);
      }
    }

    for (const listing of listings) {
      const linked = txsByLinkedListing.get(listing.id) || [];
      if (PAID_STATUSES.has(listing.payment_status)) {
        if (NO_CHARGE_STATUSES.has(listing.payment_status)) {
          issues.push(makeIssue({
            type: 'Admin Promo / Waived Payment',
            severity: 'info',
            recordType: 'listing',
            record: listing,
            suggestedFix: 'No charge expected. Confirm the admin promo or waived payment note is appropriate.',
            details: `Listing is marked ${listing.payment_status}.`
          }));
        } else if (!linked.some((tx) => ['succeeded', 'subscription_active'].includes(tx.status))) {
          issues.push(makeIssue({
            type: 'Paid Listing Missing Transaction',
            severity: 'critical',
            recordType: 'listing',
            record: listing,
            suggestedFix: 'Review the listing and Stripe session, then relink manually if the payment is valid.',
            details: 'Listing is paid but no succeeded PaymentTransaction is linked by yardit_record_id.'
          }));
        }
      }

      const pendingSession = listing.pending_checkout_session_id || listing.stripe_checkout_session_id;
      const pendingDate = safeDate(listing.updated_date || listing.created_date);
      const isPending = listing.payment_status === 'pending' || listing.status === 'payment_pending' || listing.status === 'payment_pending_adjustment';
      if (isPending && pendingSession && pendingDate && now - pendingDate.getTime() > thresholdMs) {
        issues.push(makeIssue({
          type: 'Payment Pending Too Long',
          severity: 'warning',
          recordType: 'listing',
          record: listing,
          suggestedFix: 'Check whether the Stripe checkout was abandoned, failed, or completed without webhook confirmation.',
          details: `Pending longer than ${thresholdMinutes} minutes.`
        }));
      }
    }

    for (const tx of transactions) {
      const recordType = normalizeRecordType(tx.yardit_record_type, tx);
      const recordId = tx.yardit_record_id || '';
      const metadata = parseMetadata(tx);
      const metadataRecordId = metadata.yardit_record_id || metadata.listing_id || metadata.event_id || metadata.neighborhood_sale_id || metadata.vendor_event_id || metadata.vendor_account_id || '';
      const record = getRecord(recordType, recordId);

      if (!recordType || !recordId || !recordExists(recordType, recordId)) {
        issues.push(makeIssue({
          type: 'Transactions Missing Record Link',
          severity: recordId ? 'critical' : 'warning',
          recordType,
          record,
          tx,
          suggestedFix: 'Review Stripe metadata and link this transaction to the correct Yardit record if valid.',
          details: !recordType || !recordId ? 'Missing yardit_record_type or yardit_record_id.' : 'Linked Yardit record could not be found.'
        }));
      }

      if (metadataRecordId && recordId && metadataRecordId !== recordId) {
        issues.push(makeIssue({
          type: 'Wrong Record Link / Mismatch',
          severity: 'critical',
          recordType,
          record,
          tx,
          suggestedFix: 'Do not use this receipt until an admin confirms which record the Stripe metadata belongs to.',
          details: `Metadata points to ${metadataRecordId}, but transaction is linked to ${recordId}.`
        }));
      }

      if ((recordType === 'listing' || recordType === 'neighborhood_sale') && record) {
        const allowedSessions = [record.stripe_checkout_session_id, record.pending_checkout_session_id, record.pending_upgrade_checkout_session_id].filter(Boolean);
        const hasSessionMismatch = tx.stripe_checkout_session_id && allowedSessions.length > 0 && !allowedSessions.includes(tx.stripe_checkout_session_id);
        const hasIntentMismatch = tx.stripe_payment_intent_id && record.stripe_payment_intent_id && tx.stripe_payment_intent_id !== record.stripe_payment_intent_id;
        if (hasSessionMismatch || hasIntentMismatch) {
          issues.push(makeIssue({
            type: 'Wrong Record Link / Mismatch',
            severity: 'critical',
            recordType,
            record,
            tx,
            suggestedFix: 'Review the transaction before showing or downloading this receipt.',
            details: hasSessionMismatch ? 'Stripe checkout session does not match the linked listing.' : 'Stripe payment intent does not match the linked listing.'
          }));
        }
      }

      const needsMetadataId = ['listing_payment', 'listing_upgrade', 'vendor_event_promotion_upgrade', 'vendor_subscription', 'vendor_tier_upgrade'].includes(tx.transaction_type);
      if (needsMetadataId && !metadataRecordId && !recordId) {
        issues.push(makeIssue({
          type: 'Stripe Session Without Listing/Event ID',
          severity: 'warning',
          recordType,
          record,
          tx,
          suggestedFix: 'Check the checkout creation metadata for this payment path.',
          details: 'No listing_id, event_id, neighborhood_sale_id, vendor_account_id, or yardit_record_id found.'
        }));
      }

      if (['failed', 'error'].includes(tx.status) || tx.processing_error) {
        issues.push(makeIssue({
          type: 'Webhook/Verification Issues',
          severity: tx.status === 'error' ? 'critical' : 'warning',
          recordType,
          record,
          tx,
          suggestedFix: 'Review the Stripe event and processing error before taking action.',
          details: tx.processing_error || `Transaction status is ${tx.status}.`
        }));
      }
    }

    const duplicateGroups = new Map();
    for (const tx of transactions) {
      const keys = [
        tx.yardit_record_type && tx.yardit_record_id ? `record:${tx.yardit_record_type}:${tx.yardit_record_id}` : '',
        tx.stripe_checkout_session_id ? `session:${tx.stripe_checkout_session_id}` : '',
        tx.stripe_payment_intent_id ? `intent:${tx.stripe_payment_intent_id}` : ''
      ].filter(Boolean);
      for (const key of keys) {
        if (!duplicateGroups.has(key)) duplicateGroups.set(key, []);
        duplicateGroups.get(key).push(tx);
      }
    }

    for (const [groupKey, group] of duplicateGroups.entries()) {
      const succeeded = group.filter((tx) => tx.status === 'succeeded');
      if (group.length > 1 && succeeded.length > 1) {
        const tx = group[0];
        const recordType = normalizeRecordType(tx.yardit_record_type, tx);
        const record = getRecord(recordType, tx.yardit_record_id);
        issues.push(makeIssue({
          type: 'Duplicate Transactions',
          severity: 'critical',
          recordType,
          record,
          tx,
          suggestedFix: 'Review duplicate records. Do not delete automatically; confirm which Stripe event should be canonical.',
          details: `${group.length} transactions share ${groupKey}.`
        }));
      }
    }

    const uniqueIssues = Array.from(new Map(issues.map((issue) => [issue.issue_key, issue])).values());

    const mergedIssues = uniqueIssues.map((issue) => {
      const owner = issue.owner_user_id ? usersById.get(issue.owner_user_id) : null;
      const review = reviewsByKey.get(issue.issue_key);
      return {
        ...issue,
        owner_email: issue.owner_email || owner?.email || '',
        review_status: review?.review_status || 'open',
        review_note: review?.review_note || '',
        reviewed_by_email: review?.reviewed_by_email || '',
        reviewed_at: review?.reviewed_at || ''
      };
    });

    const summary = mergedIssues.reduce((acc, issue) => {
      acc.total += 1;
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      acc.by_status[issue.review_status] = (acc.by_status[issue.review_status] || 0) + 1;
      return acc;
    }, { total: 0, critical: 0, warning: 0, info: 0, by_status: {} });

    return Response.json({ ok: true, generated_at: new Date().toISOString(), threshold_minutes: thresholdMinutes, summary, issues: mergedIssues });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});