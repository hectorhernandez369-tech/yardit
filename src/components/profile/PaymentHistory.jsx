import React from "react";
import ResidentialBillingList from "@/components/billing/ResidentialBillingList";

export default function PaymentHistory({ payments, locations, isLoading }) {
  return (
    <ResidentialBillingList
      transactions={payments}
      listings={locations}
      isLoading={isLoading}
      variant="profile"
      emptyMessage="Your residential payment history will appear here after you create a paid listing."
    />
  );
}