import React from "react";
import CreateListing from "@/pages/CreateListing";
import PaidCheckoutReturn from "@/pages/PaidCheckoutReturn";
import { loadPaidCheckout } from "@/lib/paidListingReturn";

export default function CreateListingEntry() {
  const params = new URLSearchParams(window.location.search);
  const savedCheckout = loadPaidCheckout();
  const isPaidReturn = (params.get("payment") === "success" && Boolean(params.get("session_id"))) || (params.get("payment") !== "cancel" && Boolean(savedCheckout?.formData));
  return isPaidReturn ? <PaidCheckoutReturn /> : <CreateListing />;
}