export const getVendorPortalSessionKey = (accountId, userEmail) => `yardit_vendor_portal_${accountId}_${userEmail || "unknown"}`;

export async function hashVendorPasscode(passcode) {
  const encoder = new TextEncoder();
  const data = encoder.encode(passcode);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hasValidVendorPortalSession(accountId, userEmail) {
  const raw = sessionStorage.getItem(getVendorPortalSessionKey(accountId, userEmail));
  if (!raw) return false;
  const session = JSON.parse(raw);
  return session.expiresAt && new Date(session.expiresAt) > new Date();
}

export function saveVendorPortalSession(accountId, userEmail) {
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  sessionStorage.setItem(getVendorPortalSessionKey(accountId, userEmail), JSON.stringify({ expiresAt }));
}