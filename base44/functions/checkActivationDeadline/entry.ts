import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@18.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-02-24.acacia',
});

const NEIGHBORHOOD_MIN_HOMES = 5;
const NEIGHBORHOOD_MAX_HOMES = 25;
const NEIGHBORHOOD_BASE_PRICE = 19.99;
const NEIGHBORHOOD_PRICE_PER_HOME = 2;
const NEIGHBORHOOD_PRICE_CAP = 50;
const PREMIUM_FALLBACK_PRICE = 7.99;
const RETRY_DELAY_MS = 6 * 60 * 60 * 1000;

function normalizeNeighborhoodJoinStatus(status) {
  if (status === 'requested') return 'pending';
  if (status === 'approved_pending_payment') return 'approved';
  return status;
}

function getApprovedHomesCount(requests = [], sale = null) {
  const organizerCount = sale?.organizer_participation === 'organizing_only' ? 0 : 1;
  const approved = (requests || []).filter((request) => request?.removed_by_eo !== true && normalizeNeighborhoodJoinStatus(request.status) === 'approved').length + organizerCount;
  return Math.min(NEIGHBORHOOD_MAX_HOMES, approved);
}

function isTerminalSale(listing) {
  return listing?.event_state === 'downgraded' || listing?.event_state === 'canceled' || listing?.status === 'closed' || listing?.status === 'cancelled';
}

function roundAmount(amount) {
  return Math.round(Number(amount || 0) * 100) / 100;
}

function getNeighborhoodChargeAmount(approvedHomes) {
  return roundAmount(Math.min(NEIGHBORHOOD_PRICE_CAP, NEIGHBORHOOD_BASE_PRICE + (approvedHomes * NEIGHBORHOOD_PRICE_PER_HOME)));
}

