import Stripe from 'npm:stripe@18.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-02-24.acacia',
});

Deno.serve(async () => {
  try {
    const metadata = {
      base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
      purpose: 'stripe_setup_check',
      mode: 'test',
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata,
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: 100,
          product_data: { name: 'Yardit Stripe Test Payment', description: 'Temporary test checkout for Stripe setup verification' },
        },
        quantity: 1,
      }],
      success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://example.com/cancel',
      metadata,
      payment_intent_data: { metadata },
    });

    console.log('Stripe setup check created', { paymentIntentId: paymentIntent.id, checkoutSessionId: checkoutSession.id });
    return Response.json({
      ok: true,
      test_mode: true,
      paymentIntentSupported: !!paymentIntent?.id,
      paymentIntentId: paymentIntent.id,
      checkoutSupported: !!checkoutSession?.url,
      checkoutSessionId: checkoutSession.id,
      checkoutUrl: checkoutSession.url,
    });
  } catch (error) {
    console.error('Stripe setup check failed:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'Stripe setup check failed' }, { status: 500 });
  }
});