import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@18.5.0';

/**
 * Yardit Stripe setup notes:
 * - STRIPE_SECRET_KEY: set in Base44 secrets / Stripe integration. Used only on backend Stripe API calls.
 * - STRIPE_WEBHOOK_SECRET: set after registering this function as the Stripe webhook endpoint.
 * - STRIPE_PUBLISHABLE_KEY: frontend-only key for Stripe.js / Checkout redirects; never verifies payment access.
 * - Stripe Price IDs: add your listing, listing upgrade, vendor subscription, and vendor tier upgrade price IDs
 *   to checkout-session creation functions when products/prices are finalized.
 *
 * Security rule: frontend success URLs and verify calls are informational only.
 * Paid features are unlocked here only after Stripe-signed success events are received.
 * Webhook endpoint registered in Stripe points to this function.
 */

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-02-24.acacia',
});

const SUPPORTED_EVENTS = new Set([
  'checkout.session.completed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'charge.refunded',
]);

const nowIso = () => new Date().toISOString();
const asId = (value) => (typeof value === 'string' ? value : value?.id || '');
const safeString = (value) => (value === undefined || value === null ? '' : String(value));
const centsToDollars = (amount) => Math.round(Number(amount || 0)) / 100;

function getAmountCents(object) {
  return object.amount_total || object.amount_paid || object.amount_received || object.amount || object.amount_due || 0;
}

function getPaymentIntentId(object) {
  return asId(object.payment_intent) || asId(object.payment_intent_data) || (object.object === 'payment_intent' ? object.id : '');
}

function classifyTransaction(metadata, object, eventType) {
  const purpose = safeString(metadata.purpose || metadata.payment_purpose || metadata.transaction_type).toLowerCase();
  const hasListing = !!metadata.listing_id;
  const hasVendor = !!metadata.vendor_account_id;

  if (purpose.includes('vendor_event_promotion_upgrade') || !!metadata.vendor_event_id) return 'vendor_event_promotion_upgrade';
  if (purpose.includes('listing_upgrade') || (hasListing && metadata.target_tier)) return 'listing_upgrade';
  if (purpose.includes('listing') || purpose.includes('residential') || purpose.includes('event_paid_listing') || hasListing) return 'listing_payment';
  if (purpose.includes('vendor_tier_upgrade') || (hasVendor && metadata.target_tier)) return 'vendor_tier_upgrade';
  if (purpose.includes('vendor_subscription') || eventType.startsWith('customer.subscription') || eventType.startsWith('invoice.')) return 'vendor_subscription';
  if (object.object === 'subscription') return 'vendor_subscription';
  return 'unknown';
}

function recordTarget(transactionType, metadata) {
  if (transactionType === 'listing_payment' || transactionType === 'listing_upgrade') {
    return { type: 'Listing', id: metadata.listing_id || '' };
  }
  if (transactionType === 'vendor_subscription' || transactionType === 'vendor_tier_upgrade') {
    return { type: 'VendorAccount', id: metadata.vendor_account_id || '' };
  }
  if (transactionType === 'vendor_event_promotion_upgrade') {
    return { type: 'VendorEvent', id: metadata.vendor_event_id || '' };
  }
  return { type: '', id: '' };
}

async function getExistingTransaction(base44, eventId) {
  const matches = await base44.asServiceRole.entities.PaymentTransaction.filter({ stripe_event_id: eventId });
  return matches?.[0] || null;
}

async function saveTransaction(base44, event, object, metadata, transactionType, status, extra = {}) {
  const target = recordTarget(transactionType, metadata);
  const payload = {
    stripe_event_id: event.id,
    event_type: event.type,
    transaction_type: transactionType,
    yardit_record_type: target.type,
    yardit_record_id: target.id,
    status,
    amount_cents: getAmountCents(object),
    currency: object.currency || '',
    stripe_checkout_session_id: object.object === 'checkout.session' ? object.id : '',
    stripe_payment_intent_id: getPaymentIntentId(object),
    stripe_charge_id: object.object === 'charge' ? object.id : asId(object.charge),
    stripe_invoice_id: object.object === 'invoice' ? object.id : asId(object.invoice),
    stripe_subscription_id: object.object === 'subscription' ? object.id : asId(object.subscription),
    stripe_customer_id: asId(object.customer),
    payment_status: object.payment_status || object.status || '',
    failure_message: object.last_payment_error?.message || object.last_finalization_error?.message || object.failure_message || '',
    metadata_json: JSON.stringify(metadata || {}),
    received_at: nowIso(),
    processed_at: nowIso(),
    ...extra,
  };

  const existing = await getExistingTransaction(base44, event.id);
  if (existing) {
    await base44.asServiceRole.entities.PaymentTransaction.update(existing.id, payload);
    return existing.id;
  }
  const created = await base44.asServiceRole.entities.PaymentTransaction.create(payload);
  return created.id;
}

