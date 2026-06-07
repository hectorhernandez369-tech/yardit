import React from "react";
import { Button } from "@/components/ui/button";
import EventDetailsStep from "../components/create/event/EventDetailsStep";
import EventLocationStep from "../components/create/event/EventLocationStep";
import EventScheduleStep from "../components/create/event/EventScheduleStep";
import EventTierStep from "../components/create/event/EventTierStep";
import MarqueeSlotsEditor from "../components/create/event/MarqueeSlotsEditor";
import ResidentialPaymentStep from "../components/payment/ResidentialPaymentStep";
import AdminAssignUserStep from "../components/admin/AdminAssignUserStep";

export default function CreateListingEvent({
  step,
  setStep,
  formData,
  setFormData,
  isAdminCreate,
  selectedUserForAdmin,
  setSelectedUserForAdmin,
  isGlobalDemoMode,
  isStartingPayment,
  paymentError,
  setPaymentError,
  createListingPending,
  handleNext,
  handleSubmit,
  handlePaymentStepSubmit,
  handleAdminCreateSubmit,
  eventPaymentAmount,
}) {
  const paymentStepNumber = 5;
  const entryStepNumber = 4;

  return (
    <>
      {step === 1 && <EventDetailsStep formData={formData} setFormData={setFormData} />}
      {step === 2 && <EventLocationStep formData={formData} setFormData={setFormData} />}
      {step === 3 && <EventScheduleStep formData={formData} setFormData={setFormData} />}
      {step === 4 && (
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
      )}
      {step === 5 && (
        isAdminCreate ? (
          <AdminAssignUserStep selectedUser={selectedUserForAdmin} setSelectedUser={setSelectedUserForAdmin} />
        ) : (
          <ResidentialPaymentStep
            tier={formData.event_tier}
            amount={eventPaymentAmount}
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
        )
      )}

      {(step !== paymentStepNumber || isAdminCreate) && (
        <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl h-11"
            >
              ← Back
            </Button>
          )}
          {(isAdminCreate ? step < paymentStepNumber : step < entryStepNumber) ? (
            <Button
              onClick={isAdminCreate && step === entryStepNumber ? () => setStep(paymentStepNumber) : handleNext}
              className="flex-1 bg-[#006168] hover:bg-[#004d52] text-white rounded-xl h-11 font-semibold shadow-sm"
            >
              Continue →
            </Button>
          ) : (
            <Button
              onClick={isAdminCreate && step === paymentStepNumber ? handleAdminCreateSubmit : handleSubmit}
              disabled={createListingPending || isStartingPayment}
              className="flex-1 bg-[#006168] hover:bg-[#004d52] text-white rounded-xl h-11 font-semibold shadow-sm"
            >
              {isStartingPayment
                ? "Starting Payment..."
                : createListingPending
                ? "Creating..."
                : isAdminCreate && step === paymentStepNumber
                ? "Create Listing (Admin)"
                : isAdminCreate && step === entryStepNumber
                ? "Continue to Assign User"
                : "Continue to Payment →"}
            </Button>
          )}
        </div>
      )}
    </>
  );
}