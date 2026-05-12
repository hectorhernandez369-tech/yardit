import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@18.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-02-24.acacia',
});

const VENDOR_TIERS = {
  starter: { label: 'Starter', amount: 999 },
  pro: { label: 'Pro', amount: 1999 },
  growth: { label: 'Growth', amount: 4999 },
  event_organizer: { label: 'Event Organizer', amount: 9999 },
};
const nowIso = () => new Date().toISOString();
const asId = (value) => (typeof value === 'string' ? value : value?.id || '');

async function webhookConfirmed(base44, sessionId) {
  const records = await base44.asServiceRole.entities.PaymentTransaction.filter({ stripe_checkout_session_id: sessionId });
  return (records || []).some((record) => record.event_type !== 'checkout.session.created' && ['succeeded', 'subscription_active'].includes(record.status));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'create';

    if (action === 'verify') {
      const sessionId = body?.session_id || body?.sessionId;
      if (!sessionId) return Response.json({ error: 'Missing session_id' }, { status: 400 });

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const confirmed = await webhookConfirmed(base44, session.id);
      return Response.json({
        ok: true,
        active: confirmed,
        webhook_confirmed: confirmed,
        pending_webhook: session.status === 'complete' && !confirmed,
        status: session.status,
        session_id: session.id,
        subscription_id: asId(session.subscription),
        customer_id: asId(session.customer),
      });
    }

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const vendorAccountId = body?.vendor_account_id;
    const targetTier = String(body?.target_tier || '').toLowerCase();
    const returnUrl = body?.return_url;
    const tierConfig = VENDOR_TIERS[targetTier];

    if (!vendorAccountId || !tierConfig || !returnUrl) {
      return Response.json({ error: 'Missing vendor subscription checkout details' }, { status: 400 });
    }

    const accounts = await base44.asServiceRole.entities.VendorAccount.filter({ id: vendorAccountId });
    const account = accounts?.[0];
    if (!account) return Response.json({ error: 'Vendor account not found' }, { status: 404 });
    if (account.owner_user_id !== user.id && account.owner_email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (account.is_demo_vendor === true) {
      await base44.asServiceRole.entities.VendorAccount.update(vendorAccountId, {
        vendor_tier: targetTier,
        subscription_status: 'active',
        setup_tier_confirmed: true,
        vendor_setup_status: 'in_progress',
      });
      return Response.json({ ok: true, demo: true, checkoutUrl: null, sessionId: `demo_${Date.now()}` });
    }

    const customerId = body?.customer_id || account.stripe_customer_id || (await stripe.customers.create({
      email: account.owner_email || user.email,
      name: account.business_name || user.full_name || undefined,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
        vendor_account_id: vendorAccountId,
        owner_user_id: user.id,
      },
    })).id;

    const separator = String(returnUrl).includes('?') ? '&' : '?';
    const successUrl = `${returnUrl}${separator}vendorSubscription=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${returnUrl}${separator}vendorSubscription=cancel`;
    const isUpgrade = account.vendor_tier && account.vendor_tier !== 'free' && account.vendor_tier !== targetTier;
    const transactionType = isUpgrade ? 'vendor_tier_upgrade' : 'vendor_subscription';
    const metadata = {
      base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
      purpose: transactionType,
      transaction_type: transactionType,
      vendor_account_id: vendorAccountId,
      current_tier: account.vendor_tier || 'free',
      target_tier: targetTier,
      owner_user_id: user.id,
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          recurring: { interval: 'month' },
          product_data: { name: `Yardit Vendor ${tierConfig.label}` },
          unit_amount: tierConfig.amount,
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      subscription_data: { metadata },
    });

    await base44.asServiceRole.entities.VendorAccount.update(vendorAccountId, {
      stripe_customer_id: customerId,
      pending_vendor_tier: targetTier,
      pending_subscription_checkout_session_id: session.id,
    });

    await base44.asServiceRole.entities.PaymentTransaction.create({
      stripe_event_id: `checkout_created_${session.id}`,
      event_type: 'checkout.session.created',
      transaction_type: transactionType,
      yardit_record_type: 'VendorAccount',
      yardit_record_id: vendorAccountId,
      status: 'received',
      amount_cents: tierConfig.amount,
      currency: 'usd',
      stripe_checkout_session_id: session.id,
      stripe_customer_id: customerId,
      payment_status: session.status || '',
      metadata_json: JSON.stringify(metadata),
      received_at: nowIso(),
      processed_at: nowIso(),
    });

    console.log('Vendor subscription checkout created', { sessionId: session.id, vendorAccountId, targetTier, transactionType });
    return Response.json({ ok: true, checkoutUrl: session.url, sessionId: session.id, customerId });
  } catch (error) {
    console.error('Vendor subscription checkout failed:', error?.message || error);
    return Response.json({ error: error?.message || 'Vendor subscription checkout failed' }, { status: 500 });
  }
});