import React from "react";
import { useLocation, Link } from "react-router-dom";
import IosWebsiteCheckout from "@/pages/IosWebsiteCheckout";
import IosWebsiteCheckoutReturn from "@/pages/IosWebsiteCheckoutReturn";
import IosCheckoutPending from "@/pages/IosCheckoutPending";
import { IOS_PENDING_KEY } from "@/lib/websiteCheckout";
export default function CheckoutRoutes({ children }) {
  const { pathname } = useLocation();
  if (pathname === "/IosWebsiteCheckout") return <IosWebsiteCheckout />;
  if (pathname === "/IosWebsiteCheckoutReturn") return <IosWebsiteCheckoutReturn />;
  if (pathname === "/IosCheckoutPending") return <IosCheckoutPending />;
  return <>
    {localStorage.getItem(IOS_PENDING_KEY) && <div className="relative z-50 bg-teal-50 p-3 text-center"><Link className="text-teal-800 font-semibold underline" to="/IosCheckoutPending">Finish website checkout</Link></div>}
    {children}
  </>;
}
