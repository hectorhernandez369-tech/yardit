import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isNeighborhoodOpenToParticipants } from '../../shared/neighborhoodParticipation.ts';

const NEIGHBORHOOD_MAX_HOMES = 25;

function normalizeNeighborhoodJoinStatus(status) {
  if (status === 'requested') return 'pending';
  if (status === 'approved_pending_payment') return 'approved';
  return status;
}

function getApprovedHomesCount(requests = [], sale = null) {
  const organizerCount = sale?.organizer_participation === 'organizing_only' ? 0 : 1;
  const approved = (requests || []).filter((request) => request?.removed_by_eo !== true && request?.removed_by_listing_owner !== true && normalizeNeighborhoodJoinStatus(request.status) === 'approved').length + organizerCount;
  return Math.min(NEIGHBORHOOD_MAX_HOMES, approved);
}

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

    const requests = await base44.asServiceRole.entities.JoinRequest.filter({ saleListingId: sale.id });
    const approvedHomesCount = getApprovedHomesCount(requests, sale);
    if (!isNeighborhoodOpenToParticipants(sale, new Date(), approvedHomesCount)) {
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
        lng: sale.lng,
        approvedHomesCount,
        isOpenToParticipants: true
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});