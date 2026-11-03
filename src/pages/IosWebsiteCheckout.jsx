import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export function CheckoutCard({ title, children }) {
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <section className="w-full max-w-md rounded-2xl bg-white p-7 shadow-sm space-y-5">
      <p className="font-semibold text-teal-700">Yardit</p>
      <h1 className="text-2xl font-bold">{title}</h1>{children}
    </section>
  </main>;
}
export const checkoutButtonClass = "block w-full rounded-lg bg-teal-700 px-4 py-3 text-center font-semibold text-white disabled:opacity-50";

export default function IosWebsiteCheckout() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (!token) { setError("This checkout link is incomplete. Reopen payment from Yardit."); return; }
    const meta = document.createElement("meta");
    meta.name = "referrer"; meta.content = "no-referrer"; document.head.appendChild(meta);
    base44.functions.invoke("iosWebsiteCheckout", { action: "resolve", token })
      .then(result => { if (active) setData(result.data); })
      .catch(e => { if (active) setError(e?.response?.data?.error || "Unable to open this checkout. Return to Yardit and check its status."); });
    return () => { active = false; meta.remove(); };
  }, []);
  return <CheckoutCard title="Complete your payment on Yardit's website">
    <p className="text-slate-600">Your listing details are saved in the app. Stripe securely processes this website payment.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!data && !error && <p role="status">Loading checkout…</p>}
    {data?.checkout_url && <a className={checkoutButtonClass} href={data.checkout_url} referrerPolicy="no-referrer">Continue to secure payment</a>}
    {data && !data.checkout_url && <p>This checkout is no longer open. Return to Yardit to confirm its status before starting another payment.</p>}
    {data?.app_return_url && <a className="block text-center text-teal-700 underline" href={data.app_return_url}>Return to Yardit</a>}
  </CheckoutCard>;
}
