const VENDOR_ACCOUNT_PREFIX = "VND";
const VENDOR_ACCOUNT_START = 100001;

export function normalizeVendorSearchText(value) {
  return String(value || "").toLowerCase().trim().replace(/\s+/g, " ");
}

export function getVendorAccountNumber(account) {
  return account?.vendor_account_number || account?.account_number || "";
}

export function getVendorDisplayName(account) {
  return account?.vendor_display_name || account?.business_name || "";
}

export function slugifyVendorName(name) {
  const slug = normalizeVendorSearchText(name)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "vendor";
}

export function getNextVendorAccountNumber(accounts = [], reservations = []) {
  const used = new Set();
  let highest = VENDOR_ACCOUNT_START - 1;

  [...accounts, ...reservations].forEach((item) => {
    const value = item?.vendor_account_number || item?.account_number || getVendorAccountNumber(item);
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

export function getNextVendorSlug(businessName, accounts = [], reservations = []) {
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

export function buildVendorAccountIdentityFields(user, existingAccounts = [], existingReservations = [], businessName = "") {
  const vendorAccountNumber = getNextVendorAccountNumber(existingAccounts, existingReservations);
  const vendorSlug = getNextVendorSlug(businessName, existingAccounts, existingReservations);
  return {
    owner_email: user?.email || "",
    owner_user_id: user?.id || "",
    vendor_account_number: vendorAccountNumber,
    account_number: vendorAccountNumber,
    vendor_slug: vendorSlug,
    vendor_display_name: businessName || "",
    legal_business_name: businessName || "",
    organization_type: "vendor",
    subscription_status: "active",
    is_verified_vendor: false,
    is_active: true,
    organization_user_ids: user?.id ? [user.id] : [],
    organization_staff_emails: user?.email ? [user.email] : [],
    organization_permissions: {},
    assigned_pin_ids: [],
    team_settings: {},
  };
}

export function getVendorAccountSearchText(account) {
  return normalizeVendorSearchText([
    account?.vendor_account_number,
    account?.account_number,
    account?.vendor_slug,
    account?.vendor_display_name,
    account?.business_name,
    account?.legal_business_name,
    account?.owner_name,
    account?.owner_email,
    account?.business_phone,
    account?.phone,
    account?.email,
    account?.business_category,
    account?.business_city,
    account?.business_state,
    account?.business_zip_code,
  ].filter(Boolean).join(" "));
}

export function vendorSearchMatches(account, query) {
  const terms = normalizeVendorSearchText(query).split(" ").filter(Boolean);
  if (!terms.length) return true;
  const text = getVendorAccountSearchText(account);
  return terms.every((term) => text.includes(term));
}

export const vendorMatchesSearch = vendorSearchMatches;

export function getVendorIdentityWarnings(account) {
  const warnings = [];
  if (!account?.owner_email) warnings.push("Missing Owner Email");
  if (!getVendorAccountNumber(account)) warnings.push("Missing Account Number");
  if (!account?.vendor_slug) warnings.push("Missing Vendor Slug");
  return warnings;
}

export function isEligibleEventOrganizer(account) {
  return account?.is_active !== false && account?.vendor_tier === "event_organizer" && account?.subscription_status === "active";
}