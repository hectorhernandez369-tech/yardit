import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@18.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-02-24.acacia',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'create';

    if (action === 'verify') {
      const sessionId = body?.sessionId;
      if (!sessionId) {
        return Response.json({ error: 'Missing sessionId' }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return Response.json({
        ok: true,
        paid: session.payment_status === 'paid',
        status: session.status,
        payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
        customer_email: session.customer_details?.email || null,
      });
    }

    const amount = Number(body?.amount || 0);
    const tier = String(body?.tier || 'featured');
    const successUrl = String(body?.successUrl || '');
    const cancelUrl = String(body?.cancelUrl || '');

    if (!amount || amount < 50 || !successUrl || !cancelUrl) {
      return Response.json({ error: 'Missing checkout details' }, { status: 400 });
    }

    const successWithParams = `${successUrl}${successUrl.includes('?') ? '&' : '?'}stripePayment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelWithParams = `${cancelUrl}${cancelUrl.includes('?') ? '&' : '?'}stripePayment=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Yardit ${tier.charAt(0).toUpperCase() + tier.slice(1)} Listing`,
              description: 'Residential paid listing checkout',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: successWithParams,
      cancel_url: cancelWithParams,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
        user_id: user.id,
        tier,
        purpose: 'residential_listing_payment',
      },
    });

    return Response.json({ ok: true, checkout_url: session.url, session_id: session.id });
  } catch (error) {
    console.error('Residential Stripe checkout failed:', error?.message || error);
    return Response.json({ error: error?.message || 'Stripe checkout failed' }, { status: 500 });
  }
});