import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@18.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-02-24.acacia',
});

const RESIDENTIAL_PRICES = { featured: 499, premium: 799 };

const RESERVED_STATUSES = new Set([
  'active', 'under_review', 'pending_payment', 'scheduled',
  'activated_locked', 'coming_soon', 'payment_pending', 'payment_pending_adjustment',
]);

function expandDateRange(startDate, endDate) {
  const dates = [];
  if (!startDate || !endDate) return dates;
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const startMs = Date.UTC(sy, sm - 1, sd);
  const endMs = Date.UTC(ey, em - 1, ed);
  const one = 86400000;
  let cur = startMs;
  let guard = 0;
  while (cur <= endMs && guard++ < 40) {
    const d = new Date(cur);
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const da = String(d.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${mo}-${da}`);
    cur += one;
  }
  return dates;
}

async function checkResidentialDateConflict(base44, ownerUserId, lat, lng, startDate, endDate) {
  if (!ownerUserId || !lat || !lng || !startDate || !endDate) return false;
  const listings = await base44.asServiceRole.entities.Listing.filter({ ownerUserId });
  const now = new Date();
  const proposed = new Set(expandDateRange(startDate, endDate));
  for (const l of listings || []) {
    if (l.listingType !== 'yard_sale') continue;
    if (l.is_demo_listing) continue;
    if (!RESERVED_STATUSES.has(l.status)) continue;
    if (l.endDateTime && new Date(l.endDateTime) < now) continue;
    // coordinate match ~100ft
    const dLat = Math.abs((l.lat || 0) - lat);
    const dLng = Math.abs((l.lng || 0) - lng);
    if (dLat >= 0.0003 || dLng >= 0.0003) continue;
    const existing = [...expandDateRange(l.selectedRangeStartDate, l.selectedRangeEndDate),
                     ...(l.earlyVisibilityDates || [])];
    for (const d of existing) {
      if (proposed.has(d)) return true;
    }
  }
  return false;
}
const nowIso = () => new Date().toISOString();
const asId = (value) => (typeof value === 'string' ? value : value?.id || '');

async function createCheckoutRecord(base44, session, payload, transactionType) {
  await base44.asServiceRole.entities.PaymentTransaction.create({
  stripe_event_id: `checkout_created_${session.id}`,
  event_type: 'checkout.session.created',
  transaction_type: transactionType,
  user_id: payload.user_id || payload.owner_user_id || '',
  user_email: payload.user_email || payload.customer_email || '',
  yardit_record_type: payload.listing_id ? 'Listing' : '',
    yardit_record_id: payload.listing_id || '',
    status: 'received',
    amount_cents: Number(session.amount_total || payload.amount_cents || 0),
    currency: session.currency || 'usd',
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: asId(session.payment_intent),
    stripe_customer_id: asId(session.customer),
    payment_status: session.payment_status || session.status || '',
    metadata_json: JSON.stringify(session.metadata || {}),
    received_at: nowIso(),
    processed_at: nowIso(),
  });
}

async function hasWebhookConfirmation(base44, sessionId) {
  const records = await base44.asServiceRole.entities.PaymentTransaction.filter({ stripe_checkout_session_id: sessionId });
  return (records || []).some((record) => ['succeeded', 'subscription_active'].includes(record.status) && record.event_type !== 'checkout.session.created');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    if (payload.action === 'verify') {
      const sessionId = payload.session_id || payload.sessionId;
      if (!sessionId) return Response.json({ error: 'Missing session_id' }, { status: 400 });

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const webhookConfirmed = await hasWebhookConfirmation(base44, session.id);
      return Response.json({
        ok: true,
        paid: session.payment_status === 'paid' && webhookConfirmed,
        stripe_paid: session.payment_status === 'paid',
        webhook_confirmed: webhookConfirmed,
        pending_webhook: session.payment_status === 'paid' && !webhookConfirmed,
        status: session.status,
        payment_status: session.payment_status,
        session_id: session.id,
        amount_total: session.amount_total,
      });
    }

    const tier = String(payload.tier || '').toLowerCase();
    const listingKind = String(payload.listing_kind || 'residential');
    const expectedResidentialAmount = RESIDENTIAL_PRICES[tier];
    const amountCents = Number(payload.amount_cents || payload.amount || expectedResidentialAmount || 0);

    if (!amountCents || !payload.return_url || !tier) {
      return Response.json({ error: 'Missing checkout parameters' }, { status: 400 });
    }

    if (listingKind === 'residential' && expectedResidentialAmount && amountCents !== expectedResidentialAmount) {
      return Response.json({ error: 'Invalid residential tier amount' }, { status: 400 });
    }

    // ✅ Backend date-overlap guard: prevent paying for already-reserved dates
    if (listingKind === 'residential' && payload.owner_user_id && payload.lat && payload.lng &&
        payload.selected_range_start_date && payload.selected_range_end_date) {
      const conflict = await checkResidentialDateConflict(
        base44,
        payload.owner_user_id,
        Number(payload.lat),
        Number(payload.lng),
        payload.selected_range_start_date,
        payload.selected_range_end_date
      );
      if (conflict) {
        console.warn('Date conflict detected, blocking checkout', { owner: payload.owner_user_id, start: payload.selected_range_start_date, end: payload.selected_range_end_date });
        return Response.json({ error: 'These dates are already reserved for this address. Please choose different dates.' }, { status: 409 });
      }
    }

    if (payload.listing_id) {
      const listings = await base44.asServiceRole.entities.Listing.filter({ id: payload.listing_id });
      const listing = listings?.[0];
      if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });
      if (listing.is_demo_listing === true) {
        return Response.json({ ok: true, demo: true, checkoutUrl: null, sessionId: `demo_${Date.now()}` });
      }
    }

    const separator = String(payload.return_url).includes('?') ? '&' : '?';
    const successUrl = `${payload.return_url}${separator}payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${payload.return_url}${separator}payment=cancel`;
    const transactionType = 'listing_payment';
    const metadata = {
      base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
      user_id: payload.user_id || payload.owner_user_id || '',
      user_email: payload.user_email || payload.customer_email || '',
      purpose: listingKind === 'event' ? 'event_paid_listing' : 'residential_listing_payment',
      transaction_type: transactionType,
      listing_id: payload.listing_id || '',
      tier,
      target_tier: tier,
      listing_kind: listingKind,
      final_status: payload.final_status || (listingKind === 'residential' ? 'scheduled' : 'active'),
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: payload.customer_email || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: listingKind === 'event' ? `Yardit ${tier} Event` : `Yardit ${tier} Listing`,
            description: listingKind === 'event' ? 'Event listing checkout' : 'Residential paid listing checkout',
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      payment_intent_data: { metadata },
    });

    if (payload.listing_id) {
      await base44.asServiceRole.entities.Listing.update(payload.listing_id, {
        status: 'payment_pending',
        payment_intent_status: 'hold_requested',
        pending_checkout_session_id: session.id,
        pending_payment_tier: tier,
      });
    }

    await createCheckoutRecord(base44, session, payload, transactionType);
    console.log('Residential checkout session created', { sessionId: session.id, tier, amountCents, listingId: payload.listing_id || '' });

    return Response.json({ ok: true, checkoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Residential checkout error:', error?.message || error);
    return Response.json({ error: error?.message || 'Stripe checkout failed' }, { status: 500 });
  }
});