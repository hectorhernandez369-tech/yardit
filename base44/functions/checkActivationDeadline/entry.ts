import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@18.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-02-24.acacia',
});

const NEIGHBORHOOD_MIN_HOMES = 5;
const NEIGHBORHOOD_MAX_HOMES = 25;
const NEIGHBORHOOD_BASE_PRICE_CENTS = 1999;
const NEIGHBORHOOD_PRICE_PER_HOME_CENTS = 200;
const NEIGHBORHOOD_PRICE_CAP_CENTS = 5000;
const PREMIUM_FALLBACK_CENTS = 799;
const RETRY_DELAY_MS = 6 * 60 * 60 * 1000;

function normalizeNeighborhoodJoinStatus(status) {
  if (status === 'requested') return 'pending';
  if (status === 'approved_pending_payment') return 'approved';
  return status;
}

function getApprovedHomesCount(requests = []) {
  return Math.min(
    NEIGHBORHOOD_MAX_HOMES,
    (requests || []).filter((request) => request?.removed_by_eo !== true && normalizeNeighborhoodJoinStatus(request.status) === 'approved').length + 1,
  );
}

function isTerminalSale(listing) {
  return listing?.event_state === 'downgraded' || listing?.event_state === 'canceled' || listing?.status === 'closed' || listing?.status === 'expired';
}

function centsToAmount(cents) {
  return Number((Number(cents || 0) / 100).toFixed(2));
}

function calculateNeighborhoodChargeCents(approvedHomes) {
  const homes = Math.max(0, Math.min(NEIGHBORHOOD_MAX_HOMES, Number(approvedHomes) || 0));
  return Math.min(NEIGHBORHOOD_PRICE_CAP_CENTS, NEIGHBORHOOD_BASE_PRICE_CENTS + homes * NEIGHBORHOOD_PRICE_PER_HOME_CENTS);
}

function getDurationDays(listing) {
  const start = listing?.selectedRangeStartDate ? new Date(`${listing.selectedRangeStartDate}T00:00:00`) : null;
  const end = listing?.selectedRangeEndDate ? new Date(`${listing.selectedRangeEndDate}T00:00:00`) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
}

async function createNotification(base44, payload) {
  if (!payload?.userId && !payload?.user_id) return;
  await base44.asServiceRole.entities.Notification.create({
    read: false,
    is_read: false,
    ...payload,
  });
}

async function findPayment(base44, relatedEntityId, type) {
  const payments = await base44.asServiceRole.entities.Payment.filter({ related_entity_id: relatedEntityId, type }, '-created_date');
  return payments[0] || null;
}

async function upsertPayment(base44, paymentData) {
  const existing = await findPayment(base44, paymentData.related_entity_id, paymentData.type);
  if (existing) {
    await base44.asServiceRole.entities.Payment.update(existing.id, paymentData);
    return existing.id;
  }
  const created = await base44.asServiceRole.entities.Payment.create(paymentData);
  return created.id;
}

async function chargeSavedMethod({ sale, amountCents, metadata, description }) {
  if (!sale?.organizer_stripe_customer_id || !sale?.organizer_stripe_payment_method_id) {
    throw new Error('Organizer payment method is missing');
  }

  return await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: sale.organizer_stripe_customer_id,
    payment_method: sale.organizer_stripe_payment_method_id,
    off_session: true,
    confirm: true,
    description,
    metadata: {
      base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
      organizer_user_id: sale.ownerUserId || '',
      sale_listing_id: sale.id,
      ...metadata,
    },
  });
}

function buildFallbackListingUpdate(sale, nowIso) {
  const cleanedCategories = (sale?.categories || []).filter((item) => item && item !== 'Neighborhood Sale');
  const category = sale?.category && sale.category !== 'Neighborhood Sale' ? sale.category : 'Miscellaneous';

  return {
    listingType: 'yard_sale',
    tier: 'premium',
    status: 'scheduled',
    activation_status: 'active',
    category,
    categories: cleanedCategories.length ? cleanedCategories : [category],
    collectible_type: sale?.collectible_type || null,
    addressText: sale?.host_addressText || sale?.addressText,
    city: sale?.host_city || sale?.city,
    state: sale?.host_state || sale?.state,
    zip: sale?.host_zip || sale?.zip,
    lat: sale?.host_address_lat ?? sale?.lat,
    lng: sale?.host_address_lng ?? sale?.lng,
    pricePaid: centsToAmount(PREMIUM_FALLBACK_CENTS),
    payment_intent_status: 'captured',
    neighborhood_join_status: 'none',
    neighborhood_sale_id: null,
    participant_origin: 'standalone',
    hold_deadline_at: null,
    participant_lock_at: nowIso,
    neighborhood_charge_locked_at: nowIso,
    neighborhood_charge_amount: centsToAmount(PREMIUM_FALLBACK_CENTS),
    statusReason: 'Neighborhood Sale converted to Premium fallback.',
  };
}

