import { isDeveloperAccount } from './developerAccess.ts';

const LISTING_FIELDS = `listingType title description event_name event_description event_category event_icon event_logo_url event_tier event_photos event_add_ons event_animation event_flyer_url event_photo_gallery_count coming_soon_package coming_soon_start_date marquee_flyer_url marquee_background_url marquee_schedule_slots display_address geocoded_address address_text addressText city state zip lat lng timeZoneId tier photoUrls category categories collectible_type selectedRangeStartDate selectedRangeEndDate openTime closeTime earlyVisibilityDays earlyVisibilityDates activeDates early_visibility_enabled early_visibility_days visibility_start_date startDateTime endDateTime start_datetime end_datetime event_start_date event_end_date event_start_time event_end_time event_center_lat event_center_lng organizer_participation invite_code`.split(' ');
const HALLOWEEN_FIELDS = `halloween_spot_type halloween_icon_key halloween_tags halloween_featured_badge halloween_candy_available halloween_candy_schedule_mode halloween_candy_start_date halloween_candy_end_date halloween_candy_start_time halloween_candy_end_time halloween_walkthrough halloween_lights halloween_sound halloween_jump_scares halloween_suggested_age halloween_host_name halloween_admission halloween_parking_notes halloween_activities halloween_start_date halloween_end_date halloween_start_time halloween_end_time`.split(' ');
const pick = (source, fields) => Object.fromEntries(fields.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));

export async function createDeveloperListing(base44, user, data, validateOnly = false) {
  if (!isDeveloperAccount(user)) return Response.json({ error: 'Developer access is restricted to the designated account.' }, { status: 403 });
  if (!data || typeof data !== 'object' || Array.isArray(data)) return Response.json({ error: 'Listing details are required.' }, { status: 400 });
  if ((data.ownerUserId && data.ownerUserId !== user.id) || (data.owner_user_id && data.owner_user_id !== user.id) || data.assisted_listing || data.assisted_post || data.created_by_admin) {
    return Response.json({ error: 'Developer publishing only creates your own normal listings. Assisted posting is unchanged.' }, { status: 403 });
  }
  if (!['yard_sale', 'neighborhood_sale', 'event', 'halloween_spot'].includes(data.listingType)) return Response.json({ error: 'Choose a supported listing type.' }, { status: 400 });
  const hasLocation = ['addressText', 'city', 'state', 'zip', 'timeZoneId'].every((key) => typeof data[key] === 'string' && data[key].trim());
  const coordinatesValid = typeof data.lat === 'number' && typeof data.lng === 'number' && Number.isFinite(data.lat) && Number.isFinite(data.lng) && Math.abs(data.lat) <= 90 && Math.abs(data.lng) <= 180;
  if (!String(data.title || '').trim() || !hasLocation || !coordinatesValid) return Response.json({ error: 'A title and valid map location are required to publish; profile verification is not required.' }, { status: 400 });
  const start = Date.parse(data.startDateTime || '');
  const end = Date.parse(data.endDateTime || '');
  const validTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !validTime(data.openTime) || !validTime(data.closeTime)) return Response.json({ error: 'Enter valid opening and closing dates and times.' }, { status: 400 });
  if (data.listingType !== 'event' && data.closeTime <= data.openTime) return Response.json({ error: 'Daily closing time must follow opening time.' }, { status: 400 });
  const now = Date.now();
  const status = now > end ? 'expired' : now < start ? 'scheduled' : 'active';
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 5);
  const number = `${String(data.state).toUpperCase().slice(0, 2)}${String(data.zip).slice(-4).padStart(4, '0')}-${suffix}`;
  let record;
  let recordType = 'Listing';
  if (data.listingType === 'halloween_spot') {
    recordType = 'Location';
    record = {
      ...pick(data, HALLOWEEN_FIELDS), type: 'halloween_candy', tier: 'free',
      title: data.title.trim(), display_title: data.title.trim(), description: data.description || '',
      street_address: data.addressText, city: data.city, state: data.state, zip_code: data.zip,
      address: [data.addressText, data.city, data.state, data.zip].join(', '), latitude: data.lat, longitude: data.lng,
      photos: data.photoUrls || [], owner_user_id: user.id, halloween_listing_number: `HW-${number}`,
      start_date_time: data.startDateTime, end_date_time: data.endDateTime, expires_at: data.endDateTime,
      viewing_start_time: data.openTime, viewing_end_time: data.closeTime, full_icon_activation_time: data.openTime,
      halloween_start_date: data.selectedRangeStartDate, halloween_end_date: data.selectedRangeEndDate,
      halloween_start_time: data.openTime, halloween_end_time: data.closeTime,
      status: now > end ? 'completed' : 'active', payment_status: 'free', is_demo_listing: false,
    };
  } else {
    const neighborhood = data.listingType === 'neighborhood_sale';
    const eventTier = data.event_add_ons?.marquee ? 'marquee' : data.event_add_ons?.premium_visibility ? 'premium' : 'featured';
    record = {
      ...pick(data, LISTING_FIELDS), ownerUserId: user.id, listingNumber: number, owner_type: 'user',
      location_source: ['pin', 'map_pin'].includes(data.location_source) ? 'map_pin' : 'address_search',
      title: data.title.trim(), category: data.category || 'Miscellaneous',
      ...(data.listingType === 'event' ? { tier: eventTier, event_tier: eventTier } : {}),
      status: neighborhood && now <= end ? 'active' : status,
      activation_status: status === 'active' ? 'active' : 'pending',
      pricePaid: 0, payment_status: 'waived', payment_intent_status: 'none',
      is_demo_listing: false, assisted_listing: false, created_by_admin: false,
      participant_origin: 'standalone', neighborhood_join_status: 'none',
      ...(neighborhood ? {
        tier: 'neighborhood_tier', event_state: now > end ? 'expired' : now < start ? 'activated' : 'active',
        spanFeet: 500, homeCount: data.organizer_participation === 'organizing_only' ? 0 : 1,
        organizer_participation: data.organizer_participation || 'participating',
        invite_code: data.invite_code || crypto.randomUUID(),
      } : {}),
    };
  }
  if (validateOnly) return Response.json({ ok: true, validation_only: true, record_type: recordType, listing: record });
  const listing = await base44.asServiceRole.entities[recordType].create(record);
  return Response.json({ ok: true, record_type: recordType, listing });
}