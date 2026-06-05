import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@18.5.0';

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

    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || '';
    const transactions = await base44.asServiceRole.entities.PaymentTransaction.filter({ stripe_checkout_session_id: session.id });
    await Promise.all((transactions || []).map((transaction) => base44.asServiceRole.entities.PaymentTransaction.update(transaction.id, {
      status: 'succeeded',
      payment_status: session.payment_status || session.status || '',
      stripe_payment_intent_id: paymentIntentId,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id || '',
      processed_at: new Date().toISOString(),
    })));

    const listings = await base44.entities.Listing.filter({ id: listingId });
    const listing = listings?.[0];
    if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });
    if (listing.ownerUserId !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const updateData = listing.listingType === 'event'
      ? { tier: targetTier, event_tier: targetTier, status: session.metadata?.previous_status || 'active' }
      : { tier: targetTier, status: session.metadata?.previous_status || 'active' };

    const updated = await base44.entities.Listing.update(listingId, {
      ...updateData,
      payment_intent_status: 'captured',
      pending_upgrade_tier: '',
      pending_upgrade_checkout_session_id: '',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      pricePaid: Number(session.amount_total || 0) / 100,
    });
    return Response.json({ success: true, listing: updated });
  } catch (error) {
    console.error('applyListingUpgrade error', error?.message || error);
    return Response.json({ error: error?.message || 'Apply upgrade failed' }, { status: 500 });
  }
});