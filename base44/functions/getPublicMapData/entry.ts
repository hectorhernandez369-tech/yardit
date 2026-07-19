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

function isActivePromo(promo) {
  if (!promo?.promo_door_enabled || promo?.status !== 'active') return false;
  const hasDoorPosition = isValidCoordinate(promo.promo_door_lat) && isValidCoordinate(promo.promo_door_lng);
  const hasRadiusPosition = promo.geographic_limit_type === 'radius' && isValidCoordinate(promo.geo_center_lat) && isValidCoordinate(promo.geo_center_lng);
  return hasDoorPosition || hasRadiusPosition;
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

function resolvePublicContactVisibility(accountVisibility = 'hide', eventVisibility = 'inherit') {
  const eventValue = String(eventVisibility || 'inherit').toLowerCase();
  if (eventValue === 'show') return true;
  if (eventValue === 'hide') return false;
  return String(accountVisibility || 'hide').toLowerCase() === 'show';
}

function publicContact(account, event = null) {
  const visible = resolvePublicContactVisibility(account?.public_contact_visibility, event?.public_contact_visibility);
  return {
    public_contact_visible: visible,
    phone: visible ? account?.business_phone || account?.phone || '' : '',
    email: visible ? account?.email || '' : '',
    website: visible ? account?.website || '' : '',
  };
}

const listingFields = [
  'id', 'listingNumber', 'listingType', 'title', 'description', 'event_name', 'event_description', 'event_category', 'event_icon', 'event_logo_url', 'event_tier', 'event_photos', 'marquee_flyer_url', 'marquee_background_url', 'marquee_schedule_slots', 'display_address', 'address_text', 'addressText', 'city', 'state', 'zip', 'lat', 'lng', 'timeZoneId', 'tier', 'status', 'event_state', 'photoUrls', 'category', 'categories', 'collectible_type', 'selectedRangeStartDate', 'selectedRangeEndDate', 'openTime', 'closeTime', 'early_visibility_enabled', 'early_visibility_days', 'visibility_start_date', 'earlyVisibilityDays', 'activeDates', 'earlyVisibilityDates', 'startDateTime', 'endDateTime', 'validatedDistance', 'spanFeet', 'homeCount', 'neighborhood_sale_id', 'activation_status', 'is_demo_listing', 'event_center_lat', 'event_center_lng', 'organizer_participation'
];

const promoFields = ['id', 'code', 'title', 'status', 'promo_door_enabled', 'promo_door_lat', 'promo_door_lng', 'geographic_limit_type', 'geo_center_lat', 'geo_center_lng', 'promo_icon_logo_url', 'promo_icon_size_px', 'promo_icon_glow_enabled', 'promo_icon_animation', 'promo_min_zoom', 'promo_max_zoom', 'geo_display_label', 'default_discount_percent', 'starts_at', 'expires_at', 'applies_to_tiers'];
const vendorEventFields = ['id', 'organizer_business_id', 'organizer_business_name', 'organizer_logo', 'title', 'description', 'category', 'event_type', 'status', 'visibility_status', 'public_contact_visibility', 'startDateTime', 'endDateTime', 'earlyVisibilityStartDateTime', 'display_address', 'latitude', 'longitude', 'timeZoneId', 'radius_feet', 'photos', 'flyer_url', 'logo', 'icon', 'coming_soon_start_date'];
const vendorAccountFields = ['id', 'business_name', 'vendor_display_name', 'business_logo', 'business_category', 'vendor_slug', 'description', 'location', 'facebook_url', 'instagram_url', 'tiktok_url', 'vendor_tier', 'is_active'];
const vendorPinFields = ['id', 'vendor_account_id', 'pin_name', 'pin_logo_url', 'pin_icon_url', 'pin_icon_style', 'description', 'is_active', 'scheduled_date', 'scheduled_start_time', 'scheduled_end_time', 'recurring_schedule', 'scheduled_location_label', 'scheduled_lat', 'scheduled_lng', 'schedule_status'];
const vendorCheckInFields = ['id', 'vendor_pin_id', 'vendor_account_id', 'checkin_latitude', 'checkin_longitude', 'checkin_display_address', 'checkin_start_time', 'checkin_end_time', 'pin_animation', 'status'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const body = await req.json().catch(() => ({}));
    const listingId = typeof body?.listingId === 'string' ? body.listingId : '';

    if (listingId) {
      if (!/^[a-f0-9]{24}$/i.test(listingId)) {
        return Response.json({ listing: null });
      }
      const matches = await base44.asServiceRole.entities.Listing.filter({ id: listingId }, '-created_date', 1);
      const listing = matches[0] || null;
      if (!isPublicListing(listing, now)) {
        return Response.json({ listing: null });
      }
      return Response.json({ listing: pick(listing, listingFields) });
    }

    const [listingRows, promoRows, vendorEventRows, vendorAccountRows, vendorPinRows, vendorCheckInRows, scheduleRows, leagueEventRows, leagueGameRows] = await Promise.all([
      base44.asServiceRole.entities.Listing.list('-created_date', 500),
      base44.asServiceRole.entities.ResidentialPromoCode.list('-updated_date', 100),
      base44.asServiceRole.entities.VendorEvent.list('startDateTime', 200),
      base44.asServiceRole.entities.VendorAccount.list('-updated_date', 300),
      base44.asServiceRole.entities.VendorPin.list('-updated_date', 300),
      base44.asServiceRole.entities.VendorPinCheckIn.list('-created_date', 300),
      base44.asServiceRole.entities.EventScheduleEntry.list('sort_order', 1000),
      base44.asServiceRole.entities.LeagueEventGame.list('display_order', 1000),
      base44.asServiceRole.entities.LeagueGame.list('sort_order', 1000),
    ]);

    const listings = listingRows.filter((listing) => isPublicListing(listing, now)).map((listing) => pick(listing, listingFields));
    const promoDiscoveryCodes = promoRows
      .filter((promo) => isActivePromo(promo))
      .map((promo) => ({ ...pick(promo, promoFields), status: 'active' }));
    const publicVendorEventRows = vendorEventRows.filter((event) => isPublicVendorEvent(event, now));
    const publicVendorEventIds = new Set(publicVendorEventRows.map((event) => event.id));
    const eventScheduleFields = ['id', 'event_id', 'spot_id', 'field_name', 'title', 'start_time', 'end_time', 'notes', 'date', 'sort_order'];
    const leagueEventFields = ['id', 'event_id', 'league_game_id', 'league_account_id', 'display_order', 'is_visible'];
    const leagueGameFields = ['id', 'vendor_account_id', 'league_name', 'season', 'division', 'age_group', 'game_title', 'home_team', 'away_team', 'game_date', 'start_time', 'end_time', 'field_name', 'location', 'status', 'home_score', 'away_score', 'period_label', 'period_number', 'clock_display', 'sort_order'];
    const eventScheduleEntries = scheduleRows.filter((entry) => publicVendorEventIds.has(entry?.event_id)).map((entry) => pick(entry, eventScheduleFields));
    const leagueEventLinks = leagueEventRows.filter((link) => link?.is_visible !== false && publicVendorEventIds.has(link?.event_id)).map((link) => pick(link, leagueEventFields));
    const linkedLeagueGameIds = new Set(leagueEventLinks.map((link) => link.league_game_id).filter(Boolean));
    const leagueGames = leagueGameRows.filter((game) => linkedLeagueGameIds.has(game?.id)).map((game) => pick(game, leagueGameFields));
    const vendorEvents = publicVendorEventRows.map((event) => pick(event, vendorEventFields));
    const liveCheckIns = vendorCheckInRows.filter((checkIn) => isLiveVendorCheckIn(checkIn, now));
    const liveVendorAccountIds = new Set(liveCheckIns.map((checkIn) => checkIn.vendor_account_id));
    const liveVendorPinIds = new Set(liveCheckIns.map((checkIn) => checkIn.vendor_pin_id));
    const vendorAccounts = vendorAccountRows.filter((account) => account?.is_active !== false && liveVendorAccountIds.has(account.id)).map((account) => ({ ...pick(account, vendorAccountFields), ...publicContact(account) }));
    const vendorPins = vendorPinRows.filter((pin) => pin?.is_active !== false && liveVendorPinIds.has(pin.id)).map((pin) => pick(pin, vendorPinFields));
    const vendorCheckIns = liveCheckIns.map((checkIn) => pick(checkIn, vendorCheckInFields));

    return Response.json({ listings, promoDiscoveryCodes, vendorEvents, eventScheduleEntries, leagueEventLinks, leagueGames, vendorAccounts, vendorPins, vendorCheckIns });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});