import React from "react";
import { Button } from "@/components/ui/button";
import StepOne from "../components/create/StepOne";
import StepTwo from "../components/create/StepTwo";
import StepThree from "../components/create/StepThree";
import ResidentialPaymentStep from "../components/payment/ResidentialPaymentStep";
import AdminAssignUserStep from "../components/admin/AdminAssignUserStep";

export default function CreateListingResidential({
  step,
  setStep,
  formData,
  setFormData,
  setGeocodeRef,
  user,
  reservedDates,
  isAdminCreate,
  selectedUserForAdmin,
  setSelectedUserForAdmin,
  regularAddressIncomplete,
  isGlobalDemoMode,
  isStartingPayment,
  paymentError,
  setPaymentError,
  createListingPending,
  handleNext,
  handleSubmit,
  handlePaymentStepSubmit,
  handleAdminCreateSubmit,
  residentialAmount,
}) {
  const paymentStepNumber = 4;
  const entryStepNumber = 3;

  return (
    <>
      {step === 1 && <StepOne formData={formData} setFormData={setFormData} />}
      {step === 2 && <StepTwo formData={formData} setFormData={setFormData} onGeocodeRef={setGeocodeRef} user={user} />}
      {step === 3 && <StepThree formData={formData} setFormData={setFormData} reservedDates={reservedDates} />}
      {step === 4 && (
        isAdminCreate ? (
          <AdminAssignUserStep selectedUser={selectedUserForAdmin} setSelectedUser={setSelectedUserForAdmin} />
        ) : (
          <ResidentialPaymentStep
            tier={formData.tier}
            amount={residentialAmount}
            listing={formData}
            isDemoMode={isGlobalDemoMode}
            isProcessing={isStartingPayment}
            errorMessage={paymentError}
            user={user}
            onBack={() => {
              setPaymentError("");
              setStep(3);
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
              disabled={step === 2 && regularAddressIncomplete}
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
                : ["featured", "premium"].includes(formData.tier)
                ? "Continue to Payment →"
                : "Publish Listing 🎉"}
            </Button>
          )}
        </div>
      )}
    </>
  );
}