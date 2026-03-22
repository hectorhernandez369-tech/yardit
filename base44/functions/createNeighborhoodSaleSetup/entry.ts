import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@18.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-02-24.acacia',
});

async function getOrCreateCustomer(user) {
  const existing = await stripe.customers.list({ email: user.email, limit: 1 });
  if (existing.data?.[0]) return existing.data[0];

  return await stripe.customers.create({
    email: user.email,
    name: user.full_name || undefined,
    metadata: {
      base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
      user_id: user.id,
    },
  });
}

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

      const session = await stripe.checkout.sessions.retrieve(payload.session_id, {
        expand: ['setup_intent'],
      });
      const setupIntent = typeof session.setup_intent === 'string'
        ? await stripe.setupIntents.retrieve(session.setup_intent)
        : session.setup_intent;

      return Response.json({
        ok: true,
        setup_complete: session.status === 'complete' && !!setupIntent?.payment_method,
        session_id: session.id,
        setup_intent_id: setupIntent?.id || null,
        customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
        payment_method_id: typeof setupIntent?.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent?.payment_method?.id || null,
      });
    }

    if (!payload.return_url) {
      return Response.json({ error: 'Missing return_url' }, { status: 400 });
    }

    const customer = await getOrCreateCustomer(user);
    const separator = String(payload.return_url).includes('?') ? '&' : '?';
    const successUrl = `${payload.return_url}${separator}ns_setup=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${payload.return_url}${separator}ns_setup=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customer.id,
      payment_method_types: ['card'],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
        purpose: 'neighborhood_sale_setup',
        user_id: user.id,
      },
    });

    console.log('Neighborhood setup session created:', { sessionId: session.id, checkoutUrl: session.url, customerId: customer.id });

    return Response.json({
      ok: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      customerId: customer.id,
    });
  } catch (error) {
    console.error('Neighborhood setup error:', error?.message || error);
    return Response.json({ error: error?.message || 'Neighborhood payment setup failed' }, { status: 500 });
  }
});