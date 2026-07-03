import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PUBLIC_LISTING_STATUSES = new Set(['active', 'scheduled', 'coming_soon', 'activated', 'activated_locked']);
const HIDDEN_STATUSES = new Set(['draft', 'hidden', 'under_review', 'suspended', 'completed', 'expired', 'closed', 'cancelled', 'canceled', 'deleted', 'removed', 'payment_pending', 'pending_payment']);
const PUBLIC_PAYMENT_OK = new Set(['paid', 'skipped_admin_promo', 'waived']);
const PUBLIC_PAYMENT_BLOCKED = new Set(['pending', 'failed', 'unpaid', 'none', 'canceled', 'cancelled', 'requires_payment_method', 'requires_payment_action']);
const PAID_TIERS = new Set(['basic', 'featured', 'premium', 'marquee']);

function pick(source, keys) {
  const out = {};
  for (const key of keys) {
    if (source?.[key] !== undefined) out[key] = source[key];
  }
  return out;
}

function isValidCoordinate(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasPublicPayment(listing) {
  if (listing?.listingType === 'event') return true;
  const tier = listing?.tier;
  if (!PAID_TIERS.has(tier)) return true;
  const status = String(listing?.payment_status || '').toLowerCase();
  if (PUBLIC_PAYMENT_OK.has(status)) return true;
  if (PUBLIC_PAYMENT_BLOCKED.has(status)) return false;
  if (listing?.payment_intent_status === 'captured') return true;
  return !status;
}

function isPublicListing(listing, now) {
  if (!listing) return false;
  if (!isValidCoordinate(listing.lat) || !isValidCoordinate(listing.lng)) return false;
  if (HIDDEN_STATUSES.has(listing.status)) return false;
  if (!PUBLIC_LISTING_STATUSES.has(listing.status) && listing.activation_status !== 'active' && listing.event_state !== 'active' && listing.event_state !== 'coming_soon') return false;
  if (!hasPublicPayment(listing)) return false;
  if (listing.endDateTime) {
    const end = new Date(listing.endDateTime);
    if (!Number.isNaN(end.getTime()) && now > end) return false;
  }
  return true;
}

function isActivePromo(promo, now) {
  if (!promo?.promo_door_enabled || promo?.status !== 'active') return false;
  if (!isValidCoordinate(promo.promo_door_lat) || !isValidCoordinate(promo.promo_door_lng)) return false;
  if (promo.starts_at) {
    const starts = new Date(promo.starts_at);
    if (!Number.isNaN(starts.getTime()) && now < starts) return false;
  }
  if (promo.expires_at) {
    const expires = new Date(promo.expires_at);
    if (!Number.isNaN(expires.getTime()) && now > expires) return false;
  }
  return true;
}

function isPublicVendorEvent(event, now) {
  if (!event) return false;
  if (!isValidCoordinate(event.latitude) || !isValidCoordinate(event.longitude)) return false;
  if (!['published', 'active'].includes(event.status) && !['coming_soon', 'active'].includes(event.visibility_status)) return false;
  if (event.endDateTime) {
    const end = new Date(event.endDateTime);
    if (!Number.isNaN(end.getTime()) && now > end) return false;
  }
  return true;
}

function isLiveVendorCheckIn(checkIn, now) {
  if (!checkIn || !['live', 'scheduled_live'].includes(checkIn.status)) return false;
  if (!isValidCoordinate(checkIn.checkin_latitude) || !isValidCoordinate(checkIn.checkin_longitude)) return false;
  if (checkIn.checkin_end_time) {
    const end = new Date(checkIn.checkin_end_time);
    if (!Number.isNaN(end.getTime()) && now > end) return false;
  }
  return true;
}

const listingFields = [
  'id', 'listingNumber', 'listingType', 'title', 'description', 'event_name', 'event_description', 'event_category', 'event_icon', 'event_logo_url', 'event_tier', 'event_photos', 'marquee_flyer_url', 'marquee_background_url', 'marquee_schedule_slots', 'display_address', 'address_text', 'addressText', 'city', 'state', 'zip', 'lat', 'lng', 'timeZoneId', 'tier', 'status', 'event_state', 'photoUrls', 'category', 'categories', 'collectible_type', 'selectedRangeStartDate', 'selectedRangeEndDate', 'openTime', 'closeTime', 'early_visibility_enabled', 'early_visibility_days', 'visibility_start_date', 'earlyVisibilityDays', 'activeDates', 'earlyVisibilityDates', 'startDateTime', 'endDateTime', 'validatedDistance', 'spanFeet', 'homeCount', 'neighborhood_sale_id', 'activation_status', 'is_demo_listing', 'event_center_lat', 'event_center_lng', 'organizer_participation'
];

const promoFields = ['id', 'code', 'title', 'promo_door_lat', 'promo_door_lng', 'promo_icon_logo_url', 'promo_icon_size_px', 'promo_icon_glow_enabled', 'promo_icon_animation', 'promo_min_zoom', 'promo_max_zoom', 'geo_display_label', 'default_discount_percent', 'starts_at', 'expires_at'];
const vendorEventFields = ['id', 'organizer_business_id', 'organizer_business_name', 'organizer_logo', 'title', 'description', 'category', 'event_type', 'status', 'visibility_status', 'startDateTime', 'endDateTime', 'earlyVisibilityStartDateTime', 'display_address', 'latitude', 'longitude', 'timeZoneId', 'radius_feet', 'photos', 'flyer_url', 'logo', 'icon', 'coming_soon_start_date'];
const vendorAccountFields = ['id', 'business_name', 'vendor_display_name', 'business_logo', 'business_category', 'vendor_slug', 'description', 'location', 'website', 'facebook_url', 'instagram_url', 'tiktok_url', 'vendor_tier', 'is_active'];
const vendorPinFields = ['id', 'vendor_account_id', 'pin_name', 'pin_logo_url', 'pin_icon_url', 'pin_icon_style', 'description', 'is_active', 'scheduled_date', 'scheduled_start_time', 'scheduled_end_time', 'recurring_schedule', 'scheduled_location_label', 'scheduled_lat', 'scheduled_lng', 'schedule_status'];
const vendorCheckInFields = ['id', 'vendor_pin_id', 'vendor_account_id', 'checkin_latitude', 'checkin_longitude', 'checkin_display_address', 'checkin_start_time', 'checkin_end_time', 'pin_animation', 'status'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    const [listingRows, promoRows, vendorEventRows, vendorAccountRows, vendorPinRows, vendorCheckInRows] = await Promise.all([
      base44.asServiceRole.entities.Listing.list('-created_date', 500),
      base44.asServiceRole.entities.ResidentialPromoCode.list('-updated_date', 100),
      base44.asServiceRole.entities.VendorEvent.list('startDateTime', 200),
      base44.asServiceRole.entities.VendorAccount.list('-updated_date', 300),
      base44.asServiceRole.entities.VendorPin.list('-updated_date', 300),
      base44.asServiceRole.entities.VendorPinCheckIn.list('-created_date', 300),
    ]);

    const listings = listingRows.filter((listing) => isPublicListing(listing, now)).map((listing) => pick(listing, listingFields));
    const promoDiscoveryCodes = promoRows.filter((promo) => isActivePromo(promo, now)).map((promo) => pick(promo, promoFields));
    const vendorEvents = vendorEventRows.filter((event) => isPublicVendorEvent(event, now)).map((event) => pick(event, vendorEventFields));
    const liveCheckIns = vendorCheckInRows.filter((checkIn) => isLiveVendorCheckIn(checkIn, now));
    const liveVendorAccountIds = new Set(liveCheckIns.map((checkIn) => checkIn.vendor_account_id));
    const liveVendorPinIds = new Set(liveCheckIns.map((checkIn) => checkIn.vendor_pin_id));
    const vendorAccounts = vendorAccountRows.filter((account) => account?.is_active !== false && liveVendorAccountIds.has(account.id)).map((account) => pick(account, vendorAccountFields));
    const vendorPins = vendorPinRows.filter((pin) => pin?.is_active !== false && liveVendorPinIds.has(pin.id)).map((pin) => pick(pin, vendorPinFields));
    const vendorCheckIns = liveCheckIns.map((checkIn) => pick(checkIn, vendorCheckInFields));

    return Response.json({ listings, promoDiscoveryCodes, vendorEvents, vendorAccounts, vendorPins, vendorCheckIns });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});