async function getExpandedMetadata(object) {
  const metadata = { ...(object.metadata || {}) };

  if (object.object === 'invoice' && object.subscription && (!metadata.vendor_account_id || !metadata.purpose)) {
    const subscription = await stripe.subscriptions.retrieve(asId(object.subscription));
    return { ...subscription.metadata, ...metadata };
  }

  if (object.object === 'charge' && object.payment_intent && Object.keys(metadata).length === 0) {
    const paymentIntent = await stripe.paymentIntents.retrieve(asId(object.payment_intent));
    return { ...(paymentIntent.metadata || {}) };
  }

  return metadata;
}

async function completePromoRedemption(base44, metadata, sessionId) {
  const promoCodeId = metadata.promo_code_id;
  if (!promoCodeId) return;

  try {
    // Find pending redemption for this listing+promo
    const redemptions = await base44.asServiceRole.entities.ResidentialPromoRedemption.filter({
      promo_code_id: promoCodeId,
      listing_id: metadata.listing_id || '',
      status: 'pending',
    });

    const redemption = redemptions?.[0];
    if (!redemption) return;

    // Mark completed
    await base44.asServiceRole.entities.ResidentialPromoRedemption.update(redemption.id, {
      status: 'completed',
      payment_transaction_id: sessionId || '',
    });

    // Increment promo usage counts
    const promoCodes = await base44.asServiceRole.entities.ResidentialPromoCode.filter({ id: promoCodeId });
    const pc = promoCodes?.[0];
    if (pc) {
      const updates = {
        total_used_count: (pc.total_used_count || 0) + 1,
        updated_at: new Date().toISOString(),
      };
      if (redemption.discount_bucket === 'early') {
        updates.early_discount_used_count = (pc.early_discount_used_count || 0) + 1;
      }
      await base44.asServiceRole.entities.ResidentialPromoCode.update(pc.id, updates);
    }

    console.log(`[completePromoRedemption] Promo ${metadata.promo_code} redemption completed for listing ${metadata.listing_id}`);
  } catch (e) {
    console.error('[completePromoRedemption] Error:', e?.message);
  }
}

async function updateListing(base44, metadata, object, transactionType) {
  if (!metadata.listing_id) return;

  const tier = metadata.target_tier || metadata.tier;
  const listingKind = metadata.listing_kind || metadata.kind;
  const patch = {
    payment_intent_status: 'captured',
    pricePaid: centsToDollars(getAmountCents(object)),
    stripe_checkout_session_id: object.object === 'checkout.session' ? object.id : '',
    stripe_payment_intent_id: getPaymentIntentId(object),
  };

  if (tier) patch.tier = tier;
  if (listingKind === 'event' && tier) patch.event_tier = tier;
  if (transactionType === 'listing_payment') patch.status = metadata.final_status || (listingKind === 'residential' ? 'scheduled' : 'active');
  if (transactionType === 'listing_upgrade') patch.status = metadata.previous_status || 'active';

  await base44.asServiceRole.entities.Listing.update(metadata.listing_id, patch);
}

async function updateVendorSubscription(base44, metadata, object, statusOverride = '') {
  if (!metadata.vendor_account_id) return;

  const stripeStatus = statusOverride || object.status || '';
  const activeStatuses = new Set(['active', 'trialing']);
  const patch = {
    subscription_status: activeStatuses.has(stripeStatus) ? stripeStatus : stripeStatus === 'past_due' ? 'past_due' : stripeStatus === 'canceled' ? 'canceled' : 'inactive',
    stripe_subscription_id: object.object === 'subscription' ? object.id : asId(object.subscription),
    stripe_customer_id: asId(object.customer),
  };

  if (activeStatuses.has(stripeStatus) && metadata.target_tier) {
    patch.vendor_tier = metadata.target_tier;
    patch.setup_tier_confirmed = true;
    patch.vendor_setup_status = 'in_progress';
  }

  await base44.asServiceRole.entities.VendorAccount.update(metadata.vendor_account_id, patch);
}

