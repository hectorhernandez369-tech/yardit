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

    // Only admins can create assisted listings
    if (user.role !== 'admin' && user.role !== 'master' && user.role !== 'super_master') {
      // Also allow users with isAdmin flag via AdminProfile — check AdminProfile
      const adminProfiles = await base44.asServiceRole.entities.AdminProfile.filter({ owner_email: user.email });
      const profile = adminProfiles[0];
      if (!profile || !profile.is_active) {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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

    if (!sellerPermissionConfirmed) {
      return Response.json({ error: 'Seller permission confirmation is required' }, { status: 400 });
    }
    if (!addressText || !city || !state || !zip) {
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

    const listingType = normalizeListingType(rawListingType);
    const token = generateToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Determine the effective tier field for event listings
    const isEvent = listingType === 'event';
    const listingTier = isEvent ? 'basic' : (tier === 'neighborhood_tier' ? 'neighborhood_tier' : tier);
    const eventTier = isEvent ? tier : undefined;

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
      addressText,
      display_address: `${addressText}, ${city}, ${state} ${zip}`,
      city,
      state,
      zip,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      timeZoneId,
      startDateTime,
      endDateTime,
      activeDates: [],
      earlyVisibilityDates: [],
      selectedRangeStartDate: selectedRangeStartDate || startDateTime.slice(0, 10),
      selectedRangeEndDate: selectedRangeEndDate || endDateTime.slice(0, 10),
      category: 'Miscellaneous',
      status: 'hidden', // hidden until seller approves
      pricePaid: 0,
      // Admin-assisted metadata
      created_by_admin: true,
      assisted_listing: true,
      owner_type: 'guest_assisted',
      payment_status: 'skipped_admin_promo',
    });

    console.log('Created assisted listing:', listing.id);

    // Build the sale address string from admin-entered fields
    const saleFormattedAddress = `${addressText}, ${city}, ${state} ${zip}`.trim();

    // Create the AssistedListing record
    const assisted = await base44.asServiceRole.entities.AssistedListing.create({
      listing_id: listing.id,
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
      assisted_sale_address: addressText,
      assisted_sale_city: city,
      assisted_sale_state: state,
      assisted_sale_zip: zip,
      assisted_sale_formatted_address: saleFormattedAddress,
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