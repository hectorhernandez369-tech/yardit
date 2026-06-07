import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SAFE_STATUSES = new Set([
  'active',
  'scheduled',
  'activated',
  'activated_locked',
  'coming_soon',
  'collecting_participants',
  'ready_for_payment'
]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const code = String(payload?.code || '').trim();

    if (!code) {
      return Response.json({ sale: null });
    }

    const sales = await base44.asServiceRole.entities.Listing.filter({
      invite_code: code,
      listingType: 'neighborhood_sale'
    }, '-created_date', 1);

    const sale = sales?.[0] || null;
    if (!sale) {
      return Response.json({ sale: null });
    }

    const state = sale.event_state || sale.status;
    if (!SAFE_STATUSES.has(state) && !SAFE_STATUSES.has(sale.status)) {
      return Response.json({ sale: null });
    }

    return Response.json({
      sale: {
        id: sale.id,
        ownerUserId: sale.ownerUserId,
        title: sale.title,
        status: sale.status,
        event_state: sale.event_state,
        selectedRangeStartDate: sale.selectedRangeStartDate,
        selectedRangeEndDate: sale.selectedRangeEndDate,
        startDateTime: sale.startDateTime,
        endDateTime: sale.endDateTime,
        timeZoneId: sale.timeZoneId,
        organizer_participation: sale.organizer_participation,
        event_center_lat: sale.event_center_lat,
        event_center_lng: sale.event_center_lng,
        lat: sale.lat,
        lng: sale.lng
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});