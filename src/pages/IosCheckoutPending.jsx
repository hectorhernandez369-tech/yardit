import React, { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { IOS_PENDING_KEY, restoreCheckoutContext, saveCheckoutContext } from "@/lib/websiteCheckout";
import { requireIosCheckoutAdapter } from "@/lib/checkoutPlatform";
import { CheckoutCard, checkoutButtonClass } from "./IosWebsiteCheckout";

export default function IosCheckoutPending() {
  const id = localStorage.getItem(IOS_PENDING_KEY);
  const [message, setMessage] = useState(id ? "Checking your checkout with Stripe…" : "No pending checkout was found on this device. Open Yardit on the device where you started payment.");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const finished = useRef(false);
  const check = useCallback(async (action = "status") => {
    if (!id || running.current || finished.current) return;
    running.current = true; setBusy(true);
    try {
      await saveCheckoutContext(id);
      const { data } = await base44.functions.invoke("iosWebsiteCheckout", { action, handoff_id: id });
      if (data.verified || data.canceled) {
        if (!data.resume_path?.startsWith("/") || data.resume_path.startsWith("//")) throw new Error("Invalid checkout return.");
        restoreCheckoutContext(data.context);
        finished.current = true;
        localStorage.removeItem(IOS_PENDING_KEY);
        window.location.replace(data.resume_path);
        return;
      }
      setMessage("Waiting for confirmation. Finish checkout in your browser, then return here. If you already paid, do not start another payment.");
    } catch (e) {
      setMessage(e?.response?.data?.error || "We could not confirm checkout yet. Sign in to the same Yardit account and check again before paying.");
    } finally { running.current = false; setBusy(false); }
  }, [id]);
  useEffect(() => {
    check();
    const timer = setInterval(() => { if (document.visibilityState === "visible") check(); }, 5000);
    const focus = () => check();
    window.addEventListener("focus", focus);
    return () => { clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [check]);
  const reopen = async () => {
    if (running.current) return;
    running.current = true; setBusy(true);
    try {
      const adapter = requireIosCheckoutAdapter();
      const { data } = await base44.functions.invoke("iosWebsiteCheckout", { action: "reopen", handoff_id: id });
      const opened = await adapter.openExternalBrowser(data.checkout_url);
      if (opened !== true) throw new Error("The browser did not open. Please try again.");
    } catch (e) { setMessage(e?.response?.data?.error || e.message); }
    finally { running.current = false; setBusy(false); }
  };
  return <CheckoutCard title="Finish website checkout">
    <p role="status">{message}</p>
    {id && <>
      <button className={checkoutButtonClass} disabled={busy} onClick={() => check()}>Check payment status</button>
      <button className="w-full rounded-lg border p-3" disabled={busy} onClick={reopen}>Reopen the same checkout</button>
      <button className="w-full text-sm underline" disabled={busy} onClick={() => check("cancel")}>Cancel unpaid checkout and return</button>
    </>}
    <a className="block text-center text-teal-700 underline" href="/">Back to Yardit</a>
  </CheckoutCard>;
}
