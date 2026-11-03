import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckoutCard, checkoutButtonClass } from "./IosWebsiteCheckout";

export default function IosWebsiteCheckoutReturn() {
  const [returnUrl, setReturnUrl] = useState("");
  useEffect(() => {
    let active = true;
    base44.functions.invoke("iosWebsiteCheckout", { action: "return_info" })
      .then(result => {
        const url = result.data?.app_return_url;
        if (active && url) { setReturnUrl(url); window.location.assign(url); }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return <CheckoutCard title="Return to Yardit">
    <p>Continue in the Yardit app. Yardit will confirm your payment or card setup with Stripe before applying any changes.</p>
    {returnUrl && <a className={checkoutButtonClass} href={returnUrl}>Return to Yardit</a>}
    <p className="text-sm text-slate-600">If the button does not open the app, open Yardit yourself and select Finish website checkout. Do not pay again while confirmation is pending.</p>
  </CheckoutCard>;
}
