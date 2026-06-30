import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONFLICT_MESSAGE = 'There’s already a yard sale planned at this address for those dates.';
const RESERVED_STATUSES = new Set(['active', 'under_review', 'pending_payment', 'scheduled', 'activated_locked', 'coming_soon', 'payment_pending', 'payment_pending_adjustment']);
const EXCLUDED_STATUSES = new Set(['expired', 'completed', 'closed', 'cancelled', 'canceled', 'hidden', 'suspended', 'deleted', 'removed']);

function getDisplayName(user) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || user?.full_name || user?.email || '';
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

function listingSummary(listing, creatorName = '') {
  return {
    id: listing.id,
    title: listing.title || 'Yard Sale',
    selectedRangeStartDate: listing.selectedRangeStartDate || listing.startDateTime?.slice(0, 10) || '',
    selectedRangeEndDate: listing.selectedRangeEndDate || listing.endDateTime?.slice(0, 10) || '',
    openTime: listing.openTime || '',
    closeTime: listing.closeTime || '',
    status: listing.status || '',
    creator_name: creatorName || '',
    ownerUserId: listing.ownerUserId || '',
  };
}

async function findConflict(base44, payload, user, excludeListingId = '') {
  const startDate = payload.selectedRangeStartDate || payload.selected_range_start_date || payload.startDateTime?.slice?.(0, 10);
  const endDate = payload.selectedRangeEndDate || payload.selected_range_end_date || payload.endDateTime?.slice?.(0, 10);
  if (!startDate || !endDate || (payload.listingType && payload.listingType !== 'yard_sale')) return { has_conflict: false };

  const today = new Date().toISOString().slice(0, 10);
  if (endDate < today) return { has_conflict: false };

  const ref = {
    addressText: payload.addressText || payload.address_text || user?.primary_address || user?.street_address || '',
    zip: payload.zip || user?.zip_code || '',
    lat: payload.lat ?? user?.primary_latitude ?? user?.address_lat,
    lng: payload.lng ?? user?.primary_longitude ?? user?.address_lng,
  };
  if (!ref.zip || (!Number.isFinite(Number(ref.lat)) && !ref.addressText)) return { has_conflict: false };

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

    const ownerUsers = listing.ownerUserId ? await base44.asServiceRole.entities.User.filter({ id: listing.ownerUserId }).catch(() => []) : [];
    const creatorName = getDisplayName(ownerUsers?.[0]);
    const existingRequests = user?.id ? await base44.asServiceRole.entities.ResidentialListingAccessRequest.filter({ existing_listing_id: listing.id, requester_user_id: user.id }).catch(() => []) : [];
    const relevantRequest = (existingRequests || []).find((request) => ['pending', 'approved'].includes(request.status));

    return {
      has_conflict: true,
      message: CONFLICT_MESSAGE,
      listing: listingSummary(listing, creatorName),
      is_owner: listing.ownerUserId === user?.id,
      existing_request: relevantRequest ? { id: relevantRequest.id, status: relevantRequest.status } : null,
    };
  }

  return { has_conflict: false };
}