async function applyVendorEventPromotionUpgrade(base44, metadata, object) {
  const eventId = metadata.vendor_event_id;
  if (!eventId) {
    console.error('[applyVendorEventPromotionUpgrade] Missing vendor_event_id in metadata');
    return;
  }

  // Only flip to "paid" here — never from the frontend
  const patch = {
    promotion_status: 'paid',
    promotion_upgrade_required: false,
    pending_upgrade_checkout_session_id: null,
    stripe_checkout_session_id: object.object === 'checkout.session' ? object.id : '',
    stripe_payment_intent_id: getPaymentIntentId(object),
    pricePaid: centsToDollars(getAmountCents(object)),
  };

  await base44.asServiceRole.entities.VendorEvent.update(eventId, patch);
  console.log(`[applyVendorEventPromotionUpgrade] Applied promotion upgrade for event ${eventId}, session ${object.id}`);
}

async function processVerifiedEvent(base44, event) {
  if (!SUPPORTED_EVENTS.has(event.type)) {
    return { status: 'ignored', reason: 'Unsupported event type' };
  }

  const object = event.data.object;
  const metadata = await getExpandedMetadata(object);
  const transactionType = classifyTransaction(metadata, object, event.type);

  if (event.type === 'checkout.session.completed') {
    const paid = object.payment_status === 'paid' || object.mode === 'subscription';
    if (!paid) {
      await saveTransaction(base44, event, object, metadata, transactionType, 'ignored');
      return { status: 'ignored', reason: 'Checkout session not paid' };
    }

    if (transactionType === 'listing_payment' || transactionType === 'listing_upgrade') {
      await updateListing(base44, metadata, object, transactionType);
      // Complete any pending promo redemption
      if (metadata.promo_code_id) {
        await completePromoRedemption(base44, metadata, object.id);
      }
    }

    if (transactionType === 'vendor_event_promotion_upgrade') {
      await applyVendorEventPromotionUpgrade(base44, metadata, object);
    }

    await saveTransaction(base44, event, object, metadata, transactionType, 'succeeded');
    return { status: 'processed', transactionType };
  }

  if (event.type === 'payment_intent.succeeded') {
    if (transactionType === 'listing_payment' || transactionType === 'listing_upgrade') {
      await updateListing(base44, metadata, object, transactionType);
    }
    await saveTransaction(base44, event, object, metadata, transactionType, 'succeeded');
    return { status: 'processed', transactionType };
  }

  if (event.type === 'payment_intent.payment_failed') {
    await saveTransaction(base44, event, object, metadata, transactionType, 'failed');
    return { status: 'recorded_failed_payment', transactionType };
  }

  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    await updateVendorSubscription(base44, metadata, object);
    const status = object.status === 'past_due' ? 'subscription_past_due' : object.status === 'active' || object.status === 'trialing' ? 'subscription_active' : 'received';
    await saveTransaction(base44, event, object, metadata, transactionType, status);
    return { status: 'processed_subscription', transactionType };
  }

  if (event.type === 'customer.subscription.deleted') {
    await updateVendorSubscription(base44, metadata, object, 'canceled');
    await saveTransaction(base44, event, object, metadata, transactionType, 'subscription_canceled');
    return { status: 'processed_subscription_canceled', transactionType };
  }

  if (event.type === 'invoice.payment_succeeded') {
    await updateVendorSubscription(base44, metadata, object, 'active');
    await saveTransaction(base44, event, object, metadata, transactionType, 'succeeded');
    return { status: 'processed_invoice_paid', transactionType };
  }

  if (event.type === 'invoice.payment_failed') {
    await updateVendorSubscription(base44, metadata, object, 'past_due');
    await saveTransaction(base44, event, object, metadata, transactionType, 'failed');
    return { status: 'processed_invoice_failed', transactionType };
  }

  if (event.type === 'charge.refunded') {
    await saveTransaction(base44, event, object, metadata, transactionType, 'refunded');
    return { status: 'recorded_refund', transactionType };
  }

  await saveTransaction(base44, event, object, metadata, transactionType, 'ignored');
  return { status: 'ignored', transactionType };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
    if (!webhookSecret) {
      console.error('Stripe webhook secret is not configured. Set STRIPE_WEBHOOK_SECRET before enabling webhooks.');
      return Response.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return Response.json({ error: 'Missing Stripe signature' }, { status: 400 });
    }

    const rawBody = await req.text();
    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    const base44 = createClientFromRequest(req);

    const existing = await getExistingTransaction(base44, event.id);
    if (existing?.status && existing.status !== 'error') {
      return Response.json({ received: true, duplicate: true });
    }

    const result = await processVerifiedEvent(base44, event);
    return Response.json({ received: true, ...result });
  } catch (error) {
    console.error('Stripe webhook processing failed:', error?.message || error);
    return Response.json({ error: 'Webhook processing failed' }, { status: 400 });
  }
});