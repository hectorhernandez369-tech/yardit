import Stripe from 'npm:stripe@16.10.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-06-20',
});

Deno.serve(async () => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        purpose: 'stripe_setup_check',
        mode: 'test',
      },
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: 100,
            product_data: {
              name: 'Yardit Stripe Test Payment',
              description: 'Temporary test checkout for Stripe setup verification',
            },
          },
          quantity: 1,
        },
      ],
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        purpose: 'stripe_setup_check',
        mode: 'test',
      },
      payment_intent_data: {
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          purpose: 'stripe_setup_check',
          mode: 'test',
        },
      },
    });

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
    console.error('Stripe setup check failed:', error);
    return Response.json({
      ok: false,
      error: error.message,
    }, { status: 500 });
  }
});