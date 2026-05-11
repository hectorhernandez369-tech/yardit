import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const START_NUMBER = 100001;

function getExistingNumber(account) {
  return account.vendor_account_number || account.account_number || '';
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const accounts = await base44.asServiceRole.entities.VendorAccount.list();
    const users = await base44.asServiceRole.entities.User.list();
    const userById = new Map(users.map((item) => [item.id, item]));
    const usedNumbers = new Set();

    accounts.forEach((account) => {
      const match = /^VND-(\d+)$/.exec(getExistingNumber(account));
      if (match) usedNumbers.add(Number(match[1]));
    });

    const repaired = [];
    const warnings = [];

    for (const account of accounts) {
      const updates = {};
      const currentNumber = getExistingNumber(account);

      if (!currentNumber || !/^VND-\d+$/.test(currentNumber)) {
        const generated = nextAccountNumber(usedNumbers);
        updates.vendor_account_number = generated;
        updates.account_number = generated;
      } else {
        updates.vendor_account_number = currentNumber;
        updates.account_number = currentNumber;
      }

      if (!account.owner_email && account.owner_user_id) {
        const owner = userById.get(account.owner_user_id);
        if (owner?.email) updates.owner_email = owner.email;
      }

      if (!updates.owner_email && !account.owner_email) {
        warnings.push({ id: account.id, business_name: account.business_name, warning: 'Missing owner email' });
      }

      if (!account.vendor_tier) updates.vendor_tier = 'free';
      if (!account.subscription_status) updates.subscription_status = 'active';
      if (account.is_active === undefined || account.is_active === null) updates.is_active = true;

      if (Object.keys(updates).length) {
        await base44.asServiceRole.entities.VendorAccount.update(account.id, updates);
        repaired.push({ id: account.id, business_name: account.business_name, updates });
      }
    }

    console.log('repairVendorAccounts complete', { repaired: repaired.length, warnings: warnings.length });
    return Response.json({ repaired_count: repaired.length, warnings_count: warnings.length, repaired, warnings });
  } catch (error) {
    console.error('repairVendorAccounts failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});