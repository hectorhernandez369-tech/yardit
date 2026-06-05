import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@18.5.0';

const nowIso = () => new Date().toISOString();
const asId = (value) => (typeof value === 'string' ? value : value?.id || '');

const RESIDENTIAL_BASE_PRICES = { featured: 499, premium: 799 };

async function webhookConfirmed(base44, sessionId) {
  const records = await base44.asServiceRole.entities.PaymentTransaction.filter({ stripe_checkout_session_id: sessionId });
  return (records || []).some((record) => record.event_type !== 'checkout.session.created' && record.status === 'succeeded');
}

Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', { apiVersion: '2025-02-24.acacia' });
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const currentUser = await base44.auth.me();
    const action = body?.action || 'create';

    // ── LINK PAID SESSION TO CREATED LISTING ───────────────────────
    if (action === 'link_paid_listing') {
      const user = currentUser;
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      const sessionId = body?.sessionId || body?.session_id;
      const listingId = body?.listing_id;
      if (!sessionId || !listingId) return Response.json({ error: 'Missing session or listing' }, { status: 400 });

      const listings = await base44.asServiceRole.entities.Listing.filter({ id: listingId });
      const listing = listings?.[0];
      if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });
      if (listing.ownerUserId !== user.id && !['admin', 'master', 'super_master'].includes(user.role)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') return Response.json({ error: 'Payment not paid' }, { status: 400 });

      const paymentIntentId = asId(session.payment_intent);
      const patch = {
        yardit_record_type: 'Listing',
        yardit_record_id: listingId,
        user_id: listing.ownerUserId || user.id,
        user_email: user.email || session.customer_details?.email || '',
        stripe_payment_intent_id: paymentIntentId,
        stripe_customer_id: asId(session.customer),
        payment_status: session.payment_status || session.status || '',
        processed_at: nowIso(),
      };

      const bySession = await base44.asServiceRole.entities.PaymentTransaction.filter({ stripe_checkout_session_id: sessionId });
      const byIntent = paymentIntentId ? await base44.asServiceRole.entities.PaymentTransaction.filter({ stripe_payment_intent_id: paymentIntentId }) : [];
      const records = [...bySession, ...byIntent].filter((record, index, arr) => record?.id && arr.findIndex((item) => item.id === record.id) === index);
      await Promise.all(records.map((record) => base44.asServiceRole.entities.PaymentTransaction.update(record.id, patch)));

      await base44.asServiceRole.entities.Listing.update(listingId, {
        stripe_checkout_session_id: sessionId,
        stripe_payment_intent_id: paymentIntentId,
        payment_status: 'paid',
        payment_intent_status: 'captured',
      });

      return Response.json({ ok: true, linked: records.length, payment_intent_id: paymentIntentId });
    }

    // ── VERIFY ─────────────────────────────────────────────────────
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

    // ── FREE PROMO (no Stripe needed) ───────────────────────────────
    if (action === 'complete_free_promo') {
      const { listing_id, promo_code_id, promo_code, discount_percent, discount_amount, original_amount, discount_bucket, user_id, user_email } = body;

      if (!listing_id || !promo_code_id) {
        return Response.json({ error: 'Missing required fields for free promo' }, { status: 400 });
      }

      // Create completed redemption record
      await base44.asServiceRole.entities.ResidentialPromoRedemption.create({
        promo_code_id,
        code: promo_code,
        user_id: user_id || '',
        user_email: user_email || '',
        listing_id,
        original_amount: Number(original_amount) || 0,
        discount_percent_applied: Number(discount_percent) || 0,
        discount_amount: Number(discount_amount) || 0,
        final_amount: 0,
        discount_bucket: discount_bucket || 'default',
        redeemed_at: nowIso(),
        status: 'completed',
      });

      // Increment promo usage counts
      const promoCodes = await base44.asServiceRole.entities.ResidentialPromoCode.filter({ id: promo_code_id });
      const pc = promoCodes?.[0];
      if (pc) {
        const updates = { total_used_count: (pc.total_used_count || 0) + 1, updated_at: nowIso() };
        if (discount_bucket === 'early') {
          updates.early_discount_used_count = (pc.early_discount_used_count || 0) + 1;
        }
        await base44.asServiceRole.entities.ResidentialPromoCode.update(pc.id, updates);
      }

      // Update listing to active/scheduled (payment_status = paid)
      await base44.asServiceRole.entities.Listing.update(listing_id, {
        payment_status: 'paid',
        status: 'scheduled',
      });

      return Response.json({ ok: true, free_promo: true });
    }

    // ── CREATE STRIPE CHECKOUT ──────────────────────────────────────
    const tier = String(body?.tier || 'featured').toLowerCase();
    const basePrice = RESIDENTIAL_BASE_PRICES[tier];

    if (!basePrice) {
      return Response.json({ error: 'Invalid residential tier' }, { status: 400 });
    }

    // Promo fields
    const promoCodeId = body?.promo_code_id || null;
    const promoCode = body?.promo_code || null;
    const promoDiscountPercent = Number(body?.promo_discount_percent || 0);
    const promoDiscountBucket = body?.promo_discount_bucket || null;
    const promoDiscountAmount = Number(body?.promo_discount_amount || 0);
    const promoFinalAmount = body?.promo_final_amount != null ? Number(body.promo_final_amount) : null;

    // Determine final amount
    const amount = promoFinalAmount != null ? promoFinalAmount : basePrice;

    const successUrl = String(body?.successUrl || body?.return_url || '');
    const cancelUrl = String(body?.cancelUrl || body?.return_url || '');

    if (!successUrl || !cancelUrl) {
      return Response.json({ error: 'Missing checkout URLs' }, { status: 400 });
    }
    if (amount < 50) {
      return Response.json({ error: 'Amount too small for Stripe checkout' }, { status: 400 });
    }

    const successWithParams = `${successUrl}${successUrl.includes('?') ? '&' : '?'}payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelWithParams = `${cancelUrl}${cancelUrl.includes('?') ? '&' : '?'}payment=cancel`;

    const metadata = {
      base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
      user_id: body?.user_id || currentUser?.id || '',
      user_email: body?.user_email || body?.customer_email || currentUser?.email || '',
      listing_id: body?.listing_id || '',
      tier,
      target_tier: tier,
      listing_kind: 'residential',
      purpose: 'residential_listing_payment',
      transaction_type: 'listing_payment',
      final_status: 'scheduled',
      ...(promoCodeId && {
        promo_code_id: promoCodeId,
        promo_code: promoCode,
        discount_percent: String(promoDiscountPercent),
        discount_bucket: promoDiscountBucket,
        original_amount: String(basePrice),
        promo_discount_amount: String(promoDiscountAmount),
      }),
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: body?.customer_email || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Yardit ${tier} Listing${promoCode ? ` (${promoCode})` : ''}`,
            description: promoCode
              ? `${promoDiscountPercent}% promo discount applied — original $${(basePrice / 100).toFixed(2)}`
              : 'Residential paid listing checkout',
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      success_url: successWithParams,
      cancel_url: cancelWithParams,
      metadata,
      payment_intent_data: { metadata },
    });

    // Create pending promo redemption if promo applied
    if (promoCodeId) {
      await base44.asServiceRole.entities.ResidentialPromoRedemption.create({
        promo_code_id: promoCodeId,
        code: promoCode,
        user_id: body?.user_id || '',
        user_email: body?.customer_email || '',
        listing_id: body?.listing_id || '',
        original_amount: basePrice,
        discount_percent_applied: promoDiscountPercent,
        discount_amount: promoDiscountAmount,
        final_amount: amount,
        discount_bucket: promoDiscountBucket || 'default',
        redeemed_at: nowIso(),
        status: 'pending',
      });
    }

    // Record payment transaction
    await base44.asServiceRole.entities.PaymentTransaction.create({
      stripe_event_id: `checkout_created_${session.id}`,
      event_type: 'checkout.session.created',
      transaction_type: 'listing_payment',
      user_id: body?.user_id || currentUser?.id || '',
      user_email: body?.user_email || body?.customer_email || currentUser?.email || '',
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

    return Response.json({
      ok: true,
      checkout_url: session.url,
      checkoutUrl: session.url,
      session_id: session.id,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Residential Stripe checkout failed:', error?.message || error);
    return Response.json({ error: error?.message || 'Stripe checkout failed' }, { status: 500 });
  }
});