import React from "react";
import EventDetailsStep from "./event/EventDetailsStep";
import EventLocationStep from "./event/EventLocationStep";
import EventScheduleStep from "./event/EventScheduleStep";
import EventAddOnsStep from "./event/EventTierStep";
import ResidentialPaymentStep from "../payment/ResidentialPaymentStep";
import AdminAssignUserStep from "../admin/AdminAssignUserStep";
import { getResidentialEventPriceBreakdown } from "@/lib/eventListingConfig";

export default function CreateListingEvent({
  step,
  formData,
  setFormData,
  isAdminCreate,
  selectedUserForAdmin,
  setSelectedUserForAdmin,
  isGlobalDemoMode,
  isStartingPayment,
  paymentError,
  setPaymentError,
  setStep,
  handlePaymentStepSubmit,
}) {
  const eventPriceBreakdown = getResidentialEventPriceBreakdown(formData);
  if (step === 1) {
    return <EventDetailsStep formData={formData} setFormData={setFormData} />;
  }

  if (step === 2) {
    return <EventLocationStep formData={formData} setFormData={setFormData} />;
  }

  if (step === 3) {
    return <EventScheduleStep formData={formData} setFormData={setFormData} />;
  }

  if (step === 4) {
    return <EventAddOnsStep formData={formData} setFormData={setFormData} />;
  }

  if (step === 5) {
    if (isAdminCreate) {
      return <AdminAssignUserStep selectedUser={selectedUserForAdmin} setSelectedUser={setSelectedUserForAdmin} />;
    }

    return (
      <ResidentialPaymentStep
        tier="event"
        amount={eventPriceBreakdown.total}
        listing={formData}
        purchaseName="Residential Event"
        priceBreakdown={eventPriceBreakdown}
        summaryItems={[
          { label: "Base Price", value: "$9.99" },
          { label: "Selected Add-Ons", value: eventPriceBreakdown.addOns.length ? eventPriceBreakdown.addOns.map((item) => `${item.label} ${item.price ? `($${(item.price / 100).toFixed(2)})` : ""}`).join(", ") : "None" },
          { label: "Total", value: `$${(eventPriceBreakdown.total / 100).toFixed(2)}` },
        ]}
        benefits={["Event detail page", "Featured-level visibility", "Basic event card", "Standard category icon", "Event map pin", "One-day event listing"]}
        isDemoMode={isGlobalDemoMode}
        isProcessing={isStartingPayment}
        errorMessage={paymentError}
        onBack={() => {
          setPaymentError("");
          setStep(4);
        }}
        onPay={handlePaymentStepSubmit}
        promoEnabled={false}
        requireNonRefundAcknowledgement={true}
      />
    );
  }

  return null;
}