async function notifyUser(base44, notification) {
  try {
    await base44.functions.invoke('deliverNotificationPush', { data: notification });
  } catch {
    await base44.asServiceRole.entities.Notification.create(notification).catch(() => {});
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'check_conflict';

    if (action === 'check_conflict') {
      const result = await findConflict(base44, body.data || body, user, body.exclude_listing_id || body.listing_id || '');
      return Response.json(result);
    }

    if (action === 'request') {
      const listingId = body.listing_id;
      if (!listingId) return Response.json({ error: 'Missing listing_id' }, { status: 400 });
      const listings = await base44.asServiceRole.entities.Listing.filter({ id: listingId });
      const listing = listings?.[0];
      if (!listing || listing.listingType !== 'yard_sale') return Response.json({ error: 'Yard sale not found' }, { status: 404 });
      if (listing.ownerUserId === user.id) return Response.json({ error: 'This is already your listing.' }, { status: 400 });

      const existing = await base44.asServiceRole.entities.ResidentialListingAccessRequest.filter({ existing_listing_id: listing.id, requester_user_id: user.id });
      const pendingOrApproved = (existing || []).find((request) => ['pending', 'approved'].includes(request.status));
      if (pendingOrApproved?.status === 'pending') return Response.json({ success: true, already_pending: true, request: pendingOrApproved });
      if (pendingOrApproved?.status === 'approved') return Response.json({ success: true, already_approved: true, request: pendingOrApproved });

      const ownerUsers = listing.ownerUserId ? await base44.asServiceRole.entities.User.filter({ id: listing.ownerUserId }).catch(() => []) : [];
      const owner = ownerUsers?.[0];
      const requestRecord = await base44.asServiceRole.entities.ResidentialListingAccessRequest.create({
        existing_listing_id: listing.id,
        listing_owner_user_id: listing.ownerUserId,
        listing_owner_name: getDisplayName(owner),
        requester_user_id: user.id,
        requester_email: user.email || '',
        requester_name: getDisplayName(user),
        status: 'pending',
        request_reason: body.reason || 'This is my household’s sale',
        listing_title: listing.title || 'Yard Sale',
        listing_dates: `${listing.selectedRangeStartDate || ''} – ${listing.selectedRangeEndDate || ''}`,
        listing_open_time: listing.openTime || '',
        listing_close_time: listing.closeTime || '',
        listing_status: listing.status || '',
      });

      await notifyUser(base44, compact({
        userId: listing.ownerUserId,
        user_id: listing.ownerUserId,
        user_email: owner?.email || '',
        title: 'Household access request',
        message: `${getDisplayName(user) || 'Someone'} says this is their household’s yard sale and requested access to help manage it.`,
        type: 'residential_access_request',
        related_entity_type: 'ResidentialListingAccessRequest',
        related_entity_id: requestRecord.id,
        read: false,
        is_read: false,
        delivery_methods: ['push', 'bell'],
        deep_link: '/Notifications',
        dedupe_key: `residential_access_request_${requestRecord.id}`,
        metadata: { request_id: requestRecord.id, listing_id: listing.id, requester_user_id: user.id, requester_name: getDisplayName(user) },
      }));

      return Response.json({ success: true, request: requestRecord });
    }

    if (action === 'respond') {
      const requestId = body.request_id;
      const response = body.response === 'approved' ? 'approved' : 'denied';
      if (!requestId) return Response.json({ error: 'Missing request_id' }, { status: 400 });

      const requests = await base44.asServiceRole.entities.ResidentialListingAccessRequest.filter({ id: requestId });
      const requestRecord = requests?.[0];
      if (!requestRecord) return Response.json({ error: 'Request not found' }, { status: 404 });
      if (requestRecord.listing_owner_user_id !== user.id && !['admin', 'master', 'supervisor', 'super_master'].includes(user.role)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (requestRecord.status !== 'pending') return Response.json({ success: true, already_resolved: true, request: requestRecord });

      const updatedRequest = await base44.asServiceRole.entities.ResidentialListingAccessRequest.update(requestRecord.id, {
        status: response,
        responded_at: new Date().toISOString(),
        responded_by_user_id: user.id,
      });

      const listings = await base44.asServiceRole.entities.Listing.filter({ id: requestRecord.existing_listing_id });
      const listing = listings?.[0];
      if (response === 'approved' && listing) {
        const current = Array.isArray(listing.residential_cohost_user_ids) ? listing.residential_cohost_user_ids : [];
        await base44.asServiceRole.entities.Listing.update(listing.id, {
          residential_cohost_user_ids: [...new Set([...current, requestRecord.requester_user_id])],
        });
      }

      await notifyUser(base44, compact({
        userId: requestRecord.requester_user_id,
        user_id: requestRecord.requester_user_id,
        user_email: requestRecord.requester_email || '',
        title: response === 'approved' ? 'Household access approved' : 'Household access denied',
        message: response === 'approved'
          ? `You can now help manage "${requestRecord.listing_title || 'this yard sale'}" from My Listings.`
          : `Your household access request for "${requestRecord.listing_title || 'this yard sale'}" was denied.`,
        type: response === 'approved' ? 'residential_access_approved' : 'residential_access_denied',
        related_entity_type: 'Listing',
        related_entity_id: requestRecord.existing_listing_id,
        read: false,
        is_read: false,
        delivery_methods: ['push', 'bell'],
        deep_link: '/MyListings',
        dedupe_key: `residential_access_${response}_${requestRecord.id}`,
        metadata: { request_id: requestRecord.id, listing_id: requestRecord.existing_listing_id },
      }));

      return Response.json({ success: true, request: updatedRequest });
    }

    return Response.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'Residential access request failed' }, { status: 500 });
  }
});