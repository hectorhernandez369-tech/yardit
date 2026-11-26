import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getDemoAuthorization, hasDemoBypassRequest, sanitizeDemoFields } from '../../shared/demoMode.ts';
import { hasResidentialVip, eligibleFounderListing, founderWaiver } from '../../shared/founderVip.ts';
import { createDeveloperListing } from '../../shared/developerListings.ts';
import tzLookup from 'npm:tz-lookup@6.1.25';
import { preparePreSpreeListing, getPreSpreeSchedule } from '../../shared/preSpree.ts';
import { isPreSpreeListing, hasPreSpreeDates } from '../../shared/preSpreeRules.ts';

const DESCRIPTION_LIMITS = {
  yard_sale: 500,
  neighborhood_sale: 1000,
  event: 1000,
};

const CONFLICT_MESSAGE = 'There’s already a yard sale planned at this address for those dates.';
const SEASONAL_CARE_CATEGORIES = new Set(['Toy Donation Drop-Off', 'Free Community Meals', 'Warming Center']);
const CARE_ICON = {
  'Toy Donation Drop-Off': 'gift',
  'Free Community Meals': 'food',
  'Warming Center': 'heart',
};
function validateSeasonalCare(data, user) {
  if (data.listingType !== 'event' || !SEASONAL_CARE_CATEGORIES.has(data.event_category)) {
    return 'Only the three Community Care categories qualify for free publishing.';
  }
  if (data.ownerUserId && data.ownerUserId !== user.id) return 'Only your own free Community Care listings can be published.';
  if (data.location_source !== 'pin' || typeof data.lat !== 'number' || typeof data.lng !== 'number' ||
      !Number.isFinite(data.lat) || !Number.isFinite(data.lng) || Math.abs(data.lat) > 90 || Math.abs(data.lng) > 180) {
    return 'Confirm a location by tapping the map before publishing.';
  }
  if (!String(data.event_name || data.title || '').trim()) return 'Add a listing name.';
  const ymd = String(data.event_start_date || '').trim();
  const start = String(data.event_start_time || '').trim();
  const end = String(data.event_end_time || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || start >= end) {
    return 'Select one service day with valid start and end hours.';
  }
  const date = new Date(ymd + 'T12:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== ymd) return 'Choose a valid service date.';
  if (ymd < new Date().toISOString().slice(0,10)) return 'The service date cannot be in the past.';
  if (data.event_add_ons && Object.values(data.event_add_ons).some(Boolean)) return 'Community Care listings cannot include paid add-ons.';
  return null;
}

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

function getDatePart(value) {
  return String(value || '').slice(0, 10);
}

function getTimePart(...values) {
  for (const value of values) {
    const text = String(value || '');
    if (/^\d{2}:\d{2}/.test(text)) return text.slice(0, 5);
    const timeIndex = text.indexOf('T');
    if (timeIndex >= 0 && text.length >= timeIndex + 6) return text.slice(timeIndex + 1, timeIndex + 6);
  }
  return '';
}

function normalizeResidentialEventSingleDay(data = {}) {
  if (data.listingType !== 'event') return data;
  const eventStartDate = data.event_start_date || getDatePart(data.start_datetime) || getDatePart(data.startDateTime);
  const eventStartTime = getTimePart(data.event_start_time, data.start_datetime, data.startDateTime);
  const eventEndTime = getTimePart(data.event_end_time, data.end_datetime, data.endDateTime);
  const startLocal = eventStartDate && eventStartTime ? `${eventStartDate}T${eventStartTime}` : '';
  const endLocal = eventStartDate && eventEndTime ? `${eventStartDate}T${eventEndTime}` : '';
  return {
    ...data,
    event_start_date: eventStartDate,
    event_end_date: eventStartDate,
    event_start_time: eventStartTime,
    event_end_time: eventEndTime,
    start_datetime: startLocal || data.start_datetime || '',
    end_datetime: endLocal || data.end_datetime || '',
    startDateTime: startLocal || data.startDateTime || '',
    endDateTime: endLocal || data.endDateTime || '',
  };
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

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error) => error.status === 401 ? null : Promise.reject(error));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const action = payload.action || 'create';
    if (action === 'developer_create') {
      return await createDeveloperListing(base44, user, payload.data || {}, payload.validate_only === true);
    }
    let data = normalizeResidentialEventSingleDay(payload.data || {});
    const demoAuthorization = await getDemoAuthorization(base44, user);
    const demoBypassRequested = hasDemoBypassRequest(payload) || hasDemoBypassRequest(data);
    if (demoBypassRequested && !demoAuthorization.canUseDemoMode) {
      data = sanitizeDemoFields(data);
      return Response.json({ error: 'Demo payment skipping is only available to authorized admins while Demo Mode is enabled.' }, { status: 403 });
    }
    if (!demoAuthorization.canUseDemoMode) data = sanitizeDemoFields(data);

    // Free Community Care is a server-validated, category-specific publishing path.
    // Ordinary Event checkouts are never granted this entitlement.
    if (action === 'seasonal_care_create') {
      const error = validateSeasonalCare(data, user);
      if (error) return Response.json({ error }, { status: 400 });
      const clean = {
        ownerUserId: user.id,
        listingType: 'event',
        tier: 'event',
        event_tier: 'event',
        category: data.event_category,
        event_category: data.event_category,
        event_name: String(data.event_name || data.title).trim().slice(0,120),
        title: String(data.event_name || data.title).trim().slice(0,120),
        event_description: String(data.event_description || data.description || '').slice(0,1000),
        description: String(data.event_description || data.description || '').slice(0,1000),
        event_icon: CARE_ICON[data.event_category],
        lat: data.lat, lng: data.lng,
        location_source: 'pin',
        addressText: String(data.addressText || data.address_text || '').slice(0,250),
        address_text: String(data.addressText || data.address_text || '').slice(0,250),
        display_address: String(data.display_address || data.addressText || '').slice(0,250),
        city: String(data.city || '').slice(0,100),
        state: String(data.state || '').slice(0,50),
        zip: String(data.zip || '').slice(0,12),
        timeZoneId: String(data.timeZoneId || tzLookup(data.lat, data.lng)),
        event_start_date: data.event_start_date,
        event_end_date: data.event_start_date,
        event_start_time: data.event_start_time,
        event_end_time: data.event_end_time,
        start_datetime: data.start_datetime,
        end_datetime: data.end_datetime,
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        selectedRangeStartDate: data.event_start_date,
        selectedRangeEndDate: data.event_start_date,
        event_add_ons: {},
        pricePaid: 0,
        payment_status: 'free',
        payment_intent_status: 'none',
        status: 'active',
      };
      const listing = await base44.asServiceRole.entities.Listing.create(clean);
      return Response.json({ ok: true, listing });
    }

    // Campaign entitlement is assigned only by the validated server action.
    delete data.pre_spree_campaign;
    delete data.pre_spree_published_at;
    if (action === 'pre_spree_create') {
      const lat = user.primary_latitude ?? user.address_lat;
      const lng = user.primary_longitude ?? user.address_lng;
      if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) {
        return Response.json({ error: 'Please confirm your home address before publishing.' }, { status: 400 });
      }
      const prepared = preparePreSpreeListing(data, user, tzLookup(lat, lng));
      if (prepared.error) return Response.json({ error: prepared.error }, { status: 400 });
      data = prepared.data;
    }

    if (action === 'create' || action === 'founder_create' || action === 'pre_spree_create') {
      const founderVip = await hasResidentialVip(base44, user.id);
      if (action === 'founder_create' && (!founderVip || !eligibleFounderListing(data) || data.is_demo_listing || (data.ownerUserId && data.ownerUserId !== user.id))) {
        return Response.json({ error: 'Founder VIP is required for this complimentary listing.' }, { status: 403 });
      }
      const validation = validateDescription(data);
      if (!validation.ok) return Response.json({ error: validation.error }, { status: 400 });

      const ownerUserId = data.ownerUserId || user.id;
      if (ownerUserId !== user.id && !['admin', 'master', 'supervisor', 'super_master'].includes(user.role)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (data.pending_checkout_session_id) {
        const [pendingMatches, paidMatches] = await Promise.all([
          base44.asServiceRole.entities.Listing.filter({ pending_checkout_session_id: data.pending_checkout_session_id }),
          base44.asServiceRole.entities.Listing.filter({ stripe_checkout_session_id: data.pending_checkout_session_id }),
        ]);
        const existing = [...(pendingMatches || []), ...(paidMatches || [])].find((listing) => listing.ownerUserId === ownerUserId);
        if (existing) return Response.json({ ok: true, listing: existing, reused: true });
      }

      const conflict = await findResidentialConflict(base44, data, user);
      if (conflict) return Response.json({ error: CONFLICT_MESSAGE, conflict }, { status: 409 });

      if (action !== 'pre_spree_create' && ownerUserId === user.id && eligibleFounderListing(data) && !data.is_demo_listing && founderVip) {
        data = { ...data, ...founderWaiver };
        if (['payment_pending', 'pending_payment'].includes(data.status)) data.status = 'active';
      }
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

      const nextData = normalizeResidentialEventSingleDay({ ...existing, ...data, listingType: data.listingType || existing.listingType });
      if (isPreSpreeListing(existing) && (nextData.tier !== 'featured' || nextData.listingType !== 'yard_sale' || !hasPreSpreeDates(nextData) || nextData.selectedRangeStartDate !== existing.selectedRangeStartDate || nextData.selectedRangeEndDate !== existing.selectedRangeEndDate)) {
        return Response.json({ error: 'Pre-Spree dates are locked. Create a separate listing for other dates or tiers.' }, { status: 400 });
      }
      if (isPreSpreeListing(existing)) {
        const schedule = getPreSpreeSchedule(nextData);
        if (schedule.error) return Response.json({ error: schedule.error }, { status: 400 });
        data = { ...data, ...schedule };
      }
      const validation = validateDescription(nextData);
      if (!validation.ok) return Response.json({ error: validation.error }, { status: 400 });

      const dateOrAddressChanged = ['selectedRangeStartDate', 'selectedRangeEndDate', 'startDateTime', 'endDateTime', 'addressText', 'zip', 'lat', 'lng'].some((key) => Object.prototype.hasOwnProperty.call(data, key));
      if (dateOrAddressChanged) {
        const conflict = await findResidentialConflict(base44, nextData, user, listingId);
        if (conflict) return Response.json({ error: CONFLICT_MESSAGE, conflict }, { status: 409 });
      }

      const updated = await base44.asServiceRole.entities.Listing.update(listingId, normalizeResidentialEventSingleDay(data));
      return Response.json({ ok: true, listing: updated });
    }

    return Response.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('saveResidentialListing error:', error?.message || error);
    return Response.json({ error: error?.message || 'Could not save listing' }, { status: 500 });
  }
}