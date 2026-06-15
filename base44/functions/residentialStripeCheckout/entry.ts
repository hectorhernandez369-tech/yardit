import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@18.5.0';

const nowIso = () => new Date().toISOString();
const asId = (value) => (typeof value === 'string' ? value : value?.id || '');

const RESIDENTIAL_BASE_PRICES = { featured: 499, premium: 799 };
const DATE_UNAVAILABLE_MESSAGE = 'These dates are no longer available for this address. Please select different dates.';
const RESERVED_STATUSES = new Set(['active', 'under_review', 'pending_payment', 'scheduled', 'activated_locked', 'coming_soon', 'payment_pending', 'payment_pending_adjustment']);

function expandDateRange(startDate, endDate) {
  const dates = [];
  if (!startDate || !endDate) return dates;
  const [sy, sm, sd] = String(startDate).split('-').map(Number);
  const [ey, em, ed] = String(endDate).split('-').map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return dates;
  let cur = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  let guard = 0;
  while (cur <= end && guard++ < 40) {
    const d = new Date(cur);
    dates.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`);
    cur += 86400000;
  }
  return dates;
}

function normalizeAddressPart(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function sameResidentialAddress(listing, ref) {
  const lat = Number(ref.lat);
  const lng = Number(ref.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && typeof listing.lat === 'number' && typeof listing.lng === 'number') {
    if (Math.abs(listing.lat - lat) < 0.0003 && Math.abs(listing.lng - lng) < 0.0003) return true;
  }
  return normalizeAddressPart(listing.addressText) === normalizeAddressPart(ref.addressText) &&
    normalizeAddressPart(listing.zip) === normalizeAddressPart(ref.zip);
}

async function validateResidentialCheckoutDates(base44, payload, currentUser, excludeListingId = '') {
  const startDate = payload.selected_range_start_date || payload.selectedRangeStartDate;
  const endDate = payload.selected_range_end_date || payload.selectedRangeEndDate;
  if (!startDate || !endDate) return { ok: false, error: 'Missing selected date range' };

  const today = new Date().toISOString().slice(0, 10);
  if (startDate < today || endDate < today) {
    return { ok: false, error: 'The selected dates have already passed. Please choose new dates before checkout.' };
  }

  const ref = {
    addressText: payload.address_text || payload.addressText || currentUser?.primary_address || currentUser?.street_address || '',
    zip: payload.zip || currentUser?.zip_code || '',
    lat: payload.lat ?? currentUser?.primary_latitude ?? currentUser?.address_lat,
    lng: payload.lng ?? currentUser?.primary_longitude ?? currentUser?.address_lng,
  };
  if (!ref.addressText || !ref.zip || !Number.isFinite(Number(ref.lat)) || !Number.isFinite(Number(ref.lng))) {
    return { ok: false, error: 'Verified address, normalized address, coordinates, and selected date range are required before checkout.' };
  }
  if (currentUser && currentUser.primary_address_verified !== true && currentUser.address_confirmation_status !== 'confirmed') {
    return { ok: false, error: 'Verified address is required before checkout.' };
  }

  const proposed = new Set(expandDateRange(startDate, endDate));
  const listings = await base44.asServiceRole.entities.Listing.filter({ zip: ref.zip });
  const now = new Date();
  for (const listing of listings || []) {
    if (listing.id === excludeListingId || listing.listingType !== 'yard_sale' || listing.is_demo_listing) continue;
    if (!RESERVED_STATUSES.has(listing.status)) continue;
    if (listing.endDateTime && new Date(listing.endDateTime) < now) continue;
    if (!sameResidentialAddress(listing, ref)) continue;
    const reserved = [...expandDateRange(listing.selectedRangeStartDate, listing.selectedRangeEndDate), ...(listing.earlyVisibilityDates || [])];
    if (reserved.some((date) => proposed.has(date))) return { ok: false, error: DATE_UNAVAILABLE_MESSAGE };
  }
  return { ok: true };
}

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
      const confirmed = await webhookConfirmed(base44, session.id);
      if (listing.listingType !== 'event') {
        const dateValidation = await validateResidentialCheckoutDates(base44, listing, user, listingId);
        if (!dateValidation.ok) return Response.json({ error: dateValidation.error }, { status: dateValidation.error === DATE_UNAVAILABLE_MESSAGE ? 409 : 400 });
      }

      const paymentIntentId = asId(session.payment_intent);
      const patch = {
        yardit_record_type: 'Listing',
        yardit_record_id: listingId,
        user_id: listing.ownerUserId || user.id,
        user_email: user.email || session.customer_details?.email || '',
        stripe_payment_intent_id: paymentIntentId,
        stripe_customer_id: asId(session.customer),
        payment_status: session.payment_status || session.status || '',
        status: session.payment_status === 'paid' ? 'succeeded' : 'received',
        non_refund_acknowledged: listing.non_refund_acknowledged === true,
        non_refund_acknowledged_at: listing.non_refund_acknowledged_at || '',
        non_refund_acknowledged_by_user_id: listing.non_refund_acknowledged_by_user_id || listing.ownerUserId || user.id || '',
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
        status: listing.listingType === 'event' ? 'active' : 'scheduled',
        pricePaid: Number(session.amount_total || 0) / 100,
        non_refund_acknowledged: listing.non_refund_acknowledged === true,
        non_refund_acknowledged_at: listing.non_refund_acknowledged_at || '',
        non_refund_acknowledged_by_user_id: listing.non_refund_acknowledged_by_user_id || listing.ownerUserId || user.id || '',
      });

      return Response.json({ ok: true, linked: records.length, payment_intent_id: paymentIntentId });
    }

    // ── RECOVER PAID CHECKOUT WITH NO LISTING ─────────────────────
    if (action === 'recover_paid_checkout') {
      const user = currentUser;
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      const requestedSessionId = body?.sessionId || body?.session_id || '';
      if (requestedSessionId) {
        const session = await stripe.checkout.sessions.retrieve(requestedSessionId);
        const sessionUserId = session.metadata?.user_id || '';
        const sessionEmail = session.customer_details?.email || session.metadata?.user_email || '';
        const ownsSession = sessionUserId === user.id || (!!sessionEmail && sessionEmail.toLowerCase() === String(user.email || '').toLowerCase());
        if (!ownsSession) return Response.json({ error: 'Forbidden' }, { status: 403 });
        return Response.json({
          ok: true,
          found: session.payment_status === 'paid',
          stripe_paid: session.payment_status === 'paid',
          session_id: session.id,
          payment_intent_id: asId(session.payment_intent),
        });
      }

      const records = await base44.asServiceRole.entities.PaymentTransaction.filter({
        user_id: user.id,
        transaction_type: 'listing_payment',
      });

      const candidates = (records || [])
        .filter((record) => !record.yardit_record_id && record.stripe_checkout_session_id && ['received', 'processing', 'succeeded'].includes(record.status))
        .sort((a, b) => new Date(b.received_at || b.created_date || 0) - new Date(a.received_at || a.created_date || 0))
        .slice(0, 10);

      for (const record of candidates) {
        const session = await stripe.checkout.sessions.retrieve(record.stripe_checkout_session_id);
        if (session.payment_status === 'paid') {
          return Response.json({
            ok: true,
            found: true,
            stripe_paid: true,
            session_id: session.id,
            payment_intent_id: asId(session.payment_intent),
          });
        }
      }

      return Response.json({ ok: true, found: false });
    }

    // ── VERIFY ─────────────────────────────────────────────────────
    if (action === 'verify') {
      const sessionId = body?.sessionId || body?.session_id;
      if (!sessionId) return Response.json({ error: 'Missing sessionId' }, { status: 400 });

      let session = await stripe.checkout.sessions.retrieve(sessionId);
      for (let attempt = 0; attempt < 6 && session.payment_status !== 'paid'; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        session = await stripe.checkout.sessions.retrieve(sessionId);
      }

      const confirmed = await webhookConfirmed(base44, session.id);
      const paymentIntentId = asId(session.payment_intent);

      if (session.payment_status === 'paid') {
        const bySession = await base44.asServiceRole.entities.PaymentTransaction.filter({ stripe_checkout_session_id: session.id });
        const byIntent = paymentIntentId ? await base44.asServiceRole.entities.PaymentTransaction.filter({ stripe_payment_intent_id: paymentIntentId }) : [];
        const records = [...bySession, ...byIntent].filter((record, index, arr) => record?.id && arr.findIndex((item) => item.id === record.id) === index);
        await Promise.all(records.map((record) => base44.asServiceRole.entities.PaymentTransaction.update(record.id, {
          stripe_payment_intent_id: paymentIntentId,
          stripe_customer_id: asId(session.customer),
          payment_status: session.payment_status || session.status || '',
          status: 'succeeded',
          processed_at: nowIso(),
        })));
      }

      return Response.json({
        ok: true,
        paid: session.payment_status === 'paid',
        stripe_paid: session.payment_status === 'paid',
        webhook_confirmed: confirmed,
        pending_webhook: session.payment_status === 'paid' && !confirmed,
        status: session.status,
        payment_intent_id: paymentIntentId,
        customer_email: session.customer_details?.email || null,
      });
    }

    // ── FREE PROMO (no Stripe needed) ───────────────────────────────
    if (action === 'complete_free_promo') {
      const { listing_id, promo_code_id, promo_code, discount_percent, discount_amount, original_amount, discount_bucket, user_id, user_email } = body;

      if (!listing_id || !promo_code_id) {
        return Response.json({ error: 'Missing required fields for free promo' }, { status: 400 });
      }

      const listings = await base44.asServiceRole.entities.Listing.filter({ id: listing_id });
      const listing = listings?.[0];
      if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });
      const dateValidation = await validateResidentialCheckoutDates(base44, listing, null, listing_id);
      if (!dateValidation.ok) return Response.json({ error: dateValidation.error }, { status: dateValidation.error === DATE_UNAVAILABLE_MESSAGE ? 409 : 400 });

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

      await base44.asServiceRole.entities.PaymentTransaction.create({
        stripe_event_id: `free_promo_${listing_id}_${promo_code_id}`,
        event_type: 'free_promo.completed',
        transaction_type: 'listing_payment',
        user_id: user_id || '',
        user_email: user_email || '',
        yardit_record_type: 'Listing',
        yardit_record_id: listing_id,
        status: 'succeeded',
        amount_cents: 0,
        original_amount_cents: Number(original_amount) || 0,
        discount_amount_cents: Number(discount_amount) || 0,
        final_amount_cents: 0,
        currency: 'usd',
        promo_code: promo_code || '',
        payment_status: 'paid',
        non_refund_acknowledged: body?.non_refund_acknowledged === true,
        non_refund_acknowledged_at: body?.non_refund_acknowledged_at || '',
        non_refund_acknowledged_by_user_id: body?.non_refund_acknowledged_by_user_id || user_id || '',
        received_at: nowIso(),
        processed_at: nowIso(),
      });

      return Response.json({ ok: true, free_promo: true });
    }

    // ── CREATE STRIPE CHECKOUT ──────────────────────────────────────
    const listingKind = String(body?.listing_kind || 'residential').toLowerCase();
    const tier = String(body?.tier || (listingKind === 'event' ? 'event' : 'featured')).toLowerCase();
    const requestedEventAmount = Number(body?.amount_cents || body?.amount || 0);
    const basePrice = listingKind === 'event' ? requestedEventAmount : RESIDENTIAL_BASE_PRICES[tier];

    if (!basePrice) {
      return Response.json({ error: listingKind === 'event' ? 'Missing Residential Event amount' : 'Invalid residential tier' }, { status: 400 });
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

    if (listingKind !== 'event') {
      const dateValidation = await validateResidentialCheckoutDates(base44, body, currentUser, body?.listing_id || '');
      if (!dateValidation.ok) {
        return Response.json({ error: dateValidation.error }, { status: dateValidation.error === DATE_UNAVAILABLE_MESSAGE ? 409 : 400 });
      }
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
      listing_kind: listingKind,
      purpose: listingKind === 'event' ? 'event_paid_listing' : 'residential_listing_payment',
      transaction_type: 'listing_payment',
      final_status: listingKind === 'event' ? 'active' : 'scheduled',
      original_amount: String(basePrice),
      final_amount: String(amount),
      non_refund_acknowledged: body?.non_refund_acknowledged ? 'true' : 'false',
      non_refund_acknowledged_at: body?.non_refund_acknowledged_at || '',
      non_refund_acknowledged_by_user_id: body?.non_refund_acknowledged_by_user_id || body?.user_id || currentUser?.id || '',
      non_refund_disclosure_text: body?.non_refund_disclosure_text || '',
      ...(listingKind === 'event' && body?.event_price_breakdown && {
        event_price_breakdown: JSON.stringify({
          total: body.event_price_breakdown.total,
          add_ons: (body.event_price_breakdown.addOns || []).map((item) => item.key),
        }),
      }),
      ...(promoCodeId && {
        promo_code_id: promoCodeId,
        promo_code: promoCode,
        discount_percent: String(promoDiscountPercent),
        discount_bucket: promoDiscountBucket,
        promo_discount_amount: String(promoDiscountAmount),
        early_visibility_enabled: body?.promo_early_visibility_enabled ? 'true' : 'false',
        early_visibility_days: String(body?.promo_early_visibility_days || 0),
        visibility_start_date: body?.promo_visibility_start_date || '',
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
            name: listingKind === 'event' ? `Yardit Residential Event${promoCode ? ` (${promoCode})` : ''}` : `Yardit ${tier} Listing${promoCode ? ` (${promoCode})` : ''}`,
            description: listingKind === 'event'
              ? 'Residential Event checkout'
              : promoCode
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
      original_amount_cents: basePrice,
      discount_amount_cents: promoDiscountAmount,
      final_amount_cents: amount,
      currency: 'usd',
      promo_code: promoCode || '',
      non_refund_acknowledged: body?.non_refund_acknowledged === true,
      non_refund_acknowledged_at: body?.non_refund_acknowledged_at || '',
      non_refund_acknowledged_by_user_id: body?.non_refund_acknowledged_by_user_id || body?.user_id || currentUser?.id || '',
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