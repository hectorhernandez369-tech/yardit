// Yardit-owned native adapter contract; NOT a built-in Base44 API.
// A native build must install this adapter before React starts. See src/docs/ios-website-checkout.md.
export function checkoutPlatform(win = globalThis.window, nav = globalThis.navigator) {
  const adapter = win?.YarditNativeCheckout;
  if (adapter?.version === 1 && adapter.platform === "ios") return "ios";
  if (adapter?.version === 1 && adapter.platform === "android") return "android";
  // Unknown embedded iOS contexts must never silently use the web/Stripe fallback.
  const ua = nav?.userAgent || "";
  const apple = /iPhone|iPad|iPod/i.test(ua) || (nav?.platform === "MacIntel" && nav?.maxTouchPoints > 1);
  const pwa = nav?.standalone === true || win?.matchMedia?.("(display-mode: standalone)")?.matches;
  if (apple && !pwa && (!/Safari\//i.test(ua) || win?.ReactNativeWebView)) return "ios-unconfigured";
  return /Android/i.test(ua) && /\bwv\b/.test(ua) ? "android" : "web";
}
export function requireIosCheckoutAdapter(win = globalThis.window) {
  const adapter = win?.YarditNativeCheckout;
  if (adapter?.version !== 1 || adapter.platform !== "ios" || typeof adapter.openExternalBrowser !== "function") {
    throw new Error("Website checkout is not available in this app version yet. Please update Yardit or contact support. Your draft is saved.");
  }
  return adapter;
}
export const isIosCheckout = () => checkoutPlatform().startsWith("ios");
export const checkoutLabel = (defaultLabel = "Continue to Stripe") => isIosCheckout() ? "Continue to website payment" : defaultLabel;
