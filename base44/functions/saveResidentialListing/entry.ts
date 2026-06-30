import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DESCRIPTION_LIMITS = {
  yard_sale: 500,
  neighborhood_sale: 1000,
  event: 1000,
};

const CONFLICT_MESSAGE = 'There’s already a yard sale planned at this address for those dates.';
const RESERVED_STATUSES = new Set(['active', 'under_review', 'pending_payment', 'scheduled', 'activated_locked', 'coming_soon', 'payment_pending', 'payment_pending_adjustment']);
const EXCLUDED_STATUSES = new Set(['expired', 'completed', 'closed', 'cancelled', 'canceled', 'hidden', 'suspended', 'deleted', 'removed']);

function getDescriptionLimit(listingType) {
  return DESCRIPTION_LIMITS[listingType] || null;
}

function getDescriptionValue(data = {}) {
  if (data.listingType === 'event') return data.event_description || data.description || '';
  return data.description || '';
}

function validateDescription(data = {}) {
  const limit = getDescriptionLimit(data.listingType);
  if (!limit) return { ok: true };
  const length = String(getDescriptionValue(data)).length;
  if (length > limit) {
    return { ok: false, error: `Description must be ${limit} characters or fewer.` };
  }
  return { ok: true };
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
  const lat = Number(ref.lat);
  const lng = Number(ref.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && typeof listing.lat === 'number' && typeof listing.lng === 'number') {
    if (Math.abs(listing.lat - lat) < 0.0003 && Math.abs(listing.lng - lng) < 0.0003) return true;
  }
  return normalizeAddressPart(listing.addressText) === normalizeAddressPart(ref.addressText) && normalizeAddressPart(listing.zip) === normalizeAddressPart(ref.zip);
}

function compact(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== ''));
}

async function getCreatorName(base44, ownerUserId) {
  if (!ownerUserId) return '';
  const users = await base44.asServiceRole.entities.User.filter({ id: ownerUserId }).catch(() => []);
  const owner = users?.[0];
  return [owner?.first_name, owner?.last_name].filter(Boolean).join(' ').trim() || owner?.full_name || '';
}

async function findResidentialConflict(base44, data, user, excludeListingId = '') {
  if (data.listingType !== 'yard_sale') return null;
  const startDate = data.selectedRangeStartDate || data.startDateTime?.slice?.(0, 10);
  const endDate = data.selectedRangeEndDate || data.endDateTime?.slice?.(0, 10);
  if (!startDate || !endDate) return null;

  const today = new Date().toISOString().slice(0, 10);
  if (endDate < today) return null;

  const ref = {
    addressText: data.addressText || data.address_text || user?.primary_address || user?.street_address || '',
    zip: data.zip || user?.zip_code || '',
    lat: data.lat ?? user?.primary_latitude ?? user?.address_lat,
    lng: data.lng ?? user?.primary_longitude ?? user?.address_lng,
  };
  if (!ref.zip || (!Number.isFinite(Number(ref.lat)) && !ref.addressText)) return null;

  const proposed = new Set(expandDateRange(startDate, endDate));
  const listings = await base44.asServiceRole.entities.Listing.filter({ zip: ref.zip });
  const now = new Date();
  for (const listing of listings || []) {
    if (!listing?.id || listing.id === excludeListingId) continue;
    if (listing.listingType !== 'yard_sale' || listing.is_demo_listing) continue;
    if (EXCLUDED_STATUSES.has(listing.status) || !RESERVED_STATUSES.has(listing.status)) continue;
    if (listing.endDateTime && new Date(listing.endDateTime) < now) continue;
    if (!sameResidentialAddress(listing, ref)) continue;
    const reserved = [...expandDateRange(listing.selectedRangeStartDate, listing.selectedRangeEndDate), ...(listing.earlyVisibilityDates || [])];
    if (!reserved.some((date) => proposed.has(date))) continue;
    const existingRequests = user?.id ? await base44.asServiceRole.entities.ResidentialListingAccessRequest.filter({ existing_listing_id: listing.id, requester_user_id: user.id }).catch(() => []) : [];
    const relevantRequest = (existingRequests || []).find((request) => ['pending', 'approved'].includes(request.status));
    return {
      listing: compact({
        id: listing.id,
        title: listing.title || 'Yard Sale',
        selectedRangeStartDate: listing.selectedRangeStartDate || listing.startDateTime?.slice(0, 10) || '',
        selectedRangeEndDate: listing.selectedRangeEndDate || listing.endDateTime?.slice(0, 10) || '',
        openTime: listing.openTime || '',
        closeTime: listing.closeTime || '',
        status: listing.status || '',
        creator_name: await getCreatorName(base44, listing.ownerUserId),
        ownerUserId: listing.ownerUserId || '',
      }),
      is_owner: listing.ownerUserId === user?.id,
      existing_request: relevantRequest ? { id: relevantRequest.id, status: relevantRequest.status } : null,
    };
  }
  return null;
}

async function canManageListing(base44, user, listing) {
  if (listing.ownerUserId === user.id || ['admin', 'master', 'supervisor', 'super_master'].includes(user.role)) return true;
  if (listing.listingType !== 'yard_sale') return false;
  const requests = await base44.asServiceRole.entities.ResidentialListingAccessRequest.filter({ existing_listing_id: listing.id, requester_user_id: user.id, status: 'approved' }).catch(() => []);
  return requests.length > 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const action = payload.action || 'create';
    const data = payload.data || {};

    if (action === 'create') {
      const validation = validateDescription(data);
      if (!validation.ok) return Response.json({ error: validation.error }, { status: 400 });

      const ownerUserId = data.ownerUserId || user.id;
      if (ownerUserId !== user.id && !['admin', 'master', 'supervisor', 'super_master'].includes(user.role)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const conflict = await findResidentialConflict(base44, data, user);
      if (conflict) return Response.json({ error: CONFLICT_MESSAGE, conflict }, { status: 409 });

      const created = await base44.asServiceRole.entities.Listing.create({ ...data, ownerUserId });
      return Response.json({ ok: true, listing: created });
    }

    if (action === 'update') {
      const listingId = payload.listing_id || payload.listingId;
      if (!listingId) return Response.json({ error: 'Missing listing_id' }, { status: 400 });

      const listings = await base44.asServiceRole.entities.Listing.filter({ id: listingId });
      const existing = listings?.[0];
      if (!existing) return Response.json({ error: 'Listing not found' }, { status: 404 });
      if (!(await canManageListing(base44, user, existing))) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const nextData = { ...existing, ...data, listingType: data.listingType || existing.listingType };
      const validation = validateDescription(nextData);
      if (!validation.ok) return Response.json({ error: validation.error }, { status: 400 });

      const dateOrAddressChanged = ['selectedRangeStartDate', 'selectedRangeEndDate', 'startDateTime', 'endDateTime', 'addressText', 'zip', 'lat', 'lng'].some((key) => Object.prototype.hasOwnProperty.call(data, key));
      if (dateOrAddressChanged) {
        const conflict = await findResidentialConflict(base44, nextData, user, listingId);
        if (conflict) return Response.json({ error: CONFLICT_MESSAGE, conflict }, { status: 409 });
      }

      const updated = await base44.asServiceRole.entities.Listing.update(listingId, data);
      return Response.json({ ok: true, listing: updated });
    }

    return Response.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('saveResidentialListing error:', error?.message || error);
    return Response.json({ error: error?.message || 'Could not save listing' }, { status: 500 });
  }
});