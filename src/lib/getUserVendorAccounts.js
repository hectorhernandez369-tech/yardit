import { base44 } from "@/api/base44Client";

const isDev = () => Boolean(import.meta.env?.DEV);
const activeAuthorizedStatuses = new Set(["active", "accepted", "approved"]);

async function lookupVendorSource(source, lookupFn, failures) {
  try {
    return await lookupFn();
  } catch (error) {
    failures.push({ source, message: error?.message || "Lookup failed" });
    return [];
  }
}

/**
 * Single source of truth for active vendor account access.
 * Access is granted by owner_user_id, owner_email, legacy email owner_user_id, or active/accepted/approved VendorAuthorizedUser.
 */
export async function getUserVendorAccounts(user) {
  if (!user?.id || !user?.email) return [];

  const failures = [];
  const accessReasons = new Map();

  const [byUserId, byEmail, byLegacyEmail, authorizedLinks] = await Promise.all([
    lookupVendorSource("owner_user_id", () => base44.entities.VendorAccount.filter({ owner_user_id: user.id }), failures),
    lookupVendorSource("owner_email", () => base44.entities.VendorAccount.filter({ owner_email: user.email }), failures),
    lookupVendorSource("legacy_owner_user_id_email", () => base44.entities.VendorAccount.filter({ owner_user_id: user.email }), failures),
    lookupVendorSource("VendorAuthorizedUser", () => base44.entities.VendorAuthorizedUser.filter({ authorized_email: user.email }), failures),
  ]);

  const activeAuthorizedLinks = authorizedLinks.filter((a) => activeAuthorizedStatuses.has(a.status));
  const authorizedAccountIds = activeAuthorizedLinks.map((a) => a.vendor_account_id).filter(Boolean);

  const seen = new Set();
  const all = [];
  const addAccounts = (accounts, reason) => {
    for (const acct of accounts) {
      if (!acct?.id) continue;
      if (!accessReasons.has(acct.id)) accessReasons.set(acct.id, new Set());
      accessReasons.get(acct.id).add(reason);
      if (!seen.has(acct.id)) {
        seen.add(acct.id);
        all.push(acct);
      }
    }
  };

  addAccounts(byUserId, "owner_user_id");
  addAccounts(byEmail, "owner_email");
  addAccounts(byLegacyEmail, "legacy_owner_user_id_email");

  if (authorizedAccountIds.length > 0) {
    const extra = await Promise.all(
      authorizedAccountIds
        .filter((id) => !seen.has(id))
        .map((id) => lookupVendorSource(`authorized_account:${id}`, () => base44.entities.VendorAccount.filter({ id }), failures))
    );
    for (const results of extra) addAccounts(results, "VendorAuthorizedUser");
  }

  if (failures.length > 0) {
    if (isDev()) {
      console.warn("VENDOR_ACCESS_DEBUG failed lookup source", { userId: user.id, userEmail: user.email, failures });
    }
    const error = new Error("Unable to verify vendor access");
    error.lookupFailures = failures;
    throw error;
  }

  const activeAccounts = all.filter((a) => a.is_active !== false);

  if (isDev()) {
    console.log("VENDOR_ACCESS_DEBUG result", {
      userId: user.id,
      userEmail: user.email,
      vendorAccountsFound: activeAccounts.length,
      accountIds: activeAccounts.map((a) => a.id),
      accessReason: activeAccounts.map((a) => ({
        accountId: a.id,
        reasons: Array.from(accessReasons.get(a.id) || []),
      })),
    });
  }

  return activeAccounts;
}