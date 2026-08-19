import { base44 } from "@/api/base44Client";

const LEAGUE_DASHBOARD_ORGANIZATION_TYPES = new Set(["league", "team", "league_team", "tournament_organizer"]);
const LEGACY_TEAM_NAMES = new Set(["lindsay youth football and cheer"]);
const normalize = (value) => String(value || "").trim().toLowerCase();

export const getSportsAccountType = (account) => {
  if (!account) return null;
  if (account.organization_type === "league") return "league";
  if (account.organization_type === "team") return "team";
  if (account.organization_type === "tournament_organizer") return "league";
  if (account.organization_type === "league_team" && LEGACY_TEAM_NAMES.has(normalize(account.business_name || account.vendor_display_name))) return "team";
  if (account.organization_type === "league_team") return "league";
  return null;
};

export const isLeagueAccount = (account) => getSportsAccountType(account) === "league";
export const isTeamAccount = (account) => getSportsAccountType(account) === "team";
export const isLeagueTeamAccount = (account) => LEAGUE_DASHBOARD_ORGANIZATION_TYPES.has(account?.organization_type);
export const isVendorDashboardAccount = (account) => !isLeagueTeamAccount(account);

const filterByOrganizerType = (accounts, organizerType) => {
  if (organizerType === "league") return accounts.filter(isLeagueAccount);
  if (organizerType === "team") return accounts.filter(isTeamAccount);
  if (organizerType === "league_team") return accounts.filter(isLeagueTeamAccount);
  if (organizerType === "vendor_event") return accounts.filter(isVendorDashboardAccount);
  return accounts;
};

/**
 * Find all active organizer accounts for a user.
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
    user?.email
      ? base44.entities.VendorAccount.filter({ owner_user_id: user.email }).catch(() => [])
      : Promise.resolve([]),
    user?.email
      ? base44.entities.VendorAuthorizedUser.filter({ authorized_email: user.email }).catch(() => [])
      : Promise.resolve([]),
  ]);

  const activeAuthorizedLinks = authorizedLinks.filter((a) => a.status === "active" || a.status === "accepted");
  const authorizedAccountIds = activeAuthorizedLinks.map((a) => a.vendor_account_id).filter(Boolean);

  const seen = new Set();
  const all = [];
  for (const acct of [...byUserId, ...byEmail, ...byLegacyEmail]) {
    if (acct?.id && !seen.has(acct.id)) {
      seen.add(acct.id);
      all.push(acct);
    }
  }

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