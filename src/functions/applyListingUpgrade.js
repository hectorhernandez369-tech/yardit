import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@18.5.0';

const Deno = globalThis.Deno;

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-02-24.acacia',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const listingId = body?.listing_id;
    const targetTier = body?.target_tier;
    const sessionId = body?.stripe_session_id || body?.session_id;

    if (!listingId || !targetTier || !sessionId) {
      return Response.json({ error: 'Missing required Stripe confirmation fields' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const sessionListingId = session.metadata?.listing_id;
    const sessionTargetTier = session.metadata?.target_tier;

    if (session.payment_status !== 'paid' || sessionListingId !== listingId || sessionTargetTier !== targetTier) {
      return Response.json({ error: 'Stripe payment has not confirmed this upgrade' }, { status: 402 });
    }

    const transactions = await base44.asServiceRole.entities.PaymentTransaction.filter({ stripe_checkout_session_id: sessionId });
    const confirmedTransaction = transactions?.find((item) => item.status === 'succeeded' && item.transaction_type === 'listing_upgrade');

    if (!confirmedTransaction) {
      return Response.json({ error: 'Waiting for Stripe webhook confirmation before unlocking this upgrade' }, { status: 202 });
    }

    const listings = await base44.entities.Listing.filter({ id: listingId });
    const listing = listings?.[0];
    if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });
    if (listing.ownerUserId !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const updateData = listing.listingType === 'event'
      ? { tier: targetTier, event_tier: targetTier, status: 'active', payment_intent_status: 'captured', pending_upgrade_tier: '' }
      : { tier: targetTier, status: listing.status === 'payment_pending_adjustment' ? 'active' : listing.status, payment_intent_status: 'captured', pending_upgrade_tier: '' };

    const updated = await base44.entities.Listing.update(listingId, updateData);
    return Response.json({ success: true, listing: updated });
  } catch (error) {
    console.error('applyListingUpgrade error', error?.message || error);
    return Response.json({ error: error?.message || 'Upgrade confirmation failed' }, { status: 500 });
  }
});