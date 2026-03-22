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

    const payload = await req.json().catch(() => ({}));

    if (payload.action === 'verify') {
      if (!payload.session_id) {
        return Response.json({ error: 'Missing session_id' }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.retrieve(payload.session_id);
      console.log('Stripe session verify:', { sessionId: session.id, paymentStatus: session.payment_status, status: session.status });
      return Response.json({
        ok: true,
        paid: session.payment_status === 'paid',
        status: session.status,
        payment_status: session.payment_status,
        session_id: session.id,
        amount_total: session.amount_total,
      });
    }

    if (!payload.amount_cents || !payload.return_url || !payload.tier) {
      return Response.json({ error: 'Missing checkout parameters' }, { status: 400 });
    }

    const separator = String(payload.return_url).includes('?') ? '&' : '?';
    const successUrl = `${payload.return_url}${separator}payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${payload.return_url}${separator}payment=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: payload.tier === 'premium' ? 'Yardit Premium Listing' : 'Yardit Featured Listing',
              description: 'Residential paid listing checkout',
            },
            unit_amount: Number(payload.amount_cents),
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
        purpose: 'residential_paid_listing',
        tier: String(payload.tier),
        user_id: user.id,
      },
    });

    console.log('Stripe session created:', { sessionId: session.id, checkoutUrl: session.url, tier: payload.tier, amount: payload.amount_cents });

    return Response.json({
      ok: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Residential checkout error:', error?.message || error);
    return Response.json({ error: error?.message || 'Stripe checkout failed' }, { status: 500 });
  }
});