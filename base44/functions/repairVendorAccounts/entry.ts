import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const START_NUMBER = 100001;

function normalizeText(value) {
  return String(value || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function slugify(value) {
  const slug = normalizeText(value)
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'vendor';
}

function getExistingNumber(account) {
  return account.vendor_account_number || account.account_number || '';
}

function collectUsedNumbers(accounts, reservations) {
  const usedNumbers = new Set();
  [...accounts, ...reservations].forEach((item) => {
    const value = item.vendor_account_number || item.account_number || (item.type === 'vendor_account_number' ? item.value : '');
    const match = /^VND-(\d+)$/.exec(String(value || '').trim());
    if (match) usedNumbers.add(Number(match[1]));
  });
  return usedNumbers;
}

function nextAccountNumber(usedNumbers) {
  let next = START_NUMBER;
  if (usedNumbers.size) {
    next = Math.max(...Array.from(usedNumbers), START_NUMBER - 1) + 1;
  }
  while (usedNumbers.has(next)) next += 1;
  usedNumbers.add(next);
  return `VND-${next}`;
}

function collectUsedSlugs(accounts, reservations) {
  return new Set(
    [...accounts, ...reservations]
      .map((item) => item.vendor_slug || (item.type === 'vendor_slug' ? item.value : ''))
      .map((value) => normalizeText(value))
      .filter(Boolean)
  );
}

function nextSlug(name, usedSlugs) {
  const base = slugify(name);
  if (!usedSlugs.has(base)) {
    usedSlugs.add(base);
    return base;
  }

  let suffix = 2;
  while (usedSlugs.has(`${base}-${suffix}`)) suffix += 1;
  const slug = `${base}-${suffix}`;
  usedSlugs.add(slug);
  return slug;
}

function buildReservationKey(type, value) {
  return `${type}|${normalizeText(value)}`;
}

async function createReservation(base44, reservationKeys, type, value, account, summary) {
  if (!value) return;

  const key = buildReservationKey(type, value);
  if (reservationKeys.has(key)) {
    summary.skipped_duplicates += 1;
    return;
  }

  await base44.asServiceRole.entities.VendorAccountIdentityReservation.create({
    type,
    value,
    vendor_account_id: account.id,
    reserved_at: new Date().toISOString(),
    status: 'reserved',
  });
  reservationKeys.add(key);
  summary.reservations_created += 1;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const syncSecret = Deno.env.get('YARDIT_VENDOR_SYNC_SECRET');
    const isSecretAuthorized = syncSecret && payload?.secret === syncSecret;

    if (!isSecretAuthorized) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    const accounts = await base44.asServiceRole.entities.VendorAccount.list();
    const reservations = await base44.asServiceRole.entities.VendorAccountIdentityReservation.list();
    const users = await base44.asServiceRole.entities.User.list();
    const userById = new Map(users.map((item) => [item.id, item]));
    const usedNumbers = collectUsedNumbers(accounts, reservations);
    const usedSlugs = collectUsedSlugs(accounts, reservations);
    const reservationKeys = new Set(
      reservations
        .map((item) => [
          item.type && item.value ? buildReservationKey(item.type, item.value) : null,
          item.vendor_account_number ? buildReservationKey('vendor_account_number', item.vendor_account_number) : null,
          item.vendor_slug ? buildReservationKey('vendor_slug', item.vendor_slug) : null,
        ])
        .flat()
        .filter(Boolean)
    );

    const summary = {
      vendor_accounts_scanned: accounts.length,
      account_numbers_created: 0,
      slugs_created: 0,
      reservations_created: 0,
      skipped_duplicates: 0,
      errors: [],
    };

    for (const account of accounts) {
      try {
        const updates = {};
        let finalNumber = getExistingNumber(account);
        let finalSlug = account.vendor_slug || '';

        if (!finalNumber || !/^VND-\d+$/.test(finalNumber)) {
          finalNumber = nextAccountNumber(usedNumbers);
          updates.vendor_account_number = finalNumber;
          updates.account_number = finalNumber;
          summary.account_numbers_created += 1;
        } else {
          updates.vendor_account_number = finalNumber;
          updates.account_number = finalNumber;
        }

        if (!finalSlug) {
          finalSlug = nextSlug(account.vendor_display_name || account.business_name || account.legal_business_name, usedSlugs);
          updates.vendor_slug = finalSlug;
          summary.slugs_created += 1;
        }

        if (!account.owner_email && account.owner_user_id) {
          const owner = userById.get(account.owner_user_id);
          if (owner?.email) updates.owner_email = owner.email;
        }

        const ownerUserIdText = String(account.owner_user_id || '');
        const resolvedOwnerEmail = updates.owner_email || account.owner_email || account.email || (ownerUserIdText.includes('@') ? ownerUserIdText : '') || account.created_by || '';
        if (!account.owner_email && resolvedOwnerEmail) updates.owner_email = resolvedOwnerEmail;
        if (!account.vendor_display_name) updates.vendor_display_name = account.business_name || '';
        if (!account.legal_business_name) updates.legal_business_name = account.business_name || '';
        if (!account.business_phone && account.phone) updates.business_phone = account.phone;
        if (!account.email && resolvedOwnerEmail) updates.email = resolvedOwnerEmail;
        if (!account.organization_type) updates.organization_type = account.vendor_tier === 'event_organizer' ? 'event_organizer' : 'vendor';
        if (account.is_verified_vendor === undefined || account.is_verified_vendor === null) updates.is_verified_vendor = false;
        if (!account.vendor_tier) updates.vendor_tier = 'free';
        if (!account.subscription_status) updates.subscription_status = 'active';
        if (account.is_active === undefined || account.is_active === null) updates.is_active = true;
        if (!account.organization_user_ids && account.owner_user_id) updates.organization_user_ids = [account.owner_user_id];
        if (!account.organization_staff_emails && (updates.owner_email || account.owner_email)) updates.organization_staff_emails = [updates.owner_email || account.owner_email];
        if (!account.organization_permissions) updates.organization_permissions = {};
        if (!account.assigned_pin_ids) updates.assigned_pin_ids = [];
        if (!account.team_settings) updates.team_settings = {};

        if (Object.keys(updates).length) {
          await base44.asServiceRole.entities.VendorAccount.update(account.id, updates);
        }

        await createReservation(base44, reservationKeys, 'vendor_account_number', finalNumber, account, summary);
        await createReservation(base44, reservationKeys, 'vendor_slug', finalSlug, account, summary);
      } catch (error) {
        summary.errors.push({ vendor_account_id: account.id, message: error.message });
      }
    }

    console.log('repairVendorAccounts backfill complete', summary);
    return Response.json(summary);
  } catch (error) {
    console.error('repairVendorAccounts failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});