// Reversible launch gate for public Vendor Account creation.
// Reads from the public AppSetting feed (getPublicAppSettings).
// Default state is CLOSED (vendor_public_signup_enabled = false / missing).

function findSetting(settings, key) {
  const list = Array.isArray(settings) ? settings : [];
  return list.find((item) => item && item.key === key);
}

export function isVendorPublicSignupEnabled(settings) {
  const setting = findSetting(settings, "vendor_public_signup_enabled");
  return String(setting?.value || "").toLowerCase() === "true";
}

export function getVendorBetaAllowlist(settings) {
  const setting = findSetting(settings, "vendor_beta_allowlist");
  const raw = setting?.value || "";
  if (!raw) return [];
  let parsed = [];
  try {
    const json = JSON.parse(raw);
    parsed = Array.isArray(json) ? json : [json];
  } catch {
    parsed = String(raw).split(",").map((entry) => entry.trim()).filter(Boolean);
  }
  return parsed
    .map((entry) => String(entry).trim())
    .filter(Boolean)
    .flatMap((entry) => entry.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
}

export function isVendorLaunchBypassUser(user, settings) {
  if (!user) return false;
  const role = String(user.role || "").toLowerCase();
  if (role === "admin" || role === "master" || role === "super_master" || user.isAdmin === true) {
    return true;
  }
  const allowlist = getVendorBetaAllowlist(settings);
  const email = String(user.email || "").toLowerCase();
  const id = user.id || "";
  return allowlist.some((entry) => {
    const value = String(entry).toLowerCase();
    return value && (value === email || value === id);
  });
}

// Allow Vendor signup/access when ANY bypass condition is true.
export function canAccessVendorSignup({ user, settings, vendorAccounts, claimableAccounts } = {}) {
  if (vendorAccounts && vendorAccounts.length > 0) return true;
  if (claimableAccounts && claimableAccounts.length > 0) return true;
  if (isVendorLaunchBypassUser(user, settings)) return true;
  if (isVendorPublicSignupEnabled(settings)) return true;
  return false;
}