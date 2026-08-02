import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@18.5.0';
import { NEIGHBORHOOD_FLAT_PRICE, NEIGHBORHOOD_FLAT_PRICE_CENTS } from '../../shared/neighborhoodPricing.ts';
import { isGlobalDemoModeEnabled } from '../../shared/demoMode.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-02-24.acacia',
});

const NEIGHBORHOOD_MIN_HOMES = 5;
const RESCUE_EXPIRATION_DAYS = 7;

function normalizeNeighborhoodJoinStatus(status) {
  if (status === 'requested') return 'pending';
  if (status === 'approved_pending_payment') return 'approved';
  return status;
}

function getApprovedHomesCount(requests = [], sale = null) {
  const organizerCount = sale?.organizer_participation === 'organizing_only' ? 0 : 1;
  return (requests || []).filter((request) => request?.removed_by_eo !== true && normalizeNeighborhoodJoinStatus(request.status) === 'approved').length + organizerCount;
}

function createToken() {
  return crypto.randomUUID().replaceAll('-', '');
}

function roundAmount(amount) {
  return Math.round(Number(amount || 0) * 100) / 100;
}

function getNeighborhoodChargeAmount() {
  return NEIGHBORHOOD_FLAT_PRICE;
}

function toCents(amount) {
  const rounded = roundAmount(amount);
  if (rounded === NEIGHBORHOOD_FLAT_PRICE) return NEIGHBORHOOD_FLAT_PRICE_CENTS;
  return Math.round(rounded * 100);
}

function getDurationDays(sale) {
  const start = sale?.startDateTime ? new Date(sale.startDateTime) : null;
  const end = sale?.endDateTime ? new Date(sale.endDateTime) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

async function getLatestPayment(base44, relatedEntityId, type) {
  const payments = await base44.asServiceRole.entities.Payment.filter({ related_entity_id: relatedEntityId, type });
  return [...payments].sort((a, b) => new Date(b.created_date || b.created_at || 0).getTime() - new Date(a.created_date || a.created_at || 0).getTime())[0] || null;
}

async function chargeSavedMethod({ base44, sale, paymentRecord, amount, purpose }) {
  if (sale?.is_demo_listing && await isGlobalDemoModeEnabled(base44)) {
    return {
      success: true,
      paymentIntentId: `demo_${purpose}_${Date.now()}`,
      method: 'demo_card',
    };
  }

  if (!paymentRecord?.stripe_customer_id || !paymentRecord?.stripe_payment_method_id) {
    return { success: false, error: 'No saved payment method was found for the organizer.' };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: toCents(amount),
      currency: 'usd',
      customer: paymentRecord.stripe_customer_id,
      payment_method: paymentRecord.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
        purpose,
        sale_listing_id: sale.id,
        owner_user_id: sale.ownerUserId,
      },
    });

    return {
      success: paymentIntent.status === 'succeeded',
      paymentIntentId: paymentIntent.id,
      method: paymentIntent.payment_method ? 'saved_card' : 'card',
      error: paymentIntent.status === 'succeeded' ? null : `Stripe status: ${paymentIntent.status}`,
    };
  } catch (error) {
    console.error('Neighborhood Stripe charge failed:', error?.message || error);
    return { success: false, error: error?.message || 'Stripe charge failed' };
  }
}

function getFallbackRescuePayload(sale, participantListing) {
  return {
    title: participantListing?.title || 'My Yard Sale',
    description: participantListing?.description || '',
    category: participantListing?.category || 'Miscellaneous',
    categories: participantListing?.categories?.length ? participantListing.categories : ['Miscellaneous'],
    collectible_type: participantListing?.collectible_type || null,
    addressText: participantListing?.addressText || '',
    city: participantListing?.city || '',
    state: participantListing?.state || '',
    zip: participantListing?.zip || '',
    lat: participantListing?.lat ?? null,
    lng: participantListing?.lng ?? null,
    saleTitle: sale?.title || 'Neighborhood Sale',
  };
}

