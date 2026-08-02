import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isNeighborhoodOpenToParticipants, deriveNeighborhoodEventState } from '../../shared/neighborhoodParticipation.ts';

const NEIGHBORHOOD_MAX_HOMES = 25;

function getDistanceFeet(lat1, lon1, lat2, lon2) {
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') return Infinity;
  const radiusFeet = 20902231;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radiusFeet * c;
}

function getHomeCount(sale) {
  const count = Number(sale?.homeCount ?? 0);
  return Number.isFinite(count) ? count : 0;
}

function getStartDate(sale) {
  return sale?.selectedRangeStartDate || sale?.startDateTime?.slice(0, 10) || '9999-12-31';
}

function getDiscoveryState(sale) {
  return deriveNeighborhoodEventState(sale, new Date()) || sale?.event_state || sale?.status || 'upcoming';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const lat = Number(payload?.lat);
    const lng = Number(payload?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return Response.json({ sales: [] });
    }

    const sales = await base44.asServiceRole.entities.Listing.filter({ listingType: 'neighborhood_sale' }, 'startDateTime', 250);
    const nearby = (sales || [])
      .map((sale) => {
        const centerLat = typeof sale.event_center_lat === 'number' ? sale.event_center_lat : sale.lat;
        const centerLng = typeof sale.event_center_lng === 'number' ? sale.event_center_lng : sale.lng;
        const discoveryState = getDiscoveryState(sale);
        const distanceFeet = getDistanceFeet(lat, lng, centerLat, centerLng);

        return {
          id: sale.id,
          listingType: sale.listingType,
          title: sale.title,
          status: sale.status,
          event_state: sale.event_state,
          discoveryState,
          selectedRangeStartDate: sale.selectedRangeStartDate,
          selectedRangeEndDate: sale.selectedRangeEndDate,
          startDateTime: sale.startDateTime,
          endDateTime: sale.endDateTime,
          homeCount: getHomeCount(sale),
          invite_code: sale.invite_code,
          distanceFeet
        };
      })
      .filter((sale) => isNeighborhoodOpenToParticipants(sale, new Date(), sale.homeCount))
      .filter((sale) => sale.homeCount < NEIGHBORHOOD_MAX_HOMES)
      .filter((sale) => sale.distanceFeet <= 500)
      .sort((a, b) => getStartDate(a).localeCompare(getStartDate(b)));

    return Response.json({ sales: nearby });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});