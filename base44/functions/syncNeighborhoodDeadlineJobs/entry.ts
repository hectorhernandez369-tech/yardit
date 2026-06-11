import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function isNeighborhoodSale(listing) {
  return listing?.listingType === 'neighborhood_sale';
}

function isTerminalState(listing) {
  return listing?.event_state === 'downgraded' || listing?.event_state === 'canceled' || listing?.status === 'closed';
}

function buildJobs(startDateTime, saleListingId) {
  const start = new Date(startDateTime);
  return [
    {
      checkpoint_type: 'warning_48h',
      run_at: new Date(start.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      sale_listing_id: saleListingId,
      status: 'pending',
      attempt_count: 0,
    },
    {
      checkpoint_type: 'charge_24h',
      run_at: new Date(start.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      sale_listing_id: saleListingId,
      status: 'pending',
      attempt_count: 0,
    },
  ];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const event = payload?.event;
    const data = payload?.data;
    const oldData = payload?.old_data;

    const listing = data || oldData;
    if (!isNeighborhoodSale(listing)) {
      return Response.json({ success: true, skipped: 'not_neighborhood_sale' });
    }

    const saleListingId = event?.entity_id || listing?.id;
    if (!saleListingId) {
      return Response.json({ success: true, skipped: 'missing_listing_id' });
    }

    if (listing?.status === 'draft') {
      return Response.json({ success: true, skipped: 'draft_listing' });
    }

    const existingJobs = await base44.asServiceRole.entities.NeighborhoodDeadlineJob.filter({ sale_listing_id: saleListingId });

    if (event?.type === 'delete' || isTerminalState(data || oldData) || !listing?.startDateTime) {
      for (const job of existingJobs) {
        if (job.status === 'pending') {
          await base44.asServiceRole.entities.NeighborhoodDeadlineJob.update(job.id, {
            status: 'cancelled',
            processed_at: new Date().toISOString(),
          });
        }
      }
      return Response.json({ success: true, action: 'cancelled_jobs', count: existingJobs.length });
    }

    const desiredJobs = buildJobs(listing.startDateTime, saleListingId);
    const byType = new Map(existingJobs.map((job) => [job.checkpoint_type, job]));

    for (const desired of desiredJobs) {
      const current = byType.get(desired.checkpoint_type);
      if (!current) {
        await base44.asServiceRole.entities.NeighborhoodDeadlineJob.create(desired);
        continue;
      }

      if (current.status === 'completed') continue;
      const preserveRetryWindow = current.checkpoint_type === 'charge_24h' && current.status === 'pending' && Number(current.attempt_count || 0) > 0;
      if (!preserveRetryWindow && (current.run_at !== desired.run_at || current.status !== 'pending')) {
        await base44.asServiceRole.entities.NeighborhoodDeadlineJob.update(current.id, {
          run_at: desired.run_at,
          status: 'pending',
          attempt_count: 0,
          processed_at: null,
          error_message: null,
        });
      }
    }

    for (const job of existingJobs) {
      if (!desiredJobs.some((desired) => desired.checkpoint_type === job.checkpoint_type) && job.status === 'pending') {
        await base44.asServiceRole.entities.NeighborhoodDeadlineJob.update(job.id, {
          status: 'cancelled',
          processed_at: new Date().toISOString(),
        });
      }
    }

    return Response.json({ success: true, action: 'synced_jobs' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});