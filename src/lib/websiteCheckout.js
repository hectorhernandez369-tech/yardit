import { base44 } from "@/api/base44Client";
import { checkoutPlatform, requireIosCheckoutAdapter } from "./checkoutPlatform";
export const IOS_PENDING_KEY = "yardit_ios_checkout_pending_v1";
export const CONTEXT_KEYS = ["yardit_paid_listing_checkout_v1", "yardit_neighborhood_setup_v1", "yardit_listing_upgrade_checkout_v1"];

export function ensureCheckoutCanStart() {
  if (checkoutPlatform().startsWith("ios") && localStorage.getItem(IOS_PENDING_KEY)) {
    window.location.assign("/IosCheckoutPending");
    throw new Error("Please finish or cancel your previous checkout before starting another payment.");
  }
}
let creatingCheckout = false;
export async function invokeCheckout(name, payload = {}) {
  if (payload.action && payload.action !== "create") return base44.functions.invoke(name, payload);
  const platform = checkoutPlatform();
  if (!platform.startsWith("ios")) return base44.functions.invoke(name, payload);
  requireIosCheckoutAdapter();
  ensureCheckoutCanStart();
  if (creatingCheckout) throw new Error("Checkout is already starting. Please wait.");
  creatingCheckout = true;
  try {
    const response = await base44.functions.invoke("iosWebsiteCheckout", { action: "create", checkout_function: name, payload });
    if (response?.data?.handoff_id) localStorage.setItem(IOS_PENDING_KEY, response.data.handoff_id);
    return response;
  } catch (error) {
    const id = error?.response?.data?.handoff_id;
    if (id) {
      localStorage.setItem(IOS_PENDING_KEY, id);
      window.location.assign("/IosCheckoutPending");
    }
    throw error;
  } finally { creatingCheckout = false; }
}

export async function openCheckout(url) {
  if (!checkoutPlatform().startsWith("ios")) {
    window.location.assign(url);
    return;
  }
  const adapter = requireIosCheckoutAdapter();
  const parsed = new URL(url);
  if (parsed.origin !== "https://yardit.app" || parsed.pathname !== "/IosWebsiteCheckout") throw new Error("Invalid website checkout link.");
  const id = localStorage.getItem(IOS_PENDING_KEY);
  if (!id) throw new Error("Checkout could not be saved. Please try again.");
  await saveCheckoutContext(id);
  // Never fall back to same-WebView navigation or window.open: neither guarantees an external browser.
  try {
    const opened = await adapter.openExternalBrowser(url);
    if (opened !== true) throw new Error("Browser did not open.");
  } finally {
    // Includes a retry of the SAME session if native opening fails.
    window.location.assign("/IosCheckoutPending");
  }
}
export async function saveCheckoutContext(id) {
  const context = Object.fromEntries(CONTEXT_KEYS.map(key => [key, localStorage.getItem(key)]).filter(([,value]) => value));
  await base44.functions.invoke("iosWebsiteCheckout", { action: "save_context", handoff_id: id, context });
}
export function restoreCheckoutContext(context) {
  for (const key of CONTEXT_KEYS) {
    if (typeof context?.[key] === "string") localStorage.setItem(key, context[key]);
    else localStorage.removeItem(key);
  }
}
