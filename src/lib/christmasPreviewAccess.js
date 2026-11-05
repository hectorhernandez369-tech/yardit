// Limited Christmas preview access. Publishing is still restricted.
export const CHRISTMAS_PREVIEW_OWNER = 'hectorhernandez369@gmail.com';
export const CHRISTMAS_ASSISTED_USER_ID = '69d0704643057b42958d2749';
export function canPreviewChristmas(user) {
  return String(user?.email || '').trim().toLowerCase() === CHRISTMAS_PREVIEW_OWNER ||
    String(user?.id || '') === CHRISTMAS_ASSISTED_USER_ID;
}
export function canOwnPostChristmas(user) {
  return String(user?.email || '').trim().toLowerCase() === CHRISTMAS_PREVIEW_OWNER;
}
