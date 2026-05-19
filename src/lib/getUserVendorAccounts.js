import { base44 } from "@/api/base44Client";

/**
 * Find all active vendor accounts for a user.
 * Checks owner_user_id, owner_email, and VendorAuthorizedUser records.
 */
export async function getUserVendorAccounts(user) {
  if (!user?.id && !user?.email) return [];

  const [byUserId, byEmail, authorizedLinks] = await Promise.all([
    user?.id
      ? base44.entities.VendorAccount.filter({ owner_user_id: user.id }).catch(() => [])
      : Promise.resolve([]),
    user?.email
      ? base44.entities.VendorAccount.filter({ owner_email: user.email }).catch(() => [])
      : Promise.resolve([]),
    user?.email
      ? base44.entities.VendorAuthorizedUser.filter({ authorized_email: user.email }).catch(() => [])
      : Promise.resolve([]),
  ]);

  // Collect all unique account IDs from authorized user links
  const authorizedAccountIds = authorizedLinks.map((a) => a.vendor_account_id).filter(Boolean);

  // Merge all results, deduplicate by id
  const seen = new Set();
  const all = [];
  for (const acct of [...byUserId, ...byEmail]) {
    if (acct?.id && !seen.has(acct.id)) {
      seen.add(acct.id);
      all.push(acct);
    }
  }

  // Fetch authorized accounts not already included
  if (authorizedAccountIds.length > 0) {
    const extra = await Promise.all(
      authorizedAccountIds
        .filter((id) => !seen.has(id))
        .map((id) => base44.entities.VendorAccount.filter({ id }).catch(() => []))
    );
    for (const results of extra) {
      for (const acct of results) {
        if (acct?.id && !seen.has(acct.id)) {
          seen.add(acct.id);
          all.push(acct);
        }
      }
    }
  }

  return all.filter((a) => a.is_active !== false);
}