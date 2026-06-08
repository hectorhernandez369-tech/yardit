import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function generateToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getAppBaseUrl(req, explicitBaseUrl = '') {
  const configured = String(Deno.env.get('APP_BASE_URL') || '').trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(configured)) return configured;
  const explicit = String(explicitBaseUrl || '').trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(explicit)) return explicit;
  const origin = req.headers.get('origin');
  if (origin && /^https?:\/\//i.test(origin)) return origin.replace(/\/$/, '');
  return new URL(req.url).origin;
}

function buildApprovalUrl(baseUrl, token) {
  return `${baseUrl}/assisted-listing?token=${token}`;
}

function buildQrImageUrl(approvalUrl, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(approvalUrl)}&ecc=M`;
}

function extractToken(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  try {
    return new URL(value).searchParams.get('token') || '';
  } catch {
    return '';
  }
}

function isRepairEligible(record) {
  return !['assisted_declined', 'claimed_active'].includes(record.assisted_status);
}

async function assertAdmin(base44, user) {
  if (!user) return false;
  if (['admin', 'master', 'super_master'].includes(user.role)) return true;

  const profiles = await base44.asServiceRole.entities.AdminProfile.filter({ email: user.email });
  const profile = profiles[0];
  return !!profile && profile.is_active === true && ['master', 'super_master'].includes(profile.role_label);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const isAdmin = await assertAdmin(base44, user);

    if (!isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const repair = payload.dryRun === true ? false : payload.repair !== false;
    const appBaseUrl = getAppBaseUrl(req, payload.appBaseUrl);
    const records = await base44.asServiceRole.entities.AssistedListing.list('-created_date', 1000);
    const assistedListings = await base44.asServiceRole.entities.Listing.filter({ assisted_listing: true }, '-created_date', 1000);

    if (repair && (records.length > 0 || assistedListings.length > 0) && /deno\.dev/i.test(appBaseUrl)) {
      return Response.json({ error: 'Safe repair requires a production app URL. Pass appBaseUrl or set APP_BASE_URL.' }, { status: 400 });
    }

    const tokenCounts = new Map();
    for (const record of records) {
      const token = String(record.assisted_qr_token || '').trim();
      if (token && token !== '__invalidated__') tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    }

    const brokenRecords = [];
    const repairedRecords = [];
    const skippedRecords = [];
    const existingAssistedListingIds = new Set(records.map((record) => String(record.listing_id || '')));
    const orphanedListings = assistedListings.filter((listing) => !existingAssistedListingIds.has(String(listing.id || '')));

    for (const record of records) {
      const existingToken = String(record.assisted_qr_token || '').trim();
      const missingToken = !existingToken || existingToken === '__invalidated__';
      const duplicateToken = !!existingToken && existingToken !== '__invalidated__' && (tokenCounts.get(existingToken) || 0) > 1;
      const urlToken = extractToken(record.approval_url);
      const missingApprovalUrl = !record.approval_url || !existingToken || urlToken !== existingToken;
      const expectedApprovalUrl = existingToken && !missingToken && !duplicateToken ? buildApprovalUrl(appBaseUrl, existingToken) : '';
      const wrongProductionUrl = expectedApprovalUrl && record.approval_url !== expectedApprovalUrl;
      const missingQrImage = !record.qr_image_url || (existingToken && !String(record.qr_image_url).includes(existingToken));
      const broken = missingToken || duplicateToken || missingApprovalUrl || wrongProductionUrl || missingQrImage;

      if (!broken) continue;

      const issue = {
        id: record.id,
        listing_id: record.listing_id,
        listing_number: record.listing_number,
        assisted_status: record.assisted_status,
        missing_token: missingToken,
        duplicate_token: duplicateToken,
        missing_or_mismatched_approval_url: missingApprovalUrl || wrongProductionUrl,
        missing_or_mismatched_qr_image: missingQrImage,
        repair_eligible: isRepairEligible(record),
      };
      brokenRecords.push(issue);

      if (!repair || !isRepairEligible(record)) {
        skippedRecords.push(issue);
        continue;
      }

      const now = new Date();
      const token = (missingToken || duplicateToken) ? generateToken() : existingToken;
      const approvalUrl = buildApprovalUrl(appBaseUrl, token);
      const qrImageUrl = buildQrImageUrl(approvalUrl);
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const update = {
        assisted_qr_token: token,
        approval_url: approvalUrl,
        qr_image_url: qrImageUrl,
        assisted_qr_created_at: now.toISOString(),
        assisted_qr_expires_at: expiresAt,
      };

      if (record.assisted_status === 'assisted_expired') {
        update.assisted_status = 'pending_seller_approval';
      }

      const updated = await base44.asServiceRole.entities.AssistedListing.update(record.id, update);
      repairedRecords.push({ id: updated.id, listing_id: updated.listing_id, listing_number: updated.listing_number });
    }

    for (const listing of orphanedListings) {
      const issue = {
        listing_id: listing.id,
        listing_number: listing.listingNumber,
        listing_status: listing.status,
        missing_assisted_record: true,
        repair_eligible: true,
      };
      brokenRecords.push(issue);

      if (!repair) {
        skippedRecords.push(issue);
        continue;
      }

      const now = new Date();
      const token = generateToken();
      const approvalUrl = buildApprovalUrl(appBaseUrl, token);
      const qrImageUrl = buildQrImageUrl(approvalUrl);
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const displayAddress = listing.display_address || [listing.addressText, listing.city, listing.state, listing.zip].filter(Boolean).join(', ');

      const created = await base44.asServiceRole.entities.AssistedListing.create({
        listing_id: listing.id,
        listing_number: listing.listingNumber || '',
        assisted_status: listing.status === 'active' ? 'assisted_active_unclaimed' : 'pending_seller_approval',
        assisted_qr_token: token,
        approval_url: approvalUrl,
        qr_image_url: qrImageUrl,
        assisted_qr_created_at: now.toISOString(),
        assisted_qr_expires_at: expiresAt,
        admin_creator_id: listing.ownerUserId || listing.created_by_id || 'system',
        admin_creator_email: listing.created_by || '',
        seller_permission_confirmed: true,
        qr_scan_count: 0,
        assisted_sale_address: listing.addressText || '',
        assisted_sale_city: listing.city || '',
        assisted_sale_state: listing.state || '',
        assisted_sale_zip: listing.zip || '',
        assisted_sale_formatted_address: displayAddress,
        latitude: listing.lat,
        longitude: listing.lng,
        location_source: listing.location_source === 'map_pin' ? 'map_pin' : 'address_search',
      });

      await base44.asServiceRole.entities.Listing.update(listing.id, {
        assisted_listing_id: created.id,
        assisted_qr_token: token,
        assisted_approval_url: approvalUrl,
        assisted_qr_image_url: qrImageUrl,
        assisted_qr_expires_at: expiresAt,
      });

      repairedRecords.push({ id: created.id, listing_id: created.listing_id, listing_number: created.listing_number, recreated_missing_record: true });
    }

    return Response.json({
      ok: true,
      repair,
      appBaseUrl,
      total_assisted_records: records.length,
      total_assisted_listings: assistedListings.length,
      orphaned_listing_count: orphanedListings.length,
      broken_count: brokenRecords.length,
      repaired_count: repairedRecords.length,
      skipped_count: skippedRecords.length,
      broken_records: brokenRecords,
      repaired_records: repairedRecords,
      skipped_records: skippedRecords,
    });
  } catch (error) {
    console.error('auditRepairAssistedListings error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to audit assisted listings' }, { status: 500 });
  }
});