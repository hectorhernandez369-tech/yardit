import { createClientFromRequest } from "npm:@base44/sdk@0.8.57";
import Stripe from "npm:stripe@18.5.0";

const ORIGIN = "https://yardit.app";
const ALLOWED = new Set(["residentialStripeCheckout", "createResidentialListingCheckout", "createListingUpgradeCheckout", "neighborhoodSaleSetupCheckout", "createNeighborhoodSaleSetup", "createVendorSubscriptionCheckout", "createVendorEventPromotionCheckout"]);
const KEYS = ["yardit_paid_listing_checkout_v1", "yardit_neighborhood_setup_v1", "yardit_listing_upgrade_checkout_v1"];
const contextKey = (name) => name === "createListingUpgradeCheckout" ? KEYS[2] : ["neighborhoodSaleSetupCheckout", "createNeighborhoodSaleSetup"].includes(name) ? KEYS[1] : ["residentialStripeCheckout", "createResidentialListingCheckout"].includes(name) ? KEYS[0] : null;
const response = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const hash = async (token) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)))).map(b => b.toString(16).padStart(2, "0")).join("");
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, "0")).join("");
function returnLink() {
  const value = Deno.env.get("IOS_CHECKOUT_RETURN_URL") || "";
  // Deployment-controlled URL must be registered and tested in the signed native build.
  if (!value) return "";
  const url = new URL(value);
  if (url.username || url.password || !((url.protocol === "https:" && url.hostname === "yardit.app" && url.pathname === "/IosCheckoutPending") || (url.protocol === "yardit:" && url.hostname === "checkout-return"))) throw new Error("Invalid app return configuration.");
  return url.href;
}
function ready() {
  if (Deno.env.get("IOS_WEBSITE_CHECKOUT_ENABLED") !== "true" || Deno.env.get("IOS_US_ONLY_DISTRIBUTION_CONFIRMED") !== "true" || !returnLink()) {
    throw new Error("iOS website checkout is not enabled yet. Your draft has been saved.");
  }
}
function paths(name, payload) {
  if (name === "createListingUpgradeCheckout") return { return_path: "/CreateListingUpgradeReturn?payment=success", cancel_path: "/CreateListingUpgradeReturn?payment=cancel" };
  if (name === "createVendorSubscriptionCheckout") return { return_path: "/VendorDashboard?tab=tier", cancel_path: "/VendorDashboard?tab=tier" };
  if (name === "createVendorEventPromotionCheckout") {
    const path = "/VendorEventDashboard?event_id=" + encodeURIComponent(payload.vendor_event_id || "");
    return { return_path: path + "&promo_checkout=return", cancel_path: path + "&promo_checkout=cancel" };
  }
  const flag = name === "neighborhoodSaleSetupCheckout" ? "neighborhoodSetup" : name === "createNeighborhoodSaleSetup" ? "ns_setup" : "payment";
  return { return_path: "/CreateListing?" + flag + "=success", cancel_path: "/CreateListing?" + flag + "=cancel" };
}
function stripeUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com" || url.username || url.password) throw new Error("Invalid checkout destination.");
  return url.href;
}
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const records = base44.asServiceRole.entities.IosCheckoutHandoff;
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: "2025-02-24.acacia" });
    if (body.action === "return_info") return response({ app_return_url: returnLink() });
    if (body.action === "resolve") {
      if (!/^[a-f0-9]{64}$/.test(body.token || "")) return response({ error: "Invalid checkout link." }, 400);
      const rows = await records.filter({ token_hash: await hash(body.token) });
      const row = rows[0];
      if (!row || Date.parse(row.expires_at) < Date.now() || !row.session_id) return response({ error: "This checkout link has expired. Return to Yardit to check your payment." }, 410);
      const session = await stripe.checkout.sessions.retrieve(row.session_id);
      return response({ checkout_url: session.status === "open" && session.url ? stripeUrl(session.url) : null, complete: session.status === "complete", app_return_url: returnLink() });
    }
    const user = await base44.auth.me();
    if (!user?.id) return response({ error: "Please sign in to your original Yardit account." }, 401);
    if (body.action === "create") {
      ready();
      const name = body.checkout_function;
      if (!ALLOWED.has(name) || (body.payload?.action && body.payload.action !== "create")) return response({ error: "Unsupported checkout." }, 400);
      const pending = (await records.filter({ user_id: user.id, status: "pending" }))[0];
      if (pending?.session_id) return response({ error: "Finish or cancel your existing checkout first.", handoff_id: pending.id }, 409);
      const value = token();
      const row = await records.create({ user_id: user.id, token_hash: await hash(value), checkout_function: name, ...paths(name, body.payload || {}), context_json: "{}", status: "creating", expires_at: new Date(Date.now() + 24 * 3600000).toISOString() });
      const browserReturn = ORIGIN + "/IosWebsiteCheckoutReturn";
      const payload = { ...body.payload, return_url: browserReturn, successUrl: browserReturn, cancelUrl: browserReturn, owner_user_id: user.id, user_id: user.id, customer_email: user.email, user_email: user.email };
      // Authenticated client preserves the purchaser's authorization; never use service role to create checkout.
      const result = await base44.functions.invoke(name, payload);
      const data = result.data;
      if (data?.founder_vip || data?.demo) {
        await records.update(row.id, { status: "no_payment" });
        return response(data);
      }
      const sessionId = data?.sessionId || data?.session_id;
      if (!sessionId || !(data?.checkoutUrl || data?.checkout_url)) throw new Error("Checkout could not be created.");
      await records.update(row.id, { session_id: sessionId, status: "pending" });
      const link = ORIGIN + "/IosWebsiteCheckout#token=" + value;
      return response({ ...data, checkoutUrl: link, checkout_url: link, handoff_id: row.id });
    }
    const row = (await records.filter({ id: body.handoff_id, user_id: user.id }))[0];
    if (!row?.session_id) return response({ error: "Checkout not found for this account." }, 404);
    if (body.action === "save_context") {
      const key = contextKey(row.checkout_function);
      // Once captured, the snapshot is immutable. A later checkout attempt cannot
      // replace an earlier paid listing with different locally stored details.
      const saved = JSON.parse(row.context_json || "{}");
      if (!key || typeof saved[key] === "string") return response({ ok: true });
      const context = key && typeof body.context?.[key] === "string" ? { [key]: body.context[key] } : {};
      if (key && !context[key]) return response({ error: "Your saved checkout details are missing. Please reopen Yardit on the device where payment started." }, 409);
      const json = JSON.stringify(context);
      if (json.length > 200000) return response({ error: "Checkout draft is too large." }, 400);
      await records.update(row.id, { context_json: json });
      return response({ ok: true });
    }
    let session = await stripe.checkout.sessions.retrieve(row.session_id, { expand: ["setup_intent"] });
    if (body.action === "reopen") {
      ready();
      if (session.status !== "open") return response({ error: "Check the payment status before retrying." }, 409);
      const value = token();
      await records.update(row.id, { token_hash: await hash(value), expires_at: new Date(session.expires_at * 1000).toISOString() });
      return response({ checkout_url: ORIGIN + "/IosWebsiteCheckout#token=" + value });
    }
    if (body.action === "cancel" && session.status === "open") {
      // Expire before releasing the draft; a completed/racing payment cannot be discarded.
      session = await stripe.checkout.sessions.expire(session.id);
    } else if (!["status", "cancel"].includes(body.action)) return response({ error: "Invalid action." }, 400);
    let verified = session.mode === "setup"
      ? session.status === "complete" && session.setup_intent?.status === "succeeded"
      : session.status === "complete" && ["paid", "no_payment_required"].includes(session.payment_status);
    if (verified && row.checkout_function === "createVendorSubscriptionCheckout") {
      const check = await base44.functions.invoke("createVendorSubscriptionCheckout", { action: "verify", session_id: session.id });
      verified = check.data?.active === true;
    }
    if (verified && row.checkout_function === "createVendorEventPromotionCheckout") {
      const event = (await base44.asServiceRole.entities.VendorEvent.filter({ id: session.metadata?.vendor_event_id }))[0];
      verified = event?.promotion_status === "paid" && event?.stripe_checkout_session_id === session.id;
    }
    const canceled = session.status === "expired";
    const context = JSON.parse(row.context_json || "{}");
    const requiredKey = contextKey(row.checkout_function);
    if ((verified || canceled) && requiredKey && !context[requiredKey]) return response({ error: "Payment status is saved, but your draft is not available yet. Reopen the same checkout from your original device to restore it." }, 409);
    const resume = (verified ? row.return_path : row.cancel_path) + (verified ? "&session_id=" + encodeURIComponent(session.id) : "");
    await records.update(row.id, { status: verified ? "verified" : canceled ? "canceled" : "pending" });
    return response({ verified, canceled, pending: !verified && !canceled, resume_path: verified || canceled ? resume : null, context });
  } catch (error) {
    return response({ error: error?.message || "Could not confirm checkout. Please do not pay again." }, 400);
  }
});
