import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const asId = (value) => (typeof value === 'string' ? value : value?.id || '');
const nowIso = () => new Date().toISOString();

async function getOwnerEmail(base44, ownerUserId) {
  if (!ownerUserId) return '';
  const users = await base44.asServiceRole.entities.User.filter({ id: ownerUserId });
  return users?.[0]?.email || '';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const listing = payload?.data || payload?.listing || payload;

    if (!listing?.id || !listing?.stripe_checkout_session_id) {
      return Response.json({ ok: true, linked: 0, reason: 'No paid listing session to link' });
    }

    const sessionId = listing.stripe_checkout_session_id;
    const paymentIntentId = listing.stripe_payment_intent_id || '';
    const ownerEmail = await getOwnerEmail(base44, listing.ownerUserId);

    const bySession = await base44.asServiceRole.entities.PaymentTransaction.filter({ stripe_checkout_session_id: sessionId });
    const byIntent = paymentIntentId
      ? await base44.asServiceRole.entities.PaymentTransaction.filter({ stripe_payment_intent_id: paymentIntentId })
      : [];

    const records = [...(bySession || []), ...(byIntent || [])].filter(
      (record, index, arr) => record?.id && arr.findIndex((item) => item.id === record.id) === index
    );

    const linkedPaymentIntentId = paymentIntentId || records.find((record) => record.stripe_payment_intent_id)?.stripe_payment_intent_id || '';
    const patch = {
      yardit_record_type: 'Listing',
      yardit_record_id: listing.id,
      user_id: listing.ownerUserId || '',
      user_email: ownerEmail,
      non_refund_acknowledged: listing.non_refund_acknowledged === true,
      non_refund_acknowledged_at: listing.non_refund_acknowledged_at || '',
      non_refund_acknowledged_by_user_id: listing.non_refund_acknowledged_by_user_id || listing.ownerUserId || '',
      processed_at: nowIso(),
      ...(linkedPaymentIntentId && { stripe_payment_intent_id: linkedPaymentIntentId }),
    };

    await Promise.all(records.map((record) => base44.asServiceRole.entities.PaymentTransaction.update(record.id, patch)));

    const listingPatch = {};
    if (listing.payment_status !== 'paid') listingPatch.payment_status = 'paid';
    if (listing.payment_intent_status !== 'captured') listingPatch.payment_intent_status = 'captured';
    if (linkedPaymentIntentId && listing.stripe_payment_intent_id !== linkedPaymentIntentId) {
      listingPatch.stripe_payment_intent_id = linkedPaymentIntentId;
    }

    if (Object.keys(listingPatch).length > 0) {
      await base44.asServiceRole.entities.Listing.update(listing.id, listingPatch);
    }

    return Response.json({ ok: true, linked: records.length, listing_id: listing.id, session_id: sessionId });
  } catch (error) {
    console.error('Failed to link payment transactions for listing:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to link payment transactions' }, { status: 500 });
  }
});