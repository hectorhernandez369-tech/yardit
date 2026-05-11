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
    const value = item.vendor_account_number || item.account_number || '';
    const match = /^VND-(\d+)$/.exec(String(value).trim());
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const accounts = await base44.asServiceRole.entities.VendorAccount.list();
    const reservations = await base44.asServiceRole.entities.VendorAccountIdentityReservation.list();
    const users = await base44.asServiceRole.entities.User.list();
    const userById = new Map(users.map((item) => [item.id, item]));
    const usedNumbers = collectUsedNumbers(accounts, reservations);
    const usedSlugs = new Set([...accounts, ...reservations].map((item) => normalizeText(item.vendor_slug)).filter(Boolean));
    const reservationKeys = new Set(reservations.map((item) => `${item.vendor_account_number || ''}|${item.vendor_slug || ''}`));

    const repaired = [];
    const warnings = [];
    const createdReservations = [];

    for (const account of accounts) {
      const updates = {};
      const currentNumber = getExistingNumber(account);
      const currentSlug = normalizeText(account.vendor_slug);

      if (!currentNumber || !/^VND-\d+$/.test(currentNumber)) {
        const generated = nextAccountNumber(usedNumbers);
        updates.vendor_account_number = generated;
        updates.account_number = generated;
      } else {
        updates.vendor_account_number = currentNumber;
        updates.account_number = currentNumber;
      }

      if (!currentSlug) {
        updates.vendor_slug = nextSlug(account.business_name || account.vendor_display_name || account.legal_business_name, usedSlugs);
      }

      if (!account.owner_email && account.owner_user_id) {
        const owner = userById.get(account.owner_user_id);
        if (owner?.email) updates.owner_email = owner.email;
      }

      if (!updates.owner_email && !account.owner_email) {
        warnings.push({ id: account.id, business_name: account.business_name, warning: 'Missing owner email' });
      }

      if (!account.vendor_display_name) updates.vendor_display_name = account.business_name || '';
      if (!account.legal_business_name) updates.legal_business_name = account.business_name || '';
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

      const finalNumber = updates.vendor_account_number || account.vendor_account_number;
      const finalSlug = updates.vendor_slug || account.vendor_slug;
      const reservationKey = `${finalNumber || ''}|${finalSlug || ''}`;

      if (finalNumber && finalSlug && !reservationKeys.has(reservationKey)) {
        await base44.asServiceRole.entities.VendorAccountIdentityReservation.create({
          vendor_account_id: account.id,
          vendor_account_number: finalNumber,
          vendor_slug: finalSlug,
          business_name_at_assignment: account.business_name || account.vendor_display_name || '',
          owner_user_id: account.owner_user_id || '',
          owner_email: updates.owner_email || account.owner_email || '',
          status: 'assigned',
          reserved_at: new Date().toISOString(),
        });
        reservationKeys.add(reservationKey);
        createdReservations.push({ vendor_account_id: account.id, vendor_account_number: finalNumber, vendor_slug: finalSlug });
      }

      if (Object.keys(updates).length) {
        await base44.asServiceRole.entities.VendorAccount.update(account.id, updates);
        repaired.push({ id: account.id, business_name: account.business_name, updates });
      }
    }

    console.log('repairVendorAccounts complete', { repaired: repaired.length, warnings: warnings.length, reservations: createdReservations.length });
    return Response.json({ repaired_count: repaired.length, warnings_count: warnings.length, reservation_count: createdReservations.length, repaired, warnings, createdReservations });
  } catch (error) {
    console.error('repairVendorAccounts failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});