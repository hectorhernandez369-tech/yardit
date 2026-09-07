import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { buildPaidListingPayload, loadPaidCheckout, PAID_LISTING_CHECKOUT_KEY } from "@/lib/paidListingReturn";

const FAILURE = "Your payment may have completed, but Yardit could not finish your listing yet. Do not pay again. Tap Retry Payment Verification.";
const timeout = (promise) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(FAILURE)), 20000))]);

export default function usePaidCheckoutReturn() {
  const navigate = useNavigate();
  const initialSessionId = new URLSearchParams(window.location.search).get("session_id") || loadPaidCheckout()?.session_id || "";
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [state, setState] = useState({ status: "processing", message: "Your payment was received. Yardit is verifying it with Stripe now." });
  const running = useRef(false);

  const finish = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setState({ status: "processing", message: "Your payment was received. Yardit is verifying it with Stripe now." });
    try {
      const user = await base44.auth.me();
      let exactSessionId = sessionId;
      if (!exactSessionId) {
        const recovered = await timeout(base44.functions.invoke("residentialStripeCheckout", { action: "recover_paid_checkout" }));
        exactSessionId = recovered?.data?.session_id || "";
        if (!recovered?.data?.stripe_paid || !exactSessionId) throw new Error(FAILURE);
        setSessionId(exactSessionId);
      }
      const verified = await timeout(base44.functions.invoke("residentialStripeCheckout", { action: "verify", session_id: exactSessionId }));
      if (!verified?.data?.stripe_paid) throw new Error(FAILURE);
      let listingId = verified.data.listing_id;
      if (!listingId) {
        const saved = loadPaidCheckout();
        if (!saved?.formData) throw new Error(FAILURE);
        const created = await timeout(base44.functions.invoke("saveResidentialListing", { action: "create", data: buildPaidListingPayload(saved.formData, user, exactSessionId) }));
        listingId = created?.data?.listing?.id;
      }
      if (!listingId) throw new Error(FAILURE);
      await timeout(base44.functions.invoke("residentialStripeCheckout", { action: "link_paid_listing", session_id: exactSessionId, listing_id: listingId }));
      localStorage.removeItem(PAID_LISTING_CHECKOUT_KEY);
      window.history.replaceState({}, "", createPageUrl("CreateListing"));
      navigate(createPageUrl("MyListings"), { replace: true });
    } catch {
      running.current = false;
      setState({ status: "failed", message: FAILURE });
    }
  }, [navigate, sessionId]);

  useEffect(() => { finish(); }, [finish]);
  return { ...state, retry: finish };
}