function getDurationDays(sale) {
  const start = sale?.startDateTime ? new Date(sale.startDateTime) : null;
  const end = sale?.endDateTime ? new Date(sale.endDateTime) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

function toCents(amount) {
  return Math.round(roundAmount(amount) * 100);
}

function sortNewest(records = []) {
  return [...records].sort((a, b) => new Date(b.created_date || b.created_at || 0).getTime() - new Date(a.created_date || a.created_at || 0).getTime());
}

async function getLatestPayment(base44, relatedEntityId, type) {
  const payments = await base44.asServiceRole.entities.Payment.filter({ related_entity_id: relatedEntityId, type });
  return sortNewest(payments)[0] || null;
}

async function upsertPayment(base44, currentPayment, payload) {
  if (currentPayment?.id) {
    return await base44.asServiceRole.entities.Payment.update(currentPayment.id, payload);
  }
  return await base44.asServiceRole.entities.Payment.create(payload);
}

async function chargeSavedMethod({ sale, paymentRecord, amount, purpose }) {
  if (sale?.is_demo_listing) {
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

async function notify(base44, userId, title, message, type, relatedEntityId, metadata = {}) {
  if (!userId) return;
  await base44.asServiceRole.entities.Notification.create({
    userId,
    user_id: userId,
    title,
    message,
    type,
    related_entity_type: 'listing',
    related_entity_id: relatedEntityId,
    metadata,
    read: false,
    is_read: false,
  });
}

async function scheduleRetryJob(base44, saleId, now) {
  const existing = await base44.asServiceRole.entities.NeighborhoodDeadlineJob.filter({ sale_listing_id: saleId, checkpoint_type: 'payment_retry_6h' });
  const activeRetry = existing.find((job) => job.status === 'pending');
  if (activeRetry) return activeRetry;

  return await base44.asServiceRole.entities.NeighborhoodDeadlineJob.create({
    sale_listing_id: saleId,
    checkpoint_type: 'payment_retry_6h',
    run_at: new Date(now.getTime() + RETRY_DELAY_MS).toISOString(),
    status: 'pending',
  });
}

async function applyFallbackFlow(base44, sale, approvedHomes, reason, triggerLabel) {
  const nowIso = new Date().toISOString();
  const neighborhoodPayment = await getLatestPayment(base44, sale.id, 'neighborhood_event');
  const fallbackPayment = await getLatestPayment(base44, sale.id, 'fallback_listing');
  const durationDays = getDurationDays(sale);

  if (neighborhoodPayment?.id && neighborhoodPayment.status !== 'succeeded' && neighborhoodPayment.status !== 'completed') {
    await base44.asServiceRole.entities.Payment.update(neighborhoodPayment.id, {
      status: 'cancelled',
      transaction_id: neighborhoodPayment.transaction_id || '',
    });
  }

  const preparedFallback = await upsertPayment(base44, fallbackPayment, {
    location_id: sale.id,
    amount: PREMIUM_FALLBACK_PRICE,
    plan: 'fallback_listing',
    duration_days: durationDays,
    status: 'pending',
    payment_method: sale.is_demo_listing ? 'demo_saved_card' : 'saved_card',
    transaction_id: fallbackPayment?.transaction_id || '',
    user_id: sale.ownerUserId,
    type: 'fallback_listing',
    related_entity_id: sale.id,
    stripe_payment_intent_id: fallbackPayment?.stripe_payment_intent_id || '',
    stripe_customer_id: fallbackPayment?.stripe_customer_id || neighborhoodPayment?.stripe_customer_id || '',
    stripe_payment_method_id: fallbackPayment?.stripe_payment_method_id || neighborhoodPayment?.stripe_payment_method_id || '',
    created_at: fallbackPayment?.created_at || nowIso,
  });

  const fallbackCharge = await chargeSavedMethod({
    sale,
    paymentRecord: preparedFallback,
    amount: PREMIUM_FALLBACK_PRICE,
    purpose: 'neighborhood_sale_fallback_listing',
  });

  await base44.asServiceRole.entities.Payment.update(preparedFallback.id, {
    amount: PREMIUM_FALLBACK_PRICE,
    status: fallbackCharge.success ? 'succeeded' : 'failed',
    payment_method: fallbackCharge.method || preparedFallback.payment_method || 'saved_card',
    transaction_id: fallbackCharge.paymentIntentId || preparedFallback.transaction_id || '',
    stripe_payment_intent_id: fallbackCharge.paymentIntentId || preparedFallback.stripe_payment_intent_id || '',
  });

  await base44.asServiceRole.functions.invoke('cancelNeighborhoodSale', {
    saleListingId: sale.id,
    internal: true,
    reason,
    finalState: fallbackCharge.success ? 'downgraded' : 'canceled',
    deleteSale: false,
    trigger: triggerLabel,
  });

  if (fallbackCharge.success) {
    await base44.asServiceRole.entities.Listing.update(sale.id, {
      listingType: 'yard_sale',
      tier: 'premium',
      status: 'scheduled',
      event_state: 'downgraded',
      activation_status: 'pending',
      statusReason: reason,
      homeCount: 1,
      spanFeet: 0,
      pricePaid: PREMIUM_FALLBACK_PRICE,
      payment_intent_status: 'captured',
      invite_code: '',
      neighborhood_join_status: 'none',
      neighborhood_sale_id: null,
      participant_origin: 'standalone',
      origin_sale_listing_id: null,
      category: sale.category && sale.category !== 'Neighborhood Sale' ? sale.category : 'Miscellaneous',
    });

    await notify(
      base44,
      sale.ownerUserId,
      'Neighborhood Sale changed to Premium fallback',
      `Your Neighborhood Sale did not lock successfully, so it was converted to a Premium listing and charged $${PREMIUM_FALLBACK_PRICE.toFixed(2)}.`,
      'neighborhood_sale_fallback_applied',
      sale.id,
      { sale_listing_id: sale.id, approved_homes: approvedHomes, reason }
    );
  } else {
    await base44.asServiceRole.entities.Listing.update(sale.id, {
      status: 'cancelled',
      event_state: 'canceled',
      activation_status: 'pending',
      statusReason: `${reason}: ${fallbackCharge.error || 'fallback charge failed'}`,
      payment_intent_status: 'voided',
    });

    await notify(
      base44,
      sale.ownerUserId,
      'Neighborhood Sale cancelled',
      'Your Neighborhood Sale could not be charged at the 24-hour lock point or during the retry, and the fallback Premium charge also failed, so the event was cancelled.',
      'neighborhood_sale_payment_failed_cancelled',
      sale.id,
      { sale_listing_id: sale.id, approved_homes: approvedHomes, reason, error: fallbackCharge.error || null }
    );
  }
}

async function processNeighborhoodCharge(base44, sale, approvedHomes, now, isRetry = false) {
  const durationDays = getDurationDays(sale);
  const existingPayment = await getLatestPayment(base44, sale.id, 'neighborhood_event');
  const lockedAmount = existingPayment?.amount && Number(existingPayment.amount) > 0
    ? roundAmount(existingPayment.amount)
    : Number(sale?.pricePaid || 0) > 0
      ? roundAmount(sale.pricePaid)
      : getNeighborhoodChargeAmount(approvedHomes);
  const alreadyCharged = sale?.status === 'activated_locked'
    || sale?.payment_intent_status === 'captured'
    || existingPayment?.status === 'succeeded'
    || existingPayment?.status === 'completed';

  if (alreadyCharged) {
    await base44.asServiceRole.entities.Listing.update(sale.id, {
      pricePaid: lockedAmount,
      status: 'activated_locked',
      event_state: ['coming_soon', 'active'].includes(sale?.event_state) ? sale.event_state : 'activated_locked',
      activation_status: 'pending',
      homeCount: approvedHomes,
      payment_intent_status: 'captured',
      hold_deadline_at: null,
      statusReason: sale?.statusReason || 'Neighborhood Sale payment locked successfully',
    });
    return;
  }

  const paymentRecord = await upsertPayment(base44, existingPayment, {
    location_id: sale.id,
    amount: lockedAmount,
    plan: 'neighborhood_sale_initial',
    duration_days: durationDays,
    status: 'pending',
    payment_method: sale.is_demo_listing ? 'demo_saved_card' : 'saved_card',
    transaction_id: existingPayment?.transaction_id || '',
    user_id: sale.ownerUserId,
    type: 'neighborhood_event',
    related_entity_id: sale.id,
    stripe_payment_intent_id: existingPayment?.stripe_payment_intent_id || '',
    stripe_customer_id: existingPayment?.stripe_customer_id || '',
    stripe_payment_method_id: existingPayment?.stripe_payment_method_id || '',
    created_at: existingPayment?.created_at || now.toISOString(),
  });

  const charge = await chargeSavedMethod({
    sale,
    paymentRecord,
    amount: lockedAmount,
    purpose: 'neighborhood_sale_event_charge',
  });

  await base44.asServiceRole.entities.Payment.update(paymentRecord.id, {
    amount: lockedAmount,
    status: charge.success ? 'succeeded' : 'failed',
    payment_method: charge.method || paymentRecord.payment_method || 'saved_card',
    transaction_id: charge.paymentIntentId || paymentRecord.transaction_id || '',
    stripe_payment_intent_id: charge.paymentIntentId || paymentRecord.stripe_payment_intent_id || '',
  });

  if (charge.success) {
    await base44.asServiceRole.entities.Listing.update(sale.id, {
      pricePaid: lockedAmount,
      status: 'activated_locked',
      event_state: 'activated_locked',
      activation_status: 'pending',
      homeCount: approvedHomes,
      payment_intent_status: 'captured',
      hold_deadline_at: null,
      statusReason: 'Neighborhood Sale payment locked successfully',
    });

    await notify(
      base44,
      sale.ownerUserId,
      'Neighborhood Sale payment succeeded',
      `Your Neighborhood Sale was charged $${lockedAmount.toFixed(2)} and is now locked for activation.`,
      'neighborhood_sale_payment_succeeded',
      sale.id,
      { sale_listing_id: sale.id, approved_homes: approvedHomes, amount: lockedAmount }
    );
    return;
  }

  if (!isRetry) {
    await base44.asServiceRole.entities.Listing.update(sale.id, {
      homeCount: approvedHomes,
      status: 'payment_pending',
      payment_intent_status: 'hold_requested',
      hold_deadline_at: new Date(now.getTime() + RETRY_DELAY_MS).toISOString(),
      statusReason: charge.error || 'Neighborhood Sale payment failed at 24-hour lock point',
    });

    await scheduleRetryJob(base44, sale.id, now);
    await notify(
      base44,
      sale.ownerUserId,
      'Neighborhood Sale payment retry scheduled',
      'The 24-hour Neighborhood Sale charge failed. Yardit will retry once in 6 hours using your saved payment method.',
      'neighborhood_sale_payment_retry_scheduled',
      sale.id,
      { sale_listing_id: sale.id, approved_homes: approvedHomes, amount: lockedAmount, error: charge.error || null }
    );
    return;
  }

  await applyFallbackFlow(base44, sale, approvedHomes, 'payment_retry_failed', 'payment_retry_failed');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const jobs = await base44.asServiceRole.entities.NeighborhoodDeadlineJob.list('-created_date');
    const now = new Date();
    const processed = [];

    for (const job of jobs.filter((item) => item.status === 'pending')) {
      const runAt = job.run_at ? new Date(job.run_at) : null;
      if (!runAt || Number.isNaN(runAt.getTime()) || runAt > now) continue;

      const sales = await base44.asServiceRole.entities.Listing.filter({ id: job.sale_listing_id });
      const sale = sales[0];
      if (!sale) {
        await base44.asServiceRole.entities.NeighborhoodDeadlineJob.update(job.id, {
          status: 'cancelled',
          processed_at: now.toISOString(),
          error_message: 'Sale not found',
        });
        continue;
      }

      if (isTerminalSale(sale)) {
        await base44.asServiceRole.entities.NeighborhoodDeadlineJob.update(job.id, {
          status: 'cancelled',
          processed_at: now.toISOString(),
        });
        continue;
      }

      const requests = await base44.asServiceRole.entities.JoinRequest.filter({ saleListingId: sale.id });
      const approvedHomes = getApprovedHomesCount(requests, sale);
      await base44.asServiceRole.entities.Listing.update(sale.id, { homeCount: approvedHomes });

      if (job.checkpoint_type === 'warning_48h') {
        if (approvedHomes < NEIGHBORHOOD_MIN_HOMES) {
          if (!sale.host_warning_48h_sent_at && sale.ownerUserId) {
            await notify(
              base44,
              sale.ownerUserId,
              'Neighborhood Sale Warning',
              `${sale.title || 'Neighborhood Sale'} is below the 5-home minimum with 48 hours remaining.`,
              'neighborhood_sale_warning_48h',
              sale.id,
              { sale_listing_id: sale.id, event_title: sale.title }
            );
            await base44.asServiceRole.entities.Listing.update(sale.id, {
              host_warning_48h_sent_at: now.toISOString(),
              homeCount: approvedHomes,
            });
          }

          for (const request of requests) {
            if (request.removed_by_eo === true || normalizeNeighborhoodJoinStatus(request.status) !== 'approved' || request.warning_48h_sent_at || !request.requesterUserId) continue;
            await notify(
              base44,
              request.requesterUserId,
              'Neighborhood Sale Warning',
              `${sale.title || 'Neighborhood Sale'} is still below the 5-home minimum with 48 hours remaining.`,
              'neighborhood_sale_warning_48h',
              sale.id,
              {
                sale_listing_id: sale.id,
                requester_listing_id: request.listingId,
                requester_user_id: request.requesterUserId,
                event_title: sale.title,
              }
            );
            await base44.asServiceRole.entities.JoinRequest.update(request.id, {
              warning_48h_sent_at: now.toISOString(),
            });
          }
        }
      }

      if (job.checkpoint_type === 'charge_24h') {
        if (approvedHomes < NEIGHBORHOOD_MIN_HOMES) {
          await applyFallbackFlow(base44, sale, approvedHomes, 'minimum_not_met_24h', 'minimum_not_met_24h');
        } else {
          await processNeighborhoodCharge(base44, sale, approvedHomes, now, false);
        }
      }

      if (job.checkpoint_type === 'payment_retry_6h') {
        await processNeighborhoodCharge(base44, sale, approvedHomes, now, true);
      }

      await base44.asServiceRole.entities.NeighborhoodDeadlineJob.update(job.id, {
        status: 'completed',
        processed_at: now.toISOString(),
        error_message: null,
      });

      processed.push({ jobId: job.id, checkpoint_type: job.checkpoint_type, saleListingId: sale.id, approvedHomes });
    }

    return Response.json({ success: true, processed_count: processed.length, processed });
  } catch (error) {
    console.error('checkActivationDeadline failed:', error?.message || error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});