import Stripe from 'npm:stripe@18.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-02-24.acacia',
});

Deno.serve(async (req) => {
  try {
    const origin = req.headers.get('origin') || 'https://example.com';

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
        purpose: 'stripe_setup_verification',
        mode: 'test',
      },
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Yardit Stripe Test Payment',
              description: 'Sandbox checkout verification',
            },
            unit_amount: 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/?stripe_test=success`,
      cancel_url: `${origin}/?stripe_test=cancel`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
        purpose: 'stripe_setup_verification',
        mode: 'test',
      },
    });

    return Response.json({
      ok: true,
      test_mode: true,
      payment_intent_supported: !!paymentIntent?.id && !!paymentIntent?.client_secret,
      checkout_supported: !!checkoutSession?.id && !!checkoutSession?.url,
      payment_intent_id: paymentIntent.id,
      checkout_session_id: checkoutSession.id,
      checkout_url: checkoutSession.url,
    });
  } catch (error) {
    console.error('Stripe verification failed:', error?.message || error);
    return Response.json({
      ok: false,
      error: error?.message || 'Stripe verification failed',
    }, { status: 500 });
  }
});