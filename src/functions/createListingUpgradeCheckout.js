import Stripe from 'npm:stripe@18.5.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const Deno = globalThis.Deno;

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-02-24.acacia',
});

const RESIDENTIAL_PRICES = { free: 0, featured: 499, premium: 799 };
const EVENT_PRICES = { basic: 999, featured: 1999, premium: 2999, marquee: 4999 };
const nowIso = () => new Date().toISOString();

function appendParams(url, params) {
  const separator = String(url).includes('?') ? '&' : '?';
  return `${url}${separator}${params}`;
}

function currentTierForListing(listing) {
  return listing?.listingType === 'event' ? listing?.event_tier || listing?.tier || 'basic' : listing?.tier || 'free';
}

function priceFor(kind, tier) {
  return kind === 'event' ? EVENT_PRICES[tier] || 0 : RESIDENTIAL_PRICES[tier] || 0;
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
      const sessionId = body?.session_id;
      if (!sessionId) return Response.json({ error: 'Missing session_id' }, { status: 400 });

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const transactions = await base44.asServiceRole.entities.PaymentTransaction.filter({ stripe_checkout_session_id: session.id });
      const transaction = transactions?.find((item) => item.status === 'succeeded') || transactions?.[0];
      return Response.json({
        ok: true,
        paid: session.payment_status === 'paid',
        webhook_confirmed: session.payment_status === 'paid' && transaction?.status === 'succeeded',
        sessionId: session.id,
        transaction_status: transaction?.status || '',
      });
    }

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const listingId = body?.listing_id;
    const targetTier = String(body?.target_tier || '').toLowerCase();
    const returnUrl = body?.return_url;
    const customerEmail = body?.customer_email;
    const customerId = body?.customer_id || undefined;

    if (!listingId || !targetTier || !returnUrl) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const listings = await base44.entities.Listing.filter({ id: listingId });
    const listing = listings?.[0];
    if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });
    if (listing.ownerUserId !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (listing.is_demo_listing === true) return Response.json({ error: 'Demo listings should not start Stripe checkout' }, { status: 400 });

    const listingKind = listing.listingType === 'event' || body?.listing_kind === 'event' ? 'event' : 'residential';
    const currentTier = currentTierForListing(listing);
    const expectedAmountCents = Math.max(0, priceFor(listingKind, targetTier) - priceFor(listingKind, currentTier));
    const amountCents = Number(body?.amount_cents || expectedAmountCents || 0);

    if (!expectedAmountCents || amountCents !== expectedAmountCents) {
      return Response.json({ error: 'Upgrade amount does not match the selected tier difference' }, { status: 400 });
    }

    const metadata = {
      base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
      purpose: 'listing_upgrade',
      transaction_type: 'listing_upgrade',
      listing_id: listingId,
      owner_user_id: user.id,
      current_tier: currentTier,
      target_tier: targetTier,
      tier: targetTier,
      listing_kind: listingKind,
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      success_url: appendParams(returnUrl, 'payment=success&session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: appendParams(returnUrl, 'payment=cancel'),
      payment_method_collection: 'always',
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

    await base44.asServiceRole.entities.PaymentTransaction.create({
      stripe_event_id: `checkout_created_${session.id}`,
      event_type: 'checkout.session.created',
      transaction_type: 'listing_upgrade',
      yardit_record_type: 'Listing',
      yardit_record_id: listingId,
      status: 'received',
      amount_cents: amountCents,
      currency: 'usd',
      stripe_checkout_session_id: session.id,
      payment_status: session.payment_status || 'unpaid',
      metadata_json: JSON.stringify(metadata),
      received_at: nowIso(),
    });

    await base44.asServiceRole.entities.Listing.update(listingId, {
      status: 'payment_pending_adjustment',
      payment_intent_status: 'hold_requested',
      pending_upgrade_tier: targetTier,
      stripe_upgrade_checkout_session_id: session.id,
    });

    return Response.json({ checkoutUrl: session.url, checkout_url: session.url, sessionId: session.id, session_id: session.id });
  } catch (error) {
    console.error('createListingUpgradeCheckout error', error?.message || error);
    return Response.json({ error: error?.message || 'Upgrade checkout failed' }, { status: 500 });
  }
});