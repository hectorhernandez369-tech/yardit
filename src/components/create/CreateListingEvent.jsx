import React from "react";
import EventDetailsStep from "./event/EventDetailsStep";
import EventLocationStep from "./event/EventLocationStep";
import EventScheduleStep from "./event/EventScheduleStep";
import EventTierStep from "./event/EventTierStep";
import MarqueeSlotsEditor from "./event/MarqueeSlotsEditor";
import ResidentialPaymentStep from "../payment/ResidentialPaymentStep";
import AdminAssignUserStep from "../admin/AdminAssignUserStep";

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
  eventTierPrices,
}) {
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
    return (
      <div className="space-y-6">
        <EventTierStep formData={formData} setFormData={setFormData} />
        {(formData.event_tier || formData.tier) === "marquee" && (
          <MarqueeSlotsEditor
            value={formData.marquee_schedule_slots || []}
            onChange={(slots) => setFormData((prev) => ({ ...prev, marquee_schedule_slots: slots }))}
            eventStartDate={formData.event_start_date}
            eventEndDate={formData.event_end_date}
          />
        )}
      </div>
    );
  }

  if (step === 5) {
    if (isAdminCreate) {
      return <AdminAssignUserStep selectedUser={selectedUserForAdmin} setSelectedUser={setSelectedUserForAdmin} />;
    }

    return (
      <ResidentialPaymentStep
        tier={formData.event_tier}
        amount={eventTierPrices[formData.event_tier] || 0}
        listing={formData}
        isDemoMode={isGlobalDemoMode}
        isProcessing={isStartingPayment}
        errorMessage={paymentError}
        onBack={() => {
          setPaymentError("");
          setStep(4);
        }}
        onPay={handlePaymentStepSubmit}
      />
    );
  }

  return null;
}