function getStandaloneStatusForWindow(listing, now) {
  const start = listing?.startDateTime ? new Date(listing.startDateTime) : null;
  const end = listing?.endDateTime ? new Date(listing.endDateTime) : null;
  if (!start || Number.isNaN(start.getTime())) return 'scheduled';
  if (now < start) return 'scheduled';
  if (end && !Number.isNaN(end.getTime()) && now > end) return 'expired';
  return 'active';
}

async function getIndependentPaidAmount(base44, listing) {
  const transactions = await base44.asServiceRole.entities.PaymentTransaction.filter({ yardit_record_id: listing.id });
  const independentPaid = (transactions || []).find((transaction) =>
    ['succeeded', 'subscription_active'].includes(transaction.status) &&
    ['listing_payment', 'listing_upgrade'].includes(transaction.transaction_type) &&
    !String(transaction.event_type || '').startsWith('neighborhood_sale_')
  );

  if (independentPaid?.amount_cents > 0) return Number(independentPaid.amount_cents) / 100;
  if (listing.payment_status === 'paid' && Number(listing.pricePaid || 0) > 0) return Number(listing.pricePaid);
  return 0;
}

async function buildStandaloneParticipantPatch(base44, listing, now, participantOrigin = '') {
  const status = getStandaloneStatusForWindow(listing, now);
  if (participantOrigin === 'existing_listing' || listing?.participant_origin === 'existing_listing') {
    return {
      participant_origin: 'standalone',
      status,
      activation_status: status === 'active' ? 'active' : 'pending',
      neighborhood_join_status: 'none',
      neighborhood_sale_id: null,
      origin_sale_listing_id: null,
      hold_deadline_at: null,
    };
  }

  const paidAmount = await getIndependentPaidAmount(base44, listing);
  return {
    tier: 'free',
    pricePaid: paidAmount > 0 ? paidAmount : 0,
    participant_origin: 'standalone',
    status,
    activation_status: status === 'active' ? 'active' : 'pending',
    neighborhood_join_status: 'none',
    neighborhood_sale_id: null,
    origin_sale_listing_id: null,
    payment_intent_status: 'none',
    hold_deadline_at: null,
    pending_checkout_session_id: '',
    pending_payment_tier: '',
    pending_upgrade_tier: '',
    pending_upgrade_checkout_session_id: '',
  };
}

