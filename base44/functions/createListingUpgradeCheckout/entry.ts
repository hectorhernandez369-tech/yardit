import Stripe from 'npm:stripe@18.5.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getDemoAuthorization, hasDemoBypassRequest } from '../../shared/demoMode.ts';
import { hasResidentialVip, eligibleFounderListing, founderUpgradePatch } from '../../shared/founderVip.ts';
import { secrets } from 'base44:runtime';



const RESIDENTIAL_PRICES = { free: 0, featured: 499, premium: 799 };
const DATE_UNAVAILABLE_MESSAGE = 'These dates are no longer available for this address. Please select different dates.';
const RESERVED_STATUSES = new Set(['active', 'under_review', 'pending_payment', 'scheduled', 'activated_locked', 'coming_soon', 'payment_pending', 'payment_pending_adjustment']);
const nowIso = () => new Date().toISOString();
const asId = (value) => (typeof value === 'string' ? value : value?.id || '');

function parseObjectJson(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function residentialUpgradeAmount(currentTier, targetTier) {
  return Math.max(0, (RESIDENTIAL_PRICES[targetTier] || 0) - (RESIDENTIAL_PRICES[currentTier] || 0));
}

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
  if (typeof listing.lat === 'number' && typeof listing.lng === 'number' && typeof ref.lat === 'number' && typeof ref.lng === 'number') {
    if (Math.abs(listing.lat - ref.lat) < 0.0003 && Math.abs(listing.lng - ref.lng) < 0.0003) return true;
  }
  return normalizeAddressPart(listing.addressText) === normalizeAddressPart(ref.addressText) && normalizeAddressPart(listing.zip) === normalizeAddressPart(ref.zip);
}

async function validateResidentialUpgradeDates(base44, listing) {
  if (!listing?.selectedRangeStartDate || !listing?.selectedRangeEndDate) return { ok: false, error: 'Missing selected date range' };
  if (!listing.addressText || !listing.zip || typeof listing.lat !== 'number' || typeof listing.lng !== 'number') {
    return { ok: false, error: 'Verified address, normalized address, coordinates, and selected date range are required before checkout.' };
  }
  const proposed = new Set(expandDateRange(listing.selectedRangeStartDate, listing.selectedRangeEndDate));
  const listings = await base44.asServiceRole.entities.Listing.filter({ zip: listing.zip });
  const now = new Date();
  for (const candidate of listings || []) {
    if (candidate.id === listing.id || candidate.listingType !== 'yard_sale' || candidate.is_demo_listing) continue;
    if (!RESERVED_STATUSES.has(candidate.status)) continue;
    if (candidate.endDateTime && new Date(candidate.endDateTime) < now) continue;
    if (!sameResidentialAddress(candidate, listing)) continue;
    const reserved = [...expandDateRange(candidate.selectedRangeStartDate, candidate.selectedRangeEndDate), ...(candidate.earlyVisibilityDates || [])];
    if (reserved.some((date) => proposed.has(date))) return { ok: false, error: DATE_UNAVAILABLE_MESSAGE };
  }
  return { ok: true };
}

async function webhookConfirmed(base44, sessionId) {
  const records = await base44.asServiceRole.entities.PaymentTransaction.filter({ stripe_checkout_session_id: sessionId });
  return (records || []).some((record) => record.event_type !== 'checkout.session.created' && record.status === 'succeeded');
}

export default async function(req) {
  try {
    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'), { apiVersion: '2025-02-24.acacia' });
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'create';

    if (action === 'payment_method') {
      const customerId = body?.customer_id;
      if (!customerId) return Response.json({ paymentMethod: null });

      const paymentMethods = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
      const card = paymentMethods.data?.[0]?.card;
      if (!card) return Response.json({ paymentMethod: null });
      return Response.json({ paymentMethod: { brand: String(card.brand || 'card').toUpperCase(), last4: card.last4 } });
    }

    if (action === 'verify') {
      const sessionId = body?.session_id || body?.sessionId;
      if (!sessionId) return Response.json({ error: 'Missing session_id' }, { status: 400 });

      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      let session = await stripe.checkout.sessions.retrieve(sessionId);
      for (let attempt = 0; attempt < 6 && session.payment_status !== 'paid'; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        session = await stripe.checkout.sessions.retrieve(sessionId);
      }

      const confirmed = await webhookConfirmed(base44, session.id);
      const paymentIntentId = asId(session.payment_intent);
      const listingId = session.metadata?.listing_id || '';
      const targetTier = session.metadata?.target_tier || session.metadata?.tier || '';
      const listingKind = session.metadata?.listing_kind || 'residential';

      if (session.payment_status === 'paid') {
        const listings = listingId ? await base44.asServiceRole.entities.Listing.filter({ id: listingId }) : [];
        const listing = listings?.[0];
        if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });
        if (listing.ownerUserId !== user.id && !['admin', 'master', 'super_master'].includes(user.role)) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

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

        const isEventAddOnPurchase = session.metadata?.event_add_on_purchase === 'true';
        const pendingPatch = isEventAddOnPurchase ? parseObjectJson(listing.pending_event_add_on_patch) : null;
        const updateData = isEventAddOnPurchase
          ? { ...(pendingPatch || {}), status: session.metadata?.previous_status || listing.status || 'active', pending_event_add_on_patch: '', pending_event_add_on_keys: [] }
          : listingKind === 'event'
          ? { tier: targetTier, event_tier: targetTier, status: session.metadata?.previous_status || 'active' }
          : { tier: targetTier, status: session.metadata?.previous_status || 'active' };
        await base44.asServiceRole.entities.Listing.update(listingId, {
          ...updateData,
          payment_intent_status: 'captured',
          pending_upgrade_tier: '',
          pending_upgrade_checkout_session_id: '',
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
          pricePaid: isEventAddOnPurchase ? (pendingPatch ? Number(listing.pricePaid || 0) + (Number(session.amount_total || 0) / 100) : Number(listing.pricePaid || 0)) : Number(session.amount_total || 0) / 100,
        });
      }

      return Response.json({
        paid: session.payment_status === 'paid',
        stripe_paid: session.payment_status === 'paid',
        webhook_confirmed: confirmed,
        pending_webhook: session.payment_status === 'paid' && !confirmed,
        sessionId: session.id,
      });
    }

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const listingId = body?.listing_id;
    const targetTier = String(body?.target_tier || '').toLowerCase();
    const returnUrl = body?.return_url;
    const customerEmail = body?.customer_email || user.email;
    const customerId = body?.customer_id || undefined;
    const listingKind = body?.listing_kind || 'residential';
    const isEventAddOnPurchase = body?.event_add_on_purchase === true;
    const demoAuthorization = await getDemoAuthorization(base44, user);

    if (action === 'demo_skip_upgrade') {
      if (!demoAuthorization.canUseDemoMode) {
        return Response.json({ error: 'Demo payment skipping is only available to authorized admins while Demo Mode is enabled.' }, { status: 403 });
      }
      if (!listingId || !targetTier) return Response.json({ error: 'Missing demo upgrade details' }, { status: 400 });
      const demoListings = await base44.asServiceRole.entities.Listing.filter({ id: listingId });
      const demoListing = demoListings?.[0];
      if (!demoListing) return Response.json({ error: 'Listing not found' }, { status: 404 });
      if (demoListing.ownerUserId !== user.id && !demoAuthorization.isAuthorizedAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const amountCents = Number(body?.amount_cents || 0);
      const sessionId = `demo_skip_${Date.now()}`;
      await base44.asServiceRole.entities.Listing.update(listingId, demoListing.listingType === 'event'
        ? { tier: targetTier, event_tier: targetTier, is_demo_listing: true, payment_status: 'skipped_admin_demo', payment_intent_status: 'captured', pending_upgrade_tier: '', pending_upgrade_checkout_session_id: '', stripe_checkout_session_id: sessionId, pricePaid: amountCents / 100 }
        : { tier: targetTier, is_demo_listing: true, payment_status: 'skipped_admin_demo', payment_intent_status: 'captured', pending_upgrade_tier: '', pending_upgrade_checkout_session_id: '', stripe_checkout_session_id: sessionId, pricePaid: amountCents / 100 }
      );
      return Response.json({ ok: true, demo: true, sessionId });
    }

    if (hasDemoBypassRequest(body) && !demoAuthorization.canUseDemoMode) {
      return Response.json({ error: 'Demo payment skipping is only available to authorized admins while Demo Mode is enabled.' }, { status: 403 });
    }

    if (!listingId || !targetTier || !returnUrl) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const listings = await base44.asServiceRole.entities.Listing.filter({ id: listingId });
    const listing = listings?.[0];
    if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });
    if (listing.ownerUserId !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (eligibleFounderListing(listing) && !listing.is_demo_listing && await hasResidentialVip(base44, user.id)) {
      if (listing.listingType === 'yard_sale') {
        const validation = await validateResidentialUpgradeDates(base44, listing);
        if (!validation.ok) return Response.json({ error: validation.error }, { status: 409 });
      }
      const patch = founderUpgradePatch(listing, body);
      const updated = await base44.asServiceRole.entities.Listing.update(listing.id, {
        ...patch, payment_status: 'waived', pending_upgrade_tier: '', pending_upgrade_checkout_session_id: '', pending_event_add_on_patch: '', pending_event_add_on_keys: [],
      });
      return Response.json({ ok: true, founder_vip: true, listing: updated, final_amount: 0 });
    }

    if (action === 'complete_free_event_add_on') {
      if (!isEventAddOnPurchase || listingKind !== 'event') {
        return Response.json({ error: 'Founder promo is only valid for Event add-ons' }, { status: 400 });
      }

      const promoCodeId = body?.promo_code_id || '';
      const promoCodeText = String(body?.promo_code || '').trim().toUpperCase();
      if (!promoCodeId || promoCodeText !== 'FOUNDER') {
        return Response.json({ error: 'Invalid Founder promo' }, { status: 400 });
      }

      const promos = await base44.asServiceRole.entities.ResidentialPromoCode.filter({ id: promoCodeId });
      const promo = promos?.[0];
      if (!promo || String(promo.code || '').trim().toUpperCase() !== 'FOUNDER') {
        return Response.json({ error: 'Founder promo not found' }, { status: 404 });
      }
      if (promo.status !== 'active') {
        return Response.json({ error: 'Founder promo is not active' }, { status: 400 });
      }

      const now = new Date();
      if (promo.starts_at && new Date(promo.starts_at) > now) {
        return Response.json({ error: 'Founder promo is not active yet' }, { status: 400 });
      }
      if (promo.expires_at && new Date(promo.expires_at) < now) {
        return Response.json({ error: 'Founder promo has expired' }, { status: 400 });
      }
      if (!(promo.applies_to_tiers || []).includes('event_add_on')) {
        return Response.json({ error: 'Founder promo is not enabled for Event add-ons' }, { status: 400 });
      }
      if (Number(promo.default_discount_percent || 0) !== 100) {
        return Response.json({ error: 'Founder promo must be configured for 100% off' }, { status: 400 });
      }
      if (promo.max_total_uses != null && Number(promo.total_used_count || 0) >= Number(promo.max_total_uses)) {
        return Response.json({ error: 'Founder promo has reached its usage limit' }, { status: 400 });
      }

      const completed = await base44.asServiceRole.entities.ResidentialPromoRedemption.filter({
        promo_code_id: promo.id,
        user_id: user.id,
        status: 'completed',
      });
      const perUserLimit = Number(promo.per_user_limit || 1);
      if ((completed || []).length >= perUserLimit) {
        return Response.json({ error: 'Founder promo usage limit reached for this account' }, { status: 400 });
      }

      const allowedKeys = new Set(['premium_visibility', 'animation', 'flyer_upload', 'photo_gallery', 'custom_icon', 'marquee']);
      const requestedKeys = Array.isArray(body?.add_on_keys) ? body.add_on_keys.filter((key) => allowedKeys.has(key)) : [];
      if (requestedKeys.length === 0 || requestedKeys.length !== (body?.add_on_keys || []).length) {
        return Response.json({ error: 'Invalid Event add-on selection' }, { status: 400 });
      }

      const sourcePatch = body?.add_on_patch && typeof body.add_on_patch === 'object' ? body.add_on_patch : {};
      const sanitizedPatch = {
        event_add_ons: sourcePatch.event_add_ons || listing.event_add_ons || {},
        event_animation: sourcePatch.event_animation || listing.event_animation || '',
        event_flyer_url: sourcePatch.event_flyer_url || listing.event_flyer_url || '',
        event_photo_gallery_count: Number(sourcePatch.event_photo_gallery_count || listing.event_photo_gallery_count || 0),
        event_photos: Array.isArray(sourcePatch.event_photos) ? sourcePatch.event_photos : (listing.event_photos || []),
        photoUrls: Array.isArray(sourcePatch.photoUrls) ? sourcePatch.photoUrls : (listing.photoUrls || []),
        event_icon: sourcePatch.event_icon || listing.event_icon || '',
        event_logo_url: sourcePatch.event_logo_url || listing.event_logo_url || '',
        marquee_schedule_slots: Array.isArray(sourcePatch.marquee_schedule_slots) ? sourcePatch.marquee_schedule_slots : (listing.marquee_schedule_slots || []),
      };

      const originalAmount = Number(body?.amount_cents || 0);
      if (!Number.isFinite(originalAmount) || originalAmount <= 0) {
        return Response.json({ error: 'Invalid Event add-on amount' }, { status: 400 });
      }

      await base44.asServiceRole.entities.Listing.update(listingId, {
        ...sanitizedPatch,
        status: listing.status || 'active',
        pending_event_add_on_patch: '',
        pending_event_add_on_keys: [],
        pending_upgrade_checkout_session_id: '',
        payment_intent_status: 'none',
      });

      await base44.asServiceRole.entities.ResidentialPromoRedemption.create({
        promo_code_id: promo.id,
        code: promo.code,
        user_id: user.id,
        user_email: user.email || '',
        listing_id: listingId,
        original_amount: originalAmount,
        discount_percent_applied: 100,
        discount_amount: originalAmount,
        final_amount: 0,
        discount_bucket: 'default',
        redeemed_at: nowIso(),
        status: 'completed',
      });

      await base44.asServiceRole.entities.ResidentialPromoCode.update(promo.id, {
        total_used_count: Number(promo.total_used_count || 0) + 1,
        updated_at: nowIso(),
      });

      await base44.asServiceRole.entities.PaymentTransaction.create({
        stripe_event_id: `free_promo_addon_${listingId}_${Date.now()}`,
        event_type: 'free_promo.event_add_on',
        transaction_type: 'listing_upgrade',
        yardit_record_type: 'Listing',
        yardit_record_id: listingId,
        user_id: user.id,
        user_email: user.email || '',
        status: 'succeeded',
        amount_cents: 0,
        original_amount_cents: originalAmount,
        discount_amount_cents: originalAmount,
        final_amount_cents: 0,
        currency: 'usd',
        promo_code: promo.code,
        payment_status: 'paid',
        received_at: nowIso(),
        processed_at: nowIso(),
      });

      return Response.json({ ok: true, free_promo: true, promo_code: promo.code, final_amount: 0 });
    }

    const currentTier = listingKind === 'event' ? (listing.event_tier || listing.tier || 'basic') : (listing.tier || 'free');
    const expectedAmount = listingKind === 'residential'
      ? residentialUpgradeAmount(currentTier, targetTier)
      : Number(body?.amount_cents || 0);
    const amountCents = Number(body?.amount_cents || expectedAmount || 0);

    if (!amountCents || amountCents < 50) return Response.json({ error: 'Invalid upgrade amount' }, { status: 400 });
    if (listingKind === 'residential' && amountCents !== expectedAmount) {
      return Response.json({ error: 'Invalid residential upgrade amount' }, { status: 400 });
    }

    if (listingKind === 'residential') {
      const dateValidation = await validateResidentialUpgradeDates(base44, listing);
      if (!dateValidation.ok) return Response.json({ error: dateValidation.error }, { status: dateValidation.error === DATE_UNAVAILABLE_MESSAGE ? 409 : 400 });
    }

    const separator = String(returnUrl).includes('?') ? '&' : '?';
    const successUrl = `${returnUrl}${separator}payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${returnUrl}${separator}payment=cancel`;
    const metadata = {
      base44_app_id: secrets.get('BASE44_APP_ID') || '',
      purpose: 'listing_upgrade',
      transaction_type: 'listing_upgrade',
      event_add_on_purchase: isEventAddOnPurchase ? 'true' : 'false',
      add_on_keys: Array.isArray(body?.add_on_keys) ? body.add_on_keys.join(',') : '',
      listing_id: listingId,
      current_tier: currentTier,
      target_tier: targetTier,
      tier: targetTier,
      listing_kind: listingKind,
      previous_status: listing.status || 'active',
      non_refund_acknowledged: body?.non_refund_acknowledged ? 'true' : 'false',
      non_refund_acknowledged_at: body?.non_refund_acknowledged_at || '',
      non_refund_acknowledged_by_user_id: body?.non_refund_acknowledged_by_user_id || user.id || '',
      non_refund_disclosure_text: body?.non_refund_disclosure_text || '',
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      payment_method_types: ['card'],
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: isEventAddOnPurchase ? 'Event Add-ons' : `${listingKind === 'event' ? 'Event' : 'Listing'} Upgrade to ${targetTier}` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      metadata,
      payment_intent_data: { metadata },
    });

    const pendingUpdate = isEventAddOnPurchase
      ? {
        pending_event_add_on_patch: JSON.stringify(body?.add_on_patch || {}),
        pending_event_add_on_keys: Array.isArray(body?.add_on_keys) ? body.add_on_keys : [],
        pending_upgrade_checkout_session_id: session.id,
        payment_intent_status: 'hold_requested',
      }
      : {
        pending_upgrade_tier: targetTier,
        pending_upgrade_checkout_session_id: session.id,
        payment_intent_status: 'hold_requested',
      };
    await base44.asServiceRole.entities.Listing.update(listingId, pendingUpdate);

    await base44.asServiceRole.entities.PaymentTransaction.create({
      stripe_event_id: `checkout_created_${session.id}`,
      event_type: 'checkout.session.created',
      transaction_type: 'listing_upgrade',
      yardit_record_type: 'Listing',
      yardit_record_id: listingId,
      status: 'received',
      amount_cents: amountCents,
      original_amount_cents: amountCents,
      discount_amount_cents: 0,
      final_amount_cents: amountCents,
      currency: 'usd',
      non_refund_acknowledged: body?.non_refund_acknowledged === true,
      non_refund_acknowledged_at: body?.non_refund_acknowledged_at || '',
      non_refund_acknowledged_by_user_id: body?.non_refund_acknowledged_by_user_id || user.id || '',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: asId(session.payment_intent),
      stripe_customer_id: asId(session.customer),
      payment_status: session.payment_status || session.status || '',
      metadata_json: JSON.stringify(metadata),
      received_at: nowIso(),
      processed_at: nowIso(),
    });

    console.log('Listing upgrade checkout created', { sessionId: session.id, listingId, currentTier, targetTier, amountCents });
    return Response.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    console.error('createListingUpgradeCheckout error', error?.message || error);
    return Response.json({ error: error?.message || 'Upgrade checkout failed' }, { status: 500 });
  }
}