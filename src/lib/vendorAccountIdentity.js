const VENDOR_ACCOUNT_PREFIX = "VND";
const VENDOR_ACCOUNT_START = 100001;

export function getVendorAccountNumber(account) {
  return account?.vendor_account_number || account?.account_number || "";
}

export function getNextVendorAccountNumber(accounts = []) {
  const used = new Set();
  let highest = VENDOR_ACCOUNT_START - 1;

  accounts.forEach((account) => {
    const value = getVendorAccountNumber(account);
    const match = /^VND-(\d+)$/.exec(String(value || "").trim());
    if (!match) return;
    const number = Number(match[1]);
    used.add(number);
    highest = Math.max(highest, number);
  });

  let next = Math.max(VENDOR_ACCOUNT_START, highest + 1);
  while (used.has(next)) next += 1;
  return `${VENDOR_ACCOUNT_PREFIX}-${next}`;
}

export function buildVendorAccountIdentityFields(user, existingAccounts = []) {
  const vendorAccountNumber = getNextVendorAccountNumber(existingAccounts);
  return {
    owner_email: user?.email || "",
    owner_user_id: user?.id || "",
    vendor_account_number: vendorAccountNumber,
    account_number: vendorAccountNumber,
    subscription_status: "active",
    is_active: true,
  };
}

export function getVendorAccountSearchText(account) {
  return [
    account?.business_name,
    account?.owner_name,
    account?.owner_email,
    getVendorAccountNumber(account),
    account?.business_phone,
    account?.phone,
    account?.business_city,
    account?.business_state,
    account?.business_zip_code,
  ].filter(Boolean).join(" ").toLowerCase();
}

export function isEligibleEventOrganizer(account) {
  return account?.is_active !== false && account?.vendor_tier === "event_organizer" && account?.subscription_status === "active";
}