async function completeFallbackFlow(base44, sale, nowIso, approvedHomes, reason, fallbackIntentId, fallbackSucceeded) {
  await upsertPayment(base44, {
    location_id: sale.id,
    related_entity_id: sale.id,
    user_id: sale.ownerUserId,
    amount: sale.neighborhood_charge_amount || 0,
    type: 'neighborhood_event',
    plan: 'neighborhood_sale_initial',
    duration_days: getDurationDays(sale),
    status: 'cancelled',
    payment_method: sale.organizer_stripe_payment_method_id || '',
    transaction_id: sale.organizer_setup_intent_id || sale.organizer_setup_session_id || '',
    stripe_payment_intent_id: '',
    stripe_customer_id: sale.organizer_stripe_customer_id || '',
    stripe_payment_method_id: sale.organizer_stripe_payment_method_id || '',
    setup_reference_id: sale.organizer_setup_intent_id || sale.organizer_setup_session_id || '',
  });

  await upsertPayment(base44, {
    location_id: sale.id,
    related_entity_id: sale.id,
    user_id: sale.ownerUserId,
    amount: centsToAmount(PREMIUM_FALLBACK_CENTS),
    type: 'fallback_listing',
    plan: 'premium_fallback',
    duration_days: getDurationDays(sale),
    status: fallbackSucceeded ? 'succeeded' : 'failed',
    payment_method: sale.organizer_stripe_payment_method_id || '',
    transaction_id: fallbackIntentId || sale.organizer_setup_intent_id || sale.organizer_setup_session_id || '',
    stripe_payment_intent_id: fallbackIntentId || '',
    stripe_customer_id: sale.organizer_stripe_customer_id || '',
    stripe_payment_method_id: sale.organizer_stripe_payment_method_id || '',
    setup_reference_id: sale.organizer_setup_intent_id || sale.organizer_setup_session_id || '',
  });

  await base44.asServiceRole.functions.invoke('cancelNeighborhoodSale', {
    saleListingId: sale.id,
    internal: true,
    reason,
    finalState: 'downgraded',
    deleteSale: false,
    trigger: reason,
  });

  if (fallbackSucceeded) {
    await base44.asServiceRole.entities.Listing.update(sale.id, buildFallbackListingUpdate(sale, nowIso));
    await createNotification(base44, {
      userId: sale.ownerUserId,
      user_id: sale.ownerUserId,
      title: 'Neighborhood Sale converted to Premium',
      message: approvedHomes < NEIGHBORHOOD_MIN_HOMES
        ? `${sale.title || 'Neighborhood Sale'} did not reach 5 approved homes. Your organizer listing was converted to Premium and charged $7.99.`
        : `${sale.title || 'Neighborhood Sale'} could not complete organizer payment after retry. Your organizer listing was converted to Premium and charged $7.99.`,
      type: 'neighborhood_sale_fallback_success',
      related_entity_type: 'listing',
      related_entity_id: sale.id,
      metadata: {
        sale_listing_id: sale.id,
        approved_homes: approvedHomes,
      },
    });
  } else {
    await createNotification(base44, {
      userId: sale.ownerUserId,
      user_id: sale.ownerUserId,
      title: 'Neighborhood Sale payment failed',
      message: `${sale.title || 'Neighborhood Sale'} could not be completed and the Premium fallback charge also failed. The event has been canceled.`,
      type: 'neighborhood_sale_fallback_failed',
      related_entity_type: 'listing',
      related_entity_id: sale.id,
      metadata: {
        sale_listing_id: sale.id,
        approved_homes: approvedHomes,
      },
    });
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const jobs = await base44.asServiceRole.entities.NeighborhoodDeadlineJob.list('-created_date');
    const now = new Date();
    const nowIso = now.toISOString();
    const processed = [];

    for (const job of jobs.filter((item) => item.status === 'pending')) {
      const runAt = job.run_at ? new Date(job.run_at) : null;
      if (!runAt || Number.isNaN(runAt.getTime()) || runAt > now) continue;

      const sales = await base44.asServiceRole.entities.Listing.filter({ id: job.sale_listing_id });
      const sale = sales[0];
      if (!sale) {
        await base44.asServiceRole.entities.NeighborhoodDeadlineJob.update(job.id, {
          status: 'cancelled',
          processed_at: nowIso,
          error_message: 'Sale not found',
        });
        continue;
      }

      if (isTerminalSale(sale)) {
        await base44.asServiceRole.entities.NeighborhoodDeadlineJob.update(job.id, {
          status: 'cancelled',
          processed_at: nowIso,
        });
        continue;
      }

      const requests = await base44.asServiceRole.entities.JoinRequest.filter({ saleListingId: sale.id });
      const approvedHomes = getApprovedHomesCount(requests);
      await base44.asServiceRole.entities.Listing.update(sale.id, { homeCount: approvedHomes });

      if (job.checkpoint_type === 'warning_48h') {
        if (approvedHomes < NEIGHBORHOOD_MIN_HOMES) {
          if (!sale.host_warning_48h_sent_at && sale.ownerUserId) {
            await createNotification(base44, {
              userId: sale.ownerUserId,
              user_id: sale.ownerUserId,
              title: 'Neighborhood Sale Warning',
              message: `${sale.title || 'Neighborhood Sale'} is below the 5-home minimum with 48 hours remaining.`,
              type: 'neighborhood_sale_warning_48h',
              related_entity_type: 'listing',
              related_entity_id: sale.id,
              metadata: {
                sale_listing_id: sale.id,
                event_title: sale.title,
              },
            });
            await base44.asServiceRole.entities.Listing.update(sale.id, {
              host_warning_48h_sent_at: nowIso,
              homeCount: approvedHomes,
            });
          }

          for (const request of requests) {
            if (request.removed_by_eo === true || normalizeNeighborhoodJoinStatus(request.status) !== 'approved' || request.warning_48h_sent_at) continue;
            if (!request.requesterUserId) continue;
            await createNotification(base44, {
              userId: request.requesterUserId,
              user_id: request.requesterUserId,
              title: 'Neighborhood Sale Warning',
              message: `${sale.title || 'Neighborhood Sale'} is still below the 5-home minimum with 48 hours remaining.`,
              type: 'neighborhood_sale_warning_48h',
              related_entity_type: 'listing',
              related_entity_id: sale.id,
              metadata: {
                sale_listing_id: sale.id,
                requester_listing_id: request.listingId,
                requester_user_id: request.requesterUserId,
                event_title: sale.title,
              },
            });
            await base44.asServiceRole.entities.JoinRequest.update(request.id, {
              warning_48h_sent_at: nowIso,
            });
          }
        }

        await base44.asServiceRole.entities.NeighborhoodDeadlineJob.update(job.id, {
          status: 'completed',
          processed_at: nowIso,
          error_message: null,
        });
        processed.push({ jobId: job.id, checkpoint_type: job.checkpoint_type, saleListingId: sale.id, approvedHomes });
        continue;
      }

      if (job.checkpoint_type !== 'charge_24h' && job.checkpoint_type !== 'cancel_24h') {
        continue;
      }

      if (sale.neighborhood_charge_locked_at && sale.payment_intent_status === 'captured') {
        await base44.asServiceRole.entities.NeighborhoodDeadlineJob.update(job.id, {
          status: 'completed',
          processed_at: nowIso,
          error_message: null,
        });
        processed.push({ jobId: job.id, checkpoint_type: job.checkpoint_type, saleListingId: sale.id, approvedHomes, result: 'already_captured' });
        continue;
      }

      if (approvedHomes < NEIGHBORHOOD_MIN_HOMES) {
        let fallbackIntentId = '';
        let fallbackSucceeded = false;

        try {
          const fallbackIntent = sale.is_demo_listing
            ? { id: `demo_fallback_${crypto.randomUUID()}` }
            : await chargeSavedMethod({
                sale,
                amountCents: PREMIUM_FALLBACK_CENTS,
                description: 'Yardit Neighborhood Sale Premium fallback',
                metadata: {
                  purpose: 'fallback_listing',
                  approved_homes: String(approvedHomes),
                },
              });
          fallbackIntentId = fallbackIntent.id;
          fallbackSucceeded = true;
        } catch (error) {
          console.error('Premium fallback charge failed:', error?.message || error);
        }

        await completeFallbackFlow(base44, sale, nowIso, approvedHomes, 'minimum_not_met_24h', fallbackIntentId, fallbackSucceeded);
        await base44.asServiceRole.entities.NeighborhoodDeadlineJob.update(job.id, {
          status: 'completed',
          processed_at: nowIso,
          error_message: fallbackSucceeded ? null : 'Premium fallback charge failed',
        });
        processed.push({ jobId: job.id, checkpoint_type: 'charge_24h', saleListingId: sale.id, approvedHomes, result: fallbackSucceeded ? 'fallback_success' : 'fallback_failed' });
        continue;
      }

      const lockedAmountCents = sale.neighborhood_charge_amount
        ? Math.round(Number(sale.neighborhood_charge_amount) * 100)
        : calculateNeighborhoodChargeCents(approvedHomes);

      await base44.asServiceRole.entities.Listing.update(sale.id, {
        homeCount: approvedHomes,
        neighborhood_charge_amount: centsToAmount(lockedAmountCents),
        neighborhood_charge_locked_at: sale.neighborhood_charge_locked_at || nowIso,
      });

      await upsertPayment(base44, {
        location_id: sale.id,
        related_entity_id: sale.id,
        user_id: sale.ownerUserId,
        amount: centsToAmount(lockedAmountCents),
        type: 'neighborhood_event',
        plan: 'neighborhood_sale_initial',
        duration_days: getDurationDays(sale),
        status: 'pending',
        payment_method: sale.organizer_stripe_payment_method_id || '',
        transaction_id: sale.organizer_setup_intent_id || sale.organizer_setup_session_id || '',
        stripe_payment_intent_id: '',
        stripe_customer_id: sale.organizer_stripe_customer_id || '',
        stripe_payment_method_id: sale.organizer_stripe_payment_method_id || '',
        setup_reference_id: sale.organizer_setup_intent_id || sale.organizer_setup_session_id || '',
      });

      try {
        const paymentIntent = sale.is_demo_listing
          ? { id: `demo_neighborhood_${crypto.randomUUID()}` }
          : await chargeSavedMethod({
              sale,
              amountCents: lockedAmountCents,
              description: 'Yardit Neighborhood Sale organizer charge',
              metadata: {
                purpose: 'neighborhood_event',
                approved_homes: String(approvedHomes),
                locked_amount_cents: String(lockedAmountCents),
              },
            });

        await upsertPayment(base44, {
          location_id: sale.id,
          related_entity_id: sale.id,
          user_id: sale.ownerUserId,
          amount: centsToAmount(lockedAmountCents),
          type: 'neighborhood_event',
          plan: 'neighborhood_sale_initial',
          duration_days: getDurationDays(sale),
          status: 'succeeded',
          payment_method: sale.organizer_stripe_payment_method_id || '',
          transaction_id: paymentIntent.id,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_customer_id: sale.organizer_stripe_customer_id || '',
          stripe_payment_method_id: sale.organizer_stripe_payment_method_id || '',
          setup_reference_id: sale.organizer_setup_intent_id || sale.organizer_setup_session_id || '',
        });

        await base44.asServiceRole.entities.Listing.update(sale.id, {
          status: 'activated_locked',
          activation_status: 'active',
          event_state: 'activated',
          payment_intent_status: 'captured',
          neighborhood_charge_locked_at: sale.neighborhood_charge_locked_at || nowIso,
          neighborhood_charge_amount: centsToAmount(lockedAmountCents),
          neighborhood_payment_retry_count: Number(job.attempt_count || 0),
          participant_lock_at: nowIso,
          pricePaid: centsToAmount(lockedAmountCents),
          statusReason: 'Neighborhood Sale organizer payment completed.',
          homeCount: approvedHomes,
        });

        await createNotification(base44, {
          userId: sale.ownerUserId,
          user_id: sale.ownerUserId,
          title: 'Neighborhood Sale payment succeeded',
          message: `${sale.title || 'Neighborhood Sale'} organizer payment of $${centsToAmount(lockedAmountCents).toFixed(2)} succeeded. The event is now locked and will follow its scheduled visibility timing.`,
          type: 'neighborhood_sale_charge_success',
          related_entity_type: 'listing',
          related_entity_id: sale.id,
          metadata: {
            sale_listing_id: sale.id,
            approved_homes: approvedHomes,
            amount: centsToAmount(lockedAmountCents),
          },
        });

        await base44.asServiceRole.entities.NeighborhoodDeadlineJob.update(job.id, {
          status: 'completed',
          processed_at: nowIso,
          error_message: null,
        });
        processed.push({ jobId: job.id, checkpoint_type: 'charge_24h', saleListingId: sale.id, approvedHomes, result: 'charged', amount: centsToAmount(lockedAmountCents) });
        continue;
      } catch (error) {
        console.error('Neighborhood organizer charge failed:', error?.message || error);
        const attemptCount = Number(job.attempt_count || 0);

        if (attemptCount < 1) {
          const retryAt = new Date(now.getTime() + RETRY_DELAY_MS).toISOString();
          await base44.asServiceRole.entities.Listing.update(sale.id, {
            status: 'payment_pending',
            homeCount: approvedHomes,
            neighborhood_charge_locked_at: sale.neighborhood_charge_locked_at || nowIso,
            neighborhood_charge_amount: centsToAmount(lockedAmountCents),
            neighborhood_payment_retry_count: 1,
            statusReason: 'Organizer payment failed. Retry scheduled in 6 hours.',
          });
          await base44.asServiceRole.entities.NeighborhoodDeadlineJob.update(job.id, {
            status: 'pending',
            run_at: retryAt,
            attempt_count: 1,
            processed_at: null,
            error_message: error?.message || 'Organizer payment failed',
          });
          await createNotification(base44, {
            userId: sale.ownerUserId,
            user_id: sale.ownerUserId,
            title: 'Neighborhood Sale payment retry scheduled',
            message: `${sale.title || 'Neighborhood Sale'} organizer payment failed. Yardit will retry once in 6 hours.`,
            type: 'neighborhood_sale_charge_retry',
            related_entity_type: 'listing',
            related_entity_id: sale.id,
            metadata: {
              sale_listing_id: sale.id,
              approved_homes: approvedHomes,
              retry_at: retryAt,
              amount: centsToAmount(lockedAmountCents),
            },
          });
          processed.push({ jobId: job.id, checkpoint_type: 'charge_24h', saleListingId: sale.id, approvedHomes, result: 'retry_scheduled' });
          continue;
        }

        let fallbackIntentId = '';
        let fallbackSucceeded = false;
        try {
          const fallbackIntent = sale.is_demo_listing
            ? { id: `demo_fallback_${crypto.randomUUID()}` }
            : await chargeSavedMethod({
                sale,
                amountCents: PREMIUM_FALLBACK_CENTS,
                description: 'Yardit Neighborhood Sale Premium fallback after failed retry',
                metadata: {
                  purpose: 'fallback_listing_after_failed_retry',
                  approved_homes: String(approvedHomes),
                },
              });
          fallbackIntentId = fallbackIntent.id;
          fallbackSucceeded = true;
        } catch (fallbackError) {
          console.error('Premium fallback charge after retry failed:', fallbackError?.message || fallbackError);
        }

        await completeFallbackFlow(base44, sale, nowIso, approvedHomes, 'payment_failed_after_retry', fallbackIntentId, fallbackSucceeded);
        await base44.asServiceRole.entities.NeighborhoodDeadlineJob.update(job.id, {
          status: 'completed',
          processed_at: nowIso,
          error_message: fallbackSucceeded ? (error?.message || 'Organizer payment failed before fallback') : 'Fallback charge failed after payment retry',
        });
        processed.push({ jobId: job.id, checkpoint_type: 'charge_24h', saleListingId: sale.id, approvedHomes, result: fallbackSucceeded ? 'fallback_after_retry_success' : 'fallback_after_retry_failed' });
      }
    }

    return Response.json({ success: true, processed_count: processed.length, processed });
  } catch (error) {
    console.error('Activation deadline error:', error?.message || error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});