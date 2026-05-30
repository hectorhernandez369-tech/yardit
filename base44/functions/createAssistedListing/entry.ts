import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Map listingType input values to Listing entity enum values
function normalizeListingType(raw) {
  if (raw === 'yard_sale') return 'yard_sale';
  if (raw === 'neighborhood_sale') return 'neighborhood_sale';
  if (raw === 'event') return 'event';
  return 'yard_sale';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Yardit admin access is controlled through AdminProfile, NOT Base44 User.role.
    // Only master/super_master AdminProfiles (or super_master Base44 roles) can create assisted listings.
    const isSuperMasterBase44 = user.role === 'super_master';

    if (!isSuperMasterBase44) {
      // Look up AdminProfile by user email (the Yardit admin system)
      const adminProfiles = await base44.asServiceRole.entities.AdminProfile.filter({ email: user.email });
      const profile = adminProfiles[0];

      if (!profile) {
        return Response.json({
          error: 'Access denied: No admin profile found for this account.',
          debug: {
            base44_role: user.role,
            admin_profile_found: false,
            required: 'AdminProfile with role_label "master" and is_active: true',
          }
        }, { status: 403 });
      }

      if (!profile.is_active) {
        return Response.json({
          error: 'Access denied: Your admin profile is inactive.',
          debug: {
            base44_role: user.role,
            admin_profile_role: profile.role_label,
            admin_profile_active: false,
            required: 'is_active must be true',
          }
        }, { status: 403 });
      }

      const allowedRoles = ['master', 'super_master'];
      if (!allowedRoles.includes(profile.role_label)) {
        return Response.json({
          error: `Access denied: Your admin role "${profile.role_label}" does not have permission to create assisted listings. Required role: master.`,
          debug: {
            base44_role: user.role,
            admin_profile_role: profile.role_label,
            admin_profile_active: profile.is_active,
            required_role: 'master or super_master',
          }
        }, { status: 403 });
      }
    }

    const payload = await req.json().catch(() => ({}));

    const {
      listingType: rawListingType = 'yard_sale',
      tier = 'free',
      addressText,
      city,
      state,
      zip,
      lat,
      lng,
      location_source = 'search',
      saleFormattedAddress: clientFormattedAddress,
      timeZoneId = 'America/Los_Angeles',
      title,
      description = '',
      photoUrls = [],
      startDateTime,
      endDateTime,
      selectedRangeStartDate,
      selectedRangeEndDate,
      sellerName = '',
      sellerPhone = '',
      sellerEmail = '',
      adminNotes = '',
      sellerPermissionConfirmed = false,
    } = payload;

    const isMapPin = location_source === 'map_pin';

    if (!sellerPermissionConfirmed) {
      return Response.json({ error: 'Seller permission confirmation is required' }, { status: 400 });
    }
    // For map pin mode, we only need lat/lng. For search mode, full address is required.
    if (!isMapPin && (!addressText || !city || !state || !zip)) {
      return Response.json({ error: 'Address fields are required' }, { status: 400 });
    }
    if (!lat || !lng) {
      return Response.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }
    if (!title) {
      return Response.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!startDateTime || !endDateTime) {
      return Response.json({ error: 'Start and end date/time are required' }, { status: 400 });
    }

    // Normalize datetimes to full ISO UTC strings
    const normalizedStartDateTime = new Date(startDateTime).toISOString();
    const normalizedEndDateTime = new Date(endDateTime).toISOString();

    const listingType = normalizeListingType(rawListingType);
    const token = generateToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Build the sale address string early — used in both Listing and AssistedListing
    const saleFormattedAddress = isMapPin
      ? (clientFormattedAddress || 'Approximate Yard Sale Location')
      : `${addressText}, ${city}, ${state} ${zip}`.trim();

    // Determine the effective tier field for event listings
    const isEvent = listingType === 'event';
    const listingTier = isEvent ? 'basic' : (tier === 'neighborhood_tier' ? 'neighborhood_tier' : tier);
    const eventTier = isEvent ? tier : undefined;

    // Generate listing number with AD- prefix for admin-created listings
    const stateCode = state || 'XX';
    const zipLast4 = (zip || '0000').slice(-4).padStart(4, '0');
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let rand5 = '';
    for (let i = 0; i < 5; i++) rand5 += chars[Math.floor(Math.random() * chars.length)];
    const listingNumber = `AD-${stateCode}${zipLast4}-${rand5}`;

    // Use a system/guest owner user id — we use the admin's id as the creator
    // but mark it as assisted so it won't appear in the admin's "my listings"
    const listing = await base44.asServiceRole.entities.Listing.create({
      ownerUserId: user.id, // admin as technical owner; will be reassigned if claimed
      listingType,
      tier: listingTier,
      ...(isEvent ? { event_tier: eventTier } : {}),
      title,
      description,
      photoUrls,
      addressText: addressText || 'Approximate Yard Sale Location',
      display_address: saleFormattedAddress,
      city: city || '',
      state: state || '',
      zip: zip || '',
      location_source,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      timeZoneId,
      startDateTime: normalizedStartDateTime,
      endDateTime: normalizedEndDateTime,
      activeDates: [],
      earlyVisibilityDates: [],
      selectedRangeStartDate: selectedRangeStartDate || startDateTime.slice(0, 10),
      selectedRangeEndDate: selectedRangeEndDate || endDateTime.slice(0, 10),
      category: 'Miscellaneous',
      status: 'hidden', // hidden until seller approves
      pricePaid: 0,
      listingNumber,
      // Admin-assisted metadata
      created_by_admin: true,
      assisted_listing: true,
      owner_type: 'guest_assisted',
      payment_status: 'skipped_admin_promo',
    });

    console.log('Created assisted listing:', listing.id);

    // Create the AssistedListing record
    const assisted = await base44.asServiceRole.entities.AssistedListing.create({
      listing_id: listing.id,
      listing_number: listingNumber,
      assisted_status: 'pending_seller_approval',
      assisted_qr_token: token,
      assisted_qr_created_at: now.toISOString(),
      assisted_qr_expires_at: expiresAt.toISOString(),
      admin_creator_id: user.id,
      admin_creator_email: user.email,
      seller_permission_confirmed: true,
      seller_name: sellerName,
      seller_phone: sellerPhone,
      seller_email: sellerEmail,
      admin_notes: adminNotes,
      qr_scan_count: 0,
      // Admin-entered sale address — used as the QR label
      assisted_sale_address: addressText || (isMapPin ? 'Approximate Yard Sale Location' : ''),
      assisted_sale_city: city || '',
      assisted_sale_state: state || '',
      assisted_sale_zip: zip || '',
      assisted_sale_formatted_address: saleFormattedAddress,
      // Coordinates for admin/QR verification
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      location_source,
    });

    console.log('Created assisted record:', assisted.id, 'token:', token);

    return Response.json({
      ok: true,
      listingId: listing.id,
      assistedId: assisted.id,
      token,
      expiresAt: expiresAt.toISOString(),
      saleFormattedAddress,
    });
  } catch (error) {
    console.error('createAssistedListing error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to create assisted listing' }, { status: 500 });
  }
});