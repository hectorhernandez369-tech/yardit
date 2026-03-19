import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const NEIGHBORHOOD_MIN_HOMES = 5;

function normalizeNeighborhoodJoinStatus(status) {
  if (status === 'requested') return 'pending';
  if (status === 'approved_pending_payment') return 'approved';
  return status;
}

function getApprovedHomesCount(requests = []) {
  return (requests || []).filter((request) => request?.removed_by_eo !== true && normalizeNeighborhoodJoinStatus(request.status) === 'approved').length + 1;
}

function isTerminalSale(listing) {
  return listing?.event_state === 'downgraded' || listing?.event_state === 'canceled' || listing?.status === 'closed';
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
      const approvedHomes = getApprovedHomesCount(requests);
      await base44.asServiceRole.entities.Listing.update(sale.id, { homeCount: approvedHomes });

      if (job.checkpoint_type === 'warning_48h') {
        if (approvedHomes < NEIGHBORHOOD_MIN_HOMES) {
          if (!sale.host_warning_48h_sent_at && sale.ownerUserId) {
            await base44.asServiceRole.entities.Notification.create({
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
              read: false,
              is_read: false,
            });
            await base44.asServiceRole.entities.Listing.update(sale.id, {
              host_warning_48h_sent_at: now.toISOString(),
              homeCount: approvedHomes,
            });
          }

          for (const request of requests) {
            if (request.removed_by_eo === true || normalizeNeighborhoodJoinStatus(request.status) !== 'approved' || request.warning_48h_sent_at) continue;
            if (!request.requesterUserId) continue;
            await base44.asServiceRole.entities.Notification.create({
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
              read: false,
              is_read: false,
            });
            await base44.asServiceRole.entities.JoinRequest.update(request.id, {
              warning_48h_sent_at: now.toISOString(),
            });
          }
        }
      }

      if (job.checkpoint_type === 'cancel_24h' && approvedHomes < NEIGHBORHOOD_MIN_HOMES) {
        await base44.asServiceRole.functions.invoke('cancelNeighborhoodSale', {
          saleListingId: sale.id,
          internal: true,
          reason: 'minimum_not_met_24h',
          finalState: 'downgraded',
          deleteSale: false,
        });
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});