function getListingDeepLink(listingId, upgrade = false) {
  return `/ListingDetail?id=${listingId}${upgrade ? '&upgrade=1' : ''}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const saleListingId = payload?.saleListingId;
    const reason = payload?.reason || 'neighborhood_sale_canceled';
    const deleteSale = payload?.deleteSale === true;
    const trigger = payload?.trigger || 'manual';
    const skipCancellationCharge = payload?.skipCancellationCharge === true;
    const preserveFallbackListingId = payload?.preserveFallbackListingId || '';
    const preserveApprovedParticipants = payload?.preserveApprovedParticipants === true;

    if (!saleListingId) {
      return Response.json({ error: 'saleListingId is required' }, { status: 400 });
    }

    const sales = await base44.asServiceRole.entities.Listing.filter({ id: saleListingId });
    const sale = sales[0];

    if (!sale) {
      return Response.json({ error: 'Neighborhood Sale not found' }, { status: 404 });
    }

    const actingUser = await base44.auth.me().catch(() => null);
    if (actingUser && actingUser.id !== sale.ownerUserId && actingUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const rescueExpiry = new Date(now.getTime() + RESCUE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const requests = await base44.asServiceRole.entities.JoinRequest.filter({ saleListingId });
    const approvedHomes = getApprovedHomesCount(requests, sale);

    let typeADeleted = 0;
    let typeBDetached = 0;
    let rescueCount = 0;
    let chargeAmount = 0;

    const isCommitted = approvedHomes >= NEIGHBORHOOD_MIN_HOMES;
    const existingPayment = await getLatestPayment(base44, sale.id, 'neighborhood_event');
    const alreadyCharged = sale?.status === 'activated_locked' || sale?.payment_intent_status === 'captured' || existingPayment?.status === 'succeeded' || existingPayment?.status === 'completed';

    if (isCommitted && !alreadyCharged && !skipCancellationCharge) {
      chargeAmount = getNeighborhoodChargeAmount(approvedHomes);
      
      const paymentRecord = existingPayment?.id ? existingPayment : await base44.asServiceRole.entities.Payment.create({
        location_id: sale.id,
        amount: chargeAmount,
        plan: 'neighborhood_sale_initial',
        duration_days: getDurationDays(sale),
        status: 'pending',
        payment_method: sale.is_demo_listing ? 'demo_saved_card' : 'saved_card',
        user_id: sale.ownerUserId,
        type: 'neighborhood_event',
        related_entity_id: sale.id,
        stripe_customer_id: existingPayment?.stripe_customer_id || sale.organizer_stripe_customer_id || '',
        stripe_payment_method_id: existingPayment?.stripe_payment_method_id || sale.organizer_stripe_payment_method_id || '',
        created_at: nowIso,
      });

      const charge = await chargeSavedMethod({
        base44,
        sale,
        paymentRecord,
        amount: chargeAmount,
        purpose: 'neighborhood_sale_cancellation_charge',
      });

      await base44.asServiceRole.entities.Payment.update(paymentRecord.id, {
        amount: chargeAmount,
        status: charge.success ? 'succeeded' : 'failed',
        payment_method: charge.method || paymentRecord.payment_method || 'saved_card',
        transaction_id: charge.paymentIntentId || paymentRecord.transaction_id || '',
        stripe_payment_intent_id: charge.paymentIntentId || paymentRecord.stripe_payment_intent_id || '',
      });

      await base44.asServiceRole.entities.PaymentTransaction.create({
        stripe_event_id: `neighborhood_sale_cancellation_charge_${charge.paymentIntentId || sale.id}_${Date.now()}`,
        event_type: 'neighborhood_sale_cancellation_charge',
        transaction_type: 'listing_payment',
        user_id: sale.ownerUserId || '',
        yardit_record_type: 'Listing',
        yardit_record_id: sale.id,
        status: charge.success ? 'succeeded' : 'failed',
        amount_cents: toCents(chargeAmount),
        original_amount_cents: toCents(chargeAmount),
        discount_amount_cents: 0,
        final_amount_cents: toCents(chargeAmount),
        currency: 'usd',
        payment_status: charge.success ? 'succeeded' : 'failed',
        stripe_payment_intent_id: charge.paymentIntentId || '',
        payment_method_last4: charge.method || '',
        refund_status: 'none',
        non_refund_acknowledged: sale.non_refund_acknowledged === true,
        non_refund_acknowledged_at: sale.non_refund_acknowledged_at || '',
        non_refund_acknowledged_by_user_id: sale.non_refund_acknowledged_by_user_id || sale.ownerUserId || '',
        received_at: nowIso,
        processed_at: nowIso,
      });

      if (charge.success) {
        await base44.asServiceRole.entities.Listing.update(sale.id, {
          pricePaid: chargeAmount,
          payment_intent_status: 'captured',
        });
      }
    }

    if (sale.organizer_participant_listing_id && sale.organizer_participant_listing_id !== preserveFallbackListingId) {
      const organizerListings = await base44.asServiceRole.entities.Listing.filter({ id: sale.organizer_participant_listing_id });
      if (organizerListings[0]) {
        if (preserveApprovedParticipants) {
          await base44.asServiceRole.entities.Listing.update(organizerListings[0].id, await buildStandaloneParticipantPatch(base44, organizerListings[0], now, organizerListings[0].participant_origin));
          typeBDetached += 1;
        } else {
          await base44.asServiceRole.entities.Listing.delete(organizerListings[0].id);
          typeADeleted += 1;
        }
      }
    }

    for (const request of requests) {
      const normalizedStatus = normalizeNeighborhoodJoinStatus(request.status);
      const isApprovedParticipant = request.removed_by_eo !== true && normalizedStatus === 'approved';
      if (preserveApprovedParticipants && !isApprovedParticipant) continue;

      const participantListings = request.listingId
        ? await base44.asServiceRole.entities.Listing.filter({ id: request.listingId })
        : [];
      const participantListing = participantListings[0] || null;
      const participantOrigin = request.participant_origin_snapshot || participantListing?.participant_origin || 'standalone';
      const requesterUserId = request.requesterUserId || participantListing?.ownerUserId || null;
      let cancellationSentAt = request.cancellation_24h_sent_at || null;

      if (preserveApprovedParticipants) {
        if (participantListing) {
          await base44.asServiceRole.entities.Listing.update(participantListing.id, await buildStandaloneParticipantPatch(base44, participantListing, now, participantOrigin));
          typeBDetached += 1;
        }

        if (!cancellationSentAt && requesterUserId) {
          await base44.asServiceRole.entities.Notification.create({
            userId: requesterUserId,
            user_id: requesterUserId,
            title: 'Neighborhood Sale canceled',
            message: 'The sale did not reach the required number of homes. Your yard sale is no longer included with the Neighborhood Sale and will use its standalone visibility.',
            type: 'neighborhood_sale_participant_standalone',
            related_entity_type: 'listing',
            related_entity_id: participantListing?.id || request.listingId || saleListingId,
            delivery_methods: ['push', 'bell'],
            deep_link: getListingDeepLink(participantListing?.id || request.listingId || saleListingId, true),
            dedupe_key: `neighborhood_sale_failed_participant_${saleListingId}_${requesterUserId}_${participantListing?.id || request.listingId || 'listing'}`,
            metadata: {
              sale_listing_id: saleListingId,
              requester_listing_id: participantListing?.id || request.listingId,
              requester_user_id: requesterUserId,
              event_title: sale.title,
              upgrade_url: getListingDeepLink(participantListing?.id || request.listingId || saleListingId, true),
              offered_upgrades: ['featured', 'premium'],
            },
            read: false,
            is_read: false,
          });
          cancellationSentAt = nowIso;
        }

        await base44.asServiceRole.entities.JoinRequest.update(request.id, {
          status: 'denied',
          removed_by_eo: true,
          removed_at: nowIso,
          removal_reason: reason,
          participant_origin_snapshot: participantOrigin,
          cancellation_24h_sent_at: cancellationSentAt,
        });
        continue;
      }

      if (!cancellationSentAt && requesterUserId) {
        if (participantOrigin === 'neighborhood_invite' && participantListing?.addressText && participantListing?.city && participantListing?.state && participantListing?.zip && typeof participantListing?.lat === 'number' && typeof participantListing?.lng === 'number') {
          const rescueToken = createToken();
          const rescuePayload = getFallbackRescuePayload(sale, participantListing);

          await base44.asServiceRole.entities.NeighborhoodTierRescue.create({
            token: rescueToken,
            user_id: requesterUserId,
            listing_id: participantListing.id,
            sale_listing_id: saleListingId,
            title: rescuePayload.title,
            description: rescuePayload.description,
            category: rescuePayload.category,
            categories: rescuePayload.categories,
            collectible_type: rescuePayload.collectible_type,
            addressText: rescuePayload.addressText,
            city: rescuePayload.city,
            state: rescuePayload.state,
            zip: rescuePayload.zip,
            lat: rescuePayload.lat,
            lng: rescuePayload.lng,
            status: 'pending',
            expires_at: rescueExpiry,
          });

          await base44.asServiceRole.entities.Notification.create({
            userId: requesterUserId,
            user_id: requesterUserId,
            title: 'Neighborhood Sale canceled',
            message: `${sale.title || 'Neighborhood Sale'} did not reach the ${NEIGHBORHOOD_MIN_HOMES}-home minimum. Pick a tier to finish your own Yard Sale.`,
            type: 'neighborhood_rescue_ready',
            related_entity_type: 'listing',
            related_entity_id: saleListingId,
            metadata: {
              sale_listing_id: saleListingId,
              requester_listing_id: participantListing.id,
              requester_user_id: requesterUserId,
              event_title: sale.title,
              rescue_token: rescueToken,
              rescue_expires_at: rescueExpiry,
            },
            read: false,
            is_read: false,
          });

          rescueCount += 1;
        } else {
          await base44.asServiceRole.entities.Notification.create({
            userId: requesterUserId,
            user_id: requesterUserId,
            title: 'Neighborhood Sale canceled',
            message: `${sale.title || 'Neighborhood Sale'} was canceled. Your listing is no longer grouped with this event.`,
            type: 'neighborhood_sale_canceled',
            related_entity_type: 'listing',
            related_entity_id: saleListingId,
            metadata: {
              sale_listing_id: saleListingId,
              requester_listing_id: request.listingId,
              requester_user_id: requesterUserId,
              event_title: sale.title,
            },
            read: false,
            is_read: false,
          });
        }

        cancellationSentAt = nowIso;
      }

      await base44.asServiceRole.entities.JoinRequest.update(request.id, {
        status: 'denied',
        removed_by_eo: true,
        removed_at: nowIso,
        removal_reason: reason,
        participant_origin_snapshot: participantOrigin,
        cancellation_24h_sent_at: cancellationSentAt,
      });

      if (!participantListing) {
        continue;
      }

      if (participantOrigin === 'neighborhood_invite' || participantOrigin === 'neighborhood_join') {
        await base44.asServiceRole.entities.Listing.delete(participantListing.id);
        typeADeleted += 1;
        continue;
      }

      await base44.asServiceRole.entities.Listing.update(participantListing.id, await buildStandaloneParticipantPatch(base44, participantListing, now, participantOrigin));
      typeBDetached += 1;
    }

    if (!deleteSale && sale.ownerUserId && !sale.host_cancellation_24h_sent_at) {
      await base44.asServiceRole.entities.Notification.create({
        userId: sale.ownerUserId,
        user_id: sale.ownerUserId,
        title: trigger === 'premium_fallback_applied' ? 'Premium Yard Sale fallback applied' : 'Neighborhood Sale canceled',
        message: trigger === 'premium_fallback_applied'
          ? `${sale.title || 'Neighborhood Sale'} did not reach the ${NEIGHBORHOOD_MIN_HOMES}-home minimum. Your connected host Yard Sale was upgraded to Premium for $7.99.`
          : `${sale.title || 'Neighborhood Sale'} did not reach the ${NEIGHBORHOOD_MIN_HOMES}-home minimum and was canceled with no charge.`,
        type: trigger === 'premium_fallback_applied' ? 'neighborhood_sale_fallback_applied' : 'neighborhood_sale_fallback_cancelled',
        related_entity_type: 'listing',
        related_entity_id: trigger === 'premium_fallback_applied' && preserveFallbackListingId ? preserveFallbackListingId : saleListingId,
        delivery_methods: ['push', 'bell'],
        deep_link: getListingDeepLink(trigger === 'premium_fallback_applied' && preserveFallbackListingId ? preserveFallbackListingId : saleListingId),
        dedupe_key: `neighborhood_sale_failed_organizer_${saleListingId}_${sale.ownerUserId}_${trigger}`,
        metadata: {
          sale_listing_id: saleListingId,
          fallback_listing_id: preserveFallbackListingId || '',
          event_title: sale.title,
          trigger,
        },
        read: false,
        is_read: false,
      });
    }

    const jobs = await base44.asServiceRole.entities.NeighborhoodDeadlineJob.filter({ sale_listing_id: saleListingId });
    for (const job of jobs) {
      if (job.status === 'pending') {
        await base44.asServiceRole.entities.NeighborhoodDeadlineJob.update(job.id, {
          status: 'cancelled',
          processed_at: nowIso,
        });
      }
    }

    const finalState = payload?.finalState || 'canceled';
    
    const updatedSale = {
      ...sale,
      event_state: finalState,
      status: 'closed',
    };

    if (deleteSale) {
      await base44.asServiceRole.entities.Listing.delete(saleListingId);
    } else {
      await base44.asServiceRole.entities.Listing.update(saleListingId, {
        event_state: finalState,
        status: 'closed',
        activation_status: 'pending',
        statusReason: reason,
        homeCount: approvedHomes,
        host_cancellation_24h_sent_at: sale.host_cancellation_24h_sent_at || nowIso,
      });
    }

    await base44.asServiceRole.functions.invoke('syncNeighborhoodDeadlineJobs', {
      data: deleteSale ? sale : updatedSale,
      event: { type: deleteSale ? 'delete' : 'update', entity_id: saleListingId }
    }).catch(e => console.error("sync error:", e));

    return Response.json({
      success: true,
      saleListingId,
      deleteSale,
      approvedHomes,
      typeADeleted,
      typeBDetached,
      rescueCount,
      preserveApprovedParticipants,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});