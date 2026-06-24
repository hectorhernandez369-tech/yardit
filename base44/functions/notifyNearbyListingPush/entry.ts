import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    createClientFromRequest(req);
    console.log('nearby_listing per-listing push is deprecated. Daily summaries are sent by sendDailyNearbyListingSummary.');
    return Response.json({ skipped: true, deprecated: true, replacement: 'sendDailyNearbyListingSummary' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});