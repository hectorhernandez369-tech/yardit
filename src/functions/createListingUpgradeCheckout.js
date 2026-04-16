import Stripe from 'npm:stripe@16.10.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-06-20',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const action = body?.action || 'create';

    if (action === 'payment_method') {
      const customerId = body?.customer_id;
      if (!customerId) {
        return Response.json({ paymentMethod: null });
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
        limit: 1,
      });

      const card = paymentMethods.data?.[0]?.card;
      if (!card) {
        return Response.json({ paymentMethod: null });
      }

      return Response.json({
        paymentMethod: {
          brand: String(card.brand || 'card').toUpperCase(),
          last4: card.last4,
        }
      });
    }

    if (action === 'verify') {
      const sessionId = body?.session_id;
      if (!sessionId) {
        return Response.json({ error: 'Missing session_id' }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return Response.json({
        paid: session.payment_status === 'paid',
        sessionId: session.id,
      });
    }

    const listingId = body?.listing_id;
    const targetTier = body?.target_tier;
    const amountCents = Number(body?.amount_cents || 0);
    const customerEmail = body?.customer_email;
    const returnUrl = body?.return_url;
    const customerId = body?.customer_id || undefined;
    const listingKind = body?.listing_kind || 'residential';

    if (!listingId || !targetTier || !amountCents || !returnUrl) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const successUrl = `${returnUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${returnUrl}?payment=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_method_collection: 'always',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${listingKind === 'event' ? 'Event' : 'Listing'} Upgrade to ${targetTier}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        listing_id: listingId,
        target_tier: targetTier,
        listing_kind: listingKind,
      },
    });

    return Response.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('createListingUpgradeCheckout error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});