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
  const cancelled = useRef(false);

  const finish = useCallback(async () => {
    if (running.current || cancelled.current) return;
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
      if (cancelled.current) return;
      const verified = await timeout(base44.functions.invoke("residentialStripeCheckout", { action: "verify", session_id: exactSessionId }));
      if (cancelled.current) return;
      if (!verified?.data?.stripe_paid) throw new Error(FAILURE);
      let listingId = verified.data.listing_id;
      if (!listingId) {
        const saved = loadPaidCheckout();
        if (!saved?.formData) throw new Error(FAILURE);
        if (cancelled.current) return;
        const created = await timeout(base44.functions.invoke("saveResidentialListing", { action: "create", data: buildPaidListingPayload(saved.formData, user, exactSessionId) }));
        listingId = created?.data?.listing?.id;
      }
      if (!listingId) throw new Error(FAILURE);
      if (cancelled.current) return;
      await timeout(base44.functions.invoke("residentialStripeCheckout", { action: "link_paid_listing", session_id: exactSessionId, listing_id: listingId }));
      if (cancelled.current) return;
      localStorage.removeItem(PAID_LISTING_CHECKOUT_KEY);
      window.history.replaceState({}, "", createPageUrl("CreateListing"));
      navigate(createPageUrl("MyListings"), { replace: true });
    } catch {
      running.current = false;
      if (!cancelled.current) setState({ status: "failed", message: FAILURE });
    }
  }, [navigate, sessionId]);

  const cancel = useCallback(async () => {
    const saved = loadPaidCheckout();
    if (!saved?.formData) {
      setState({ status: "failed", message: "Your listing details are unavailable. Please check My Listings before trying another payment." });
      return;
    }
    cancelled.current = true;
    setState({ status: "saving", message: "Saving your draft..." });
    try {
      const user = await base44.auth.me();
      const data = saved.formData;
      const step = data.listingType === "event" ? 4 : 3;
      const draft = await base44.entities.ListingDraft.create({
        owner_user_id: user.id,
        listing_type: data.listingType,
        title: data.event_name || data.title || "Listing draft",
        tier: data.event_tier || data.tier || "",
        last_step: step,
        data_json: JSON.stringify(data),
        status: "active",
        saved_reason: "in_progress",
      });
      localStorage.setItem("yardit_listing_draft_resume_v1", JSON.stringify({ draftId: draft.id, step, formData: data }));
      localStorage.removeItem(PAID_LISTING_CHECKOUT_KEY);
      localStorage.removeItem("yardit_neighborhood_setup_v1");
      window.history.replaceState({}, "", createPageUrl("CreateListing"));
      navigate(`${createPageUrl("CreateListing")}?draft=1`, { replace: true });
    } catch {
      cancelled.current = false;
      setState({ status: "failed", message: "We couldn't save your draft. Please try again before leaving this page." });
    }
  }, [navigate]);

  useEffect(() => { finish(); }, [finish]);
  return { ...state, retry: finish, cancel };
}