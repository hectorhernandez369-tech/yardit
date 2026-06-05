import Stripe from 'npm:stripe@18.5.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-02-24.acacia',
});

const RESIDENTIAL_PRICES = { free: 0, featured: 499, premium: 799 };
const DATE_UNAVAILABLE_MESSAGE = 'These dates are no longer available for this address. Please select different dates.';
const RESERVED_STATUSES = new Set(['active', 'under_review', 'pending_payment', 'scheduled', 'activated_locked', 'coming_soon', 'payment_pending', 'payment_pending_adjustment']);
const nowIso = () => new Date().toISOString();
const asId = (value) => (typeof value === 'string' ? value : value?.id || '');

function residentialUpgradeAmount(currentTier, targetTier) {
  return Math.max(0, (RESIDENTIAL_PRICES[targetTier] || 0) - (RESIDENTIAL_PRICES[currentTier] || 0));
}

function expandDateRange(startDate, endDate) {
  const dates = [];
  if (!startDate || !endDate) return dates;
  const [sy, sm, sd] = String(startDate).split('-').map(Number);
  const [ey, em, ed] = String(endDate).split('-').map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return dates;
  let cur = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  let guard = 0;
  while (cur <= end && guard++ < 40) {
    const d = new Date(cur);
    dates.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`);
    cur += 86400000;
  }
  return dates;
}

function normalizeAddressPart(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function sameResidentialAddress(listing, ref) {
  if (typeof listing.lat === 'number' && typeof listing.lng === 'number' && typeof ref.lat === 'number' && typeof ref.lng === 'number') {
    if (Math.abs(listing.lat - ref.lat) < 0.0003 && Math.abs(listing.lng - ref.lng) < 0.0003) return true;
  }
  return normalizeAddressPart(listing.addressText) === normalizeAddressPart(ref.addressText) && normalizeAddressPart(listing.zip) === normalizeAddressPart(ref.zip);
}

async function validateResidentialUpgradeDates(base44, listing) {
  if (!listing?.selectedRangeStartDate || !listing?.selectedRangeEndDate) return { ok: false, error: 'Missing selected date range' };
  if (!listing.addressText || !listing.zip || typeof listing.lat !== 'number' || typeof listing.lng !== 'number') {
    return { ok: false, error: 'Verified address, normalized address, coordinates, and selected date range are required before checkout.' };
  }
  const proposed = new Set(expandDateRange(listing.selectedRangeStartDate, listing.selectedRangeEndDate));
  const listings = await base44.asServiceRole.entities.Listing.filter({ zip: listing.zip });
  const now = new Date();
  for (const candidate of listings || []) {
    if (candidate.id === listing.id || candidate.listingType !== 'yard_sale' || candidate.is_demo_listing) continue;
    if (!RESERVED_STATUSES.has(candidate.status)) continue;
    if (candidate.endDateTime && new Date(candidate.endDateTime) < now) continue;
    if (!sameResidentialAddress(candidate, listing)) continue;
    const reserved = [...expandDateRange(candidate.selectedRangeStartDate, candidate.selectedRangeEndDate), ...(candidate.earlyVisibilityDates || [])];
    if (reserved.some((date) => proposed.has(date))) return { ok: false, error: DATE_UNAVAILABLE_MESSAGE };
  }
  return { ok: true };
}

async function webhookConfirmed(base44, sessionId) {
  const records = await base44.asServiceRole.entities.PaymentTransaction.filter({ stripe_checkout_session_id: sessionId });
  return (records || []).some((record) => record.event_type !== 'checkout.session.created' && record.status === 'succeeded');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'create';

    if (action === 'payment_method') {
      const customerId = body?.customer_id;
      if (!customerId) return Response.json({ paymentMethod: null });

      const paymentMethods = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
      const card = paymentMethods.data?.[0]?.card;
      if (!card) return Response.json({ paymentMethod: null });
      return Response.json({ paymentMethod: { brand: String(card.brand || 'card').toUpperCase(), last4: card.last4 } });
    }

    if (action === 'verify') {
      const sessionId = body?.session_id || body?.sessionId;
      if (!sessionId) return Response.json({ error: 'Missing session_id' }, { status: 400 });

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const confirmed = await webhookConfirmed(base44, session.id);
      return Response.json({
        paid: session.payment_status === 'paid' && confirmed,
        stripe_paid: session.payment_status === 'paid',
        webhook_confirmed: confirmed,
        pending_webhook: session.payment_status === 'paid' && !confirmed,
        sessionId: session.id,
      });
    }

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const listingId = body?.listing_id;
    const targetTier = String(body?.target_tier || '').toLowerCase();
    const returnUrl = body?.return_url;
    const customerEmail = body?.customer_email || user.email;
    const customerId = body?.customer_id || undefined;
    const listingKind = body?.listing_kind || 'residential';

    if (!listingId || !targetTier || !returnUrl) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const listings = await base44.asServiceRole.entities.Listing.filter({ id: listingId });
    const listing = listings?.[0];
    if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });
    if (listing.ownerUserId !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (listing.is_demo_listing === true) {
      await base44.asServiceRole.entities.Listing.update(listingId, listing.listingType === 'event'
        ? { tier: targetTier, event_tier: targetTier }
        : { tier: targetTier });
      return Response.json({ ok: true, demo: true, checkoutUrl: null, sessionId: `demo_${Date.now()}` });
    }

    const currentTier = listingKind === 'event' ? (listing.event_tier || listing.tier || 'basic') : (listing.tier || 'free');
    const expectedAmount = listingKind === 'residential'
      ? residentialUpgradeAmount(currentTier, targetTier)
      : Number(body?.amount_cents || 0);
    const amountCents = Number(body?.amount_cents || expectedAmount || 0);

    if (!amountCents || amountCents < 50) return Response.json({ error: 'Invalid upgrade amount' }, { status: 400 });
    if (listingKind === 'residential' && amountCents !== expectedAmount) {
      return Response.json({ error: 'Invalid residential upgrade amount' }, { status: 400 });
    }

    if (listingKind === 'residential') {
      const dateValidation = await validateResidentialUpgradeDates(base44, listing);
      if (!dateValidation.ok) return Response.json({ error: dateValidation.error }, { status: dateValidation.error === DATE_UNAVAILABLE_MESSAGE ? 409 : 400 });
    }

    const separator = String(returnUrl).includes('?') ? '&' : '?';
    const successUrl = `${returnUrl}${separator}payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${returnUrl}${separator}payment=cancel`;
    const metadata = {
      base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
      purpose: 'listing_upgrade',
      transaction_type: 'listing_upgrade',
      listing_id: listingId,
      current_tier: currentTier,
      target_tier: targetTier,
      tier: targetTier,
      listing_kind: listingKind,
      previous_status: listing.status || 'active',
      non_refund_acknowledged: body?.non_refund_acknowledged ? 'true' : 'false',
      non_refund_acknowledged_at: body?.non_refund_acknowledged_at || '',
      non_refund_acknowledged_by_user_id: body?.non_refund_acknowledged_by_user_id || user.id || '',
      non_refund_disclosure_text: body?.non_refund_disclosure_text || '',
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      payment_method_types: ['card'],
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `${listingKind === 'event' ? 'Event' : 'Listing'} Upgrade to ${targetTier}` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      metadata,
      payment_intent_data: { metadata },
    });

    await base44.asServiceRole.entities.Listing.update(listingId, {
      status: 'payment_pending_adjustment',
      pending_upgrade_tier: targetTier,
      pending_upgrade_checkout_session_id: session.id,
      payment_intent_status: 'hold_requested',
    });

    await base44.asServiceRole.entities.PaymentTransaction.create({
      stripe_event_id: `checkout_created_${session.id}`,
      event_type: 'checkout.session.created',
      transaction_type: 'listing_upgrade',
      yardit_record_type: 'Listing',
      yardit_record_id: listingId,
      status: 'received',
      amount_cents: amountCents,
      original_amount_cents: amountCents,
      discount_amount_cents: 0,
      final_amount_cents: amountCents,
      currency: 'usd',
      non_refund_acknowledged: body?.non_refund_acknowledged === true,
      non_refund_acknowledged_at: body?.non_refund_acknowledged_at || '',
      non_refund_acknowledged_by_user_id: body?.non_refund_acknowledged_by_user_id || user.id || '',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: asId(session.payment_intent),
      stripe_customer_id: asId(session.customer),
      payment_status: session.payment_status || session.status || '',
      metadata_json: JSON.stringify(metadata),
      received_at: nowIso(),
      processed_at: nowIso(),
    });

    console.log('Listing upgrade checkout created', { sessionId: session.id, listingId, currentTier, targetTier, amountCents });
    return Response.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    console.error('createListingUpgradeCheckout error', error?.message || error);
    return Response.json({ error: error?.message || 'Upgrade checkout failed' }, { status: 500 });
  }
});