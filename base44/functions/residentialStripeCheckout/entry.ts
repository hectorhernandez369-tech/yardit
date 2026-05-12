import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@18.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-02-24.acacia',
});

const RESIDENTIAL_PRICES = { featured: 499, premium: 799 };
const nowIso = () => new Date().toISOString();
const asId = (value) => (typeof value === 'string' ? value : value?.id || '');

async function webhookConfirmed(base44, sessionId) {
  const records = await base44.asServiceRole.entities.PaymentTransaction.filter({ stripe_checkout_session_id: sessionId });
  return (records || []).some((record) => record.event_type !== 'checkout.session.created' && record.status === 'succeeded');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'create';

    if (action === 'verify') {
      const sessionId = body?.sessionId || body?.session_id;
      if (!sessionId) return Response.json({ error: 'Missing sessionId' }, { status: 400 });

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const confirmed = await webhookConfirmed(base44, session.id);
      return Response.json({
        ok: true,
        paid: session.payment_status === 'paid' && confirmed,
        stripe_paid: session.payment_status === 'paid',
        webhook_confirmed: confirmed,
        pending_webhook: session.payment_status === 'paid' && !confirmed,
        status: session.status,
        payment_intent_id: asId(session.payment_intent),
        customer_email: session.customer_details?.email || null,
      });
    }

    const tier = String(body?.tier || 'featured').toLowerCase();
    const amount = Number(body?.amount || body?.amount_cents || RESIDENTIAL_PRICES[tier] || 0);
    const successUrl = String(body?.successUrl || body?.return_url || '');
    const cancelUrl = String(body?.cancelUrl || body?.return_url || '');

    if (!amount || amount < 50 || !successUrl || !cancelUrl || !RESIDENTIAL_PRICES[tier]) {
      return Response.json({ error: 'Missing checkout details' }, { status: 400 });
    }
    if (amount !== RESIDENTIAL_PRICES[tier]) {
      return Response.json({ error: 'Invalid residential tier amount' }, { status: 400 });
    }

    const successWithParams = `${successUrl}${successUrl.includes('?') ? '&' : '?'}stripePayment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelWithParams = `${cancelUrl}${cancelUrl.includes('?') ? '&' : '?'}stripePayment=cancel`;
    const metadata = {
      base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
      listing_id: body?.listing_id || '',
      tier,
      target_tier: tier,
      listing_kind: 'residential',
      purpose: 'residential_listing_payment',
      transaction_type: 'listing_payment',
      final_status: 'scheduled',
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: body?.customer_email || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Yardit ${tier} Listing`, description: 'Residential paid listing checkout' },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      success_url: successWithParams,
      cancel_url: cancelWithParams,
      metadata,
      payment_intent_data: { metadata },
    });

    await base44.asServiceRole.entities.PaymentTransaction.create({
      stripe_event_id: `checkout_created_${session.id}`,
      event_type: 'checkout.session.created',
      transaction_type: 'listing_payment',
      yardit_record_type: body?.listing_id ? 'Listing' : '',
      yardit_record_id: body?.listing_id || '',
      status: 'received',
      amount_cents: amount,
      currency: 'usd',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: asId(session.payment_intent),
      stripe_customer_id: asId(session.customer),
      payment_status: session.payment_status || session.status || '',
      metadata_json: JSON.stringify(metadata),
      received_at: nowIso(),
      processed_at: nowIso(),
    });

    return Response.json({ ok: true, checkout_url: session.url, checkoutUrl: session.url, session_id: session.id, sessionId: session.id });
  } catch (error) {
    console.error('Residential Stripe checkout failed:', error?.message || error);
    return Response.json({ error: error?.message || 'Stripe checkout failed' }, { status: 500 });
  }
});