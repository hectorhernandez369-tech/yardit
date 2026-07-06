import { base44 } from "@/api/base44Client";

export const isLeagueTeamAccount = (account) => account?.organization_type === "league_team";
export const isVendorDashboardAccount = (account) => !isLeagueTeamAccount(account);

const filterByOrganizerType = (accounts, organizerType) => {
  if (organizerType === "league_team") return accounts.filter(isLeagueTeamAccount);
  if (organizerType === "vendor_event") return accounts.filter(isVendorDashboardAccount);
  return accounts;
};

/**
 * Find all active vendor accounts for a user.
 * Checks owner_user_id, owner_email, and VendorAuthorizedUser records.
 */
export async function getUserVendorAccounts(user, options = {}) {
  if (!user?.id && !user?.email) return [];

  const [byUserId, byEmail, byLegacyEmail, authorizedLinks] = await Promise.all([
    user?.id
      ? base44.entities.VendorAccount.filter({ owner_user_id: user.id }).catch(() => [])
      : Promise.resolve([]),
    user?.email
      ? base44.entities.VendorAccount.filter({ owner_email: user.email }).catch(() => [])
      : Promise.resolve([]),
    // Legacy: some old records stored email in owner_user_id
    user?.email
      ? base44.entities.VendorAccount.filter({ owner_user_id: user.email }).catch(() => [])
      : Promise.resolve([]),
    user?.email
      ? base44.entities.VendorAuthorizedUser.filter({ authorized_email: user.email }).catch(() => [])
      : Promise.resolve([]),
  ]);

  // Only include authorized links where the user is still active (not removed/inactive)
  const activeAuthorizedLinks = authorizedLinks.filter((a) => a.status === "active" || a.status === "accepted");
  const authorizedAccountIds = activeAuthorizedLinks.map((a) => a.vendor_account_id).filter(Boolean);

  // Merge all results, deduplicate by id
  const seen = new Set();
  const all = [];
  for (const acct of [...byUserId, ...byEmail, ...byLegacyEmail]) {
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

  return filterByOrganizerType(all.filter((a) => a.is_active !== false), options.organizerType);
}