import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@18.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-02-24.acacia',
});

function appendParams(url, params) {
  const separator = String(url).includes('?') ? '&' : '?';
  return `${url}${separator}${params}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));

    if (payload.action === 'verify') {
      if (!payload.session_id) return Response.json({ error: 'Missing session_id' }, { status: 400 });

      const session = await stripe.checkout.sessions.retrieve(payload.session_id);
      const setupIntentId = typeof session.setup_intent === 'string' ? session.setup_intent : session.setup_intent?.id;
      if (!setupIntentId) {
        return Response.json({ ok: true, saved: false, status: session.status, sessionId: session.id });
      }

      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      const saved = session.status === 'complete' && setupIntent.status === 'succeeded';

      console.log('Neighborhood setup verified:', { sessionId: session.id, setupIntentId: setupIntent.id, saved });

      return Response.json({
        ok: true,
        saved,
        status: session.status,
        sessionId: session.id,
        customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        paymentMethodId: typeof setupIntent.payment_method === 'string' ? setupIntent.payment_method : setupIntent.payment_method?.id,
        setupIntentId: setupIntent.id,
      });
    }

    if (!payload.return_url) return Response.json({ error: 'Missing return_url' }, { status: 400 });

    const customerId = payload.customer_id || (await stripe.customers.create({
      email: user.email,
      name: user.full_name || undefined,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
        purpose: 'neighborhood_sale_setup',
        user_id: user.id,
      },
    })).id;

    const metadata = {
      base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
      purpose: 'neighborhood_sale_setup',
      user_id: user.id,
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      payment_method_types: ['card'],
      success_url: appendParams(payload.return_url, 'neighborhoodSetup=success&session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: appendParams(payload.return_url, 'neighborhoodSetup=cancel'),
      metadata,
      setup_intent_data: { metadata },
    });

    console.log('Neighborhood setup session created:', { sessionId: session.id, customerId });

    return Response.json({ ok: true, checkoutUrl: session.url, checkout_url: session.url, sessionId: session.id, session_id: session.id, customerId });
  } catch (error) {
    console.error('Neighborhood setup checkout error:', error?.message || error);
    return Response.json({ error: error?.message || 'Neighborhood setup failed' }, { status: 500 });
  }
});