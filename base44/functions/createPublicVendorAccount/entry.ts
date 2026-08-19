import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const VENDOR_ACCOUNT_PREFIX = 'VND';
const VENDOR_ACCOUNT_START = 100001;

function normalizeVendorSearchText(value) {
  return String(value || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function normalizeOrganizerType(value) {
  return String(value || '') === 'league_team' ? 'league_team' : 'vendor_event';
}

function slugifyVendorName(name) {
  const slug = normalizeVendorSearchText(name)
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'vendor';
}

function getNextVendorAccountNumber(accounts = [], reservations = []) {
  const used = new Set();
  let highest = VENDOR_ACCOUNT_START - 1;
  [...accounts, ...reservations].forEach((item) => {
    const value = item?.vendor_account_number || item?.account_number || '';
    const match = /^VND-(\d+)$/.exec(String(value || '').trim());
    if (!match) return;
    const number = Number(match[1]);
    used.add(number);
    highest = Math.max(highest, number);
  });
  let next = Math.max(VENDOR_ACCOUNT_START, highest + 1);
  while (used.has(next)) next += 1;
  return `${VENDOR_ACCOUNT_PREFIX}-${next}`;
}

function getNextVendorSlug(businessName, accounts = [], reservations = []) {
  const baseSlug = slugifyVendorName(businessName);
  const used = new Set(
    [...accounts, ...reservations]
      .map((item) => normalizeVendorSearchText(item?.vendor_slug))
      .filter(Boolean)
  );
  if (!used.has(baseSlug)) return baseSlug;
  let suffix = 2;
  while (used.has(`${baseSlug}-${suffix}`)) suffix += 1;
  return `${baseSlug}-${suffix}`;
}

async function readSetting(base44, key) {
  const rows = await base44.asServiceRole.entities.AppSetting.filter({ key });
  return rows?.[0]?.value || '';
}

function getVendorBetaAllowlist(raw) {
  if (!raw) return [];
  let parsed = [];
  try {
    const json = JSON.parse(raw);
    parsed = Array.isArray(json) ? json : [json];
  } catch {
    parsed = String(raw).split(',').map((entry) => entry.trim()).filter(Boolean);
  }
  return parsed
    .map((entry) => String(entry).trim())
    .filter(Boolean)
    .flatMap((entry) => entry.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
}

function isVendorLaunchBypassUser(user, allowlistRaw) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin' || role === 'master' || role === 'super_master' || user.isAdmin === true) {
    return true;
  }
  const allowlist = getVendorBetaAllowlist(allowlistRaw);
  const email = String(user.email || '').toLowerCase();
  const id = user.id || '';
  return allowlist.some((entry) => {
    const value = String(entry).toLowerCase();
    return value && (value === email || value === id);
  });
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const businessForm = body?.businessForm || {};
    const organizerType = body?.organizerType || 'vendor_event';
    const targetOrganizerType = normalizeOrganizerType(organizerType);

    // Keep the launch gate on Vendor/Event accounts only. League/Team accounts
    // are organizer accounts but are not part of the protected vendor beta gate.
    if (targetOrganizerType === 'vendor_event') {
      const publicEnabledRaw = await readSetting(base44, 'vendor_public_signup_enabled');
      const publicEnabled = String(publicEnabledRaw || '').toLowerCase() === 'true';
      const allowlistRaw = await readSetting(base44, 'vendor_beta_allowlist');
      const authorized = publicEnabled || isVendorLaunchBypassUser(user, allowlistRaw);
      if (!authorized) {
        return Response.json(
          { error: 'Vendor public signup is not available yet.', code: 'vendor_signup_closed' },
          { status: 403 }
        );
      }
    }

    const businessName = String(businessForm.business_name || '').trim();
    const businessCategory = String(businessForm.business_category || '').trim();
    const businessTaxId = String(businessForm.business_tax_id || '').trim();

    if (!businessName || !businessCategory) {
      return Response.json({ error: 'Business name and category are required.' }, { status: 400 });
    }

    // Multiple organizer accounts can belong to one Yardit login. Only stop an
    // accidental duplicate of the same organizer type with the same name.
    const [ownedByUserId, ownedByEmail] = await Promise.all([
      user.id ? base44.asServiceRole.entities.VendorAccount.filter({ owner_user_id: user.id }) : Promise.resolve([]),
      user.email ? base44.asServiceRole.entities.VendorAccount.filter({ owner_email: user.email }) : Promise.resolve([]),
    ]);
    const existingOwnedMap = new Map();
    [...ownedByUserId, ...ownedByEmail]
      .filter((account) => account?.is_active !== false)
      .forEach((account) => existingOwnedMap.set(account.id, account));
    const existingOwned = [...existingOwnedMap.values()];
    const requestedName = normalizeVendorSearchText(businessName);
    const duplicateOwned = existingOwned.find((account) => {
      const accountType = normalizeOrganizerType(account?.organization_type);
      const accountName = normalizeVendorSearchText(
        account?.business_name || account?.vendor_display_name || account?.legal_business_name
      );
      return accountType === targetOrganizerType && accountName === requestedName;
    });
    if (duplicateOwned) {
      return Response.json(
        { error: 'You already have an active organizer account with this name.', code: 'duplicate_organizer_account' },
        { status: 409 }
      );
    }

    const businessAddress = [
      businessForm.business_street_address,
      businessForm.business_city,
      businessForm.business_state,
      businessForm.business_zip_code,
    ].filter(Boolean).join(', ');

    const [existingAccounts, existingReservations] = await Promise.all([
      base44.asServiceRole.entities.VendorAccount.list(),
      base44.asServiceRole.entities.VendorAccountIdentityReservation.list(),
    ]);

    const vendorAccountNumber = getNextVendorAccountNumber(existingAccounts, existingReservations);
    const vendorSlug = getNextVendorSlug(businessName, existingAccounts, existingReservations);
    const now = new Date().toISOString();

    const identityFields = {
      owner_email: user.email || '',
      owner_user_id: user.id || '',
      vendor_account_number: vendorAccountNumber,
      account_number: vendorAccountNumber,
      vendor_slug: vendorSlug,
      vendor_display_name: businessName,
      legal_business_name: businessName,
      organization_type: targetOrganizerType === 'league_team' ? 'league_team' : 'vendor',
      subscription_status: 'active',
      is_verified_vendor: false,
      is_active: true,
      organization_user_ids: user.id ? [user.id] : [],
      organization_staff_emails: user.email ? [user.email] : [],
      organization_permissions: {},
      assigned_pin_ids: [],
      team_settings: {},
    };

    const [reservationNum, reservationSlug] = await Promise.all([
      base44.asServiceRole.entities.VendorAccountIdentityReservation.create({
        type: 'vendor_account_number',
        value: vendorAccountNumber,
        vendor_account_id: 'pending',
        vendor_account_number: vendorAccountNumber,
        vendor_slug: vendorSlug,
        business_name_at_assignment: businessName,
        owner_user_id: user.id || '',
        owner_email: user.email || '',
        status: 'reserved',
        reserved_at: now,
      }),
      base44.asServiceRole.entities.VendorAccountIdentityReservation.create({
        type: 'vendor_slug',
        value: vendorSlug,
        vendor_account_id: 'pending',
        vendor_account_number: vendorAccountNumber,
        vendor_slug: vendorSlug,
        business_name_at_assignment: businessName,
        owner_user_id: user.id || '',
        owner_email: user.email || '',
        status: 'reserved',
        reserved_at: now,
      }),
    ]);

    const account = await base44.asServiceRole.entities.VendorAccount.create({
      business_name: businessName,
      business_category: businessCategory,
      business_tax_id: businessTaxId,
      description: String(businessForm.description || '').trim(),
      business_street_address: String(businessForm.business_street_address || '').trim(),
      business_city: String(businessForm.business_city || '').trim(),
      business_state: String(businessForm.business_state || ''),
      business_zip_code: String(businessForm.business_zip_code || '').trim(),
      business_address: businessAddress,
      location: businessAddress,
      website: String(businessForm.website || '').trim(),
      phone: String(businessForm.phone || '').trim(),
      business_phone: String(businessForm.phone || '').trim(),
      facebook_url: String(businessForm.facebook_url || '').trim(),
      instagram_url: String(businessForm.instagram_url || '').trim(),
      tiktok_url: String(businessForm.tiktok_url || '').trim(),
      ...identityFields,
      vendor_tier: 'free',
      vendor_setup_status: 'setup_required',
      extra_users_count: 0,
      extra_pins_count: 0,
      current_authorized_users: 1,
      current_vendor_pins: 0,
      is_active: true,
    });

    await Promise.all([
      base44.asServiceRole.entities.VendorAccountIdentityReservation.update(reservationNum.id, {
        vendor_account_id: account.id,
        status: 'assigned',
      }),
      base44.asServiceRole.entities.VendorAccountIdentityReservation.update(reservationSlug.id, {
        vendor_account_id: account.id,
        status: 'assigned',
      }),
    ]);

    return Response.json({ ok: true, account });
  } catch (error) {
    console.error('createPublicVendorAccount failed:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to create vendor account' }, { status: 500 });
  }
}