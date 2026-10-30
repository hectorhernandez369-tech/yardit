import React from "react";
import StepOne from "./StepOne";
import StepTwo from "./StepTwo";
import StepThree from "./StepThree";
import NeighborhoodSetupStep from "../payment/NeighborhoodSetupStep";
import AdminAssignUserStep from "../admin/AdminAssignUserStep";
import DeveloperReviewStep from "@/components/developer/DeveloperReviewStep";

export default function CreateListingNeighborhood({
  step,
  formData,
  setFormData,
  setGeocodeRef,
  user,
  reservedDates,
  isAdminCreate,
  selectedUserForAdmin,
  setSelectedUserForAdmin,
  isStartingPayment,
  paymentError,
  paymentRetryReady,
  setPaymentError,
  setStep,
  handleNeighborhoodSetupSubmit,
  onCancelPayment,
  isDeveloperMode = false,
  onDeveloperPublish,
}) {
  if (step === 1) {
    return <StepOne formData={formData} setFormData={setFormData} />;
  }

  if (step === 2) {
    return <StepTwo formData={formData} setFormData={setFormData} onGeocodeRef={setGeocodeRef} user={user} isDeveloperMode={isDeveloperMode} />;
  }

  if (step === 3) {
    return <StepThree formData={formData} setFormData={setFormData} reservedDates={reservedDates} isDeveloperMode={isDeveloperMode} />;
  }

  if (step === 4) {
    if (isDeveloperMode) return <DeveloperReviewStep listing={formData} onPublish={onDeveloperPublish} onBack={() => setStep(3)} isProcessing={isStartingPayment} errorMessage={paymentError} />;
    if (isAdminCreate) {
      return <AdminAssignUserStep selectedUser={selectedUserForAdmin} setSelectedUser={setSelectedUserForAdmin} />;
    }

    return (
      <NeighborhoodSetupStep
        isProcessing={isStartingPayment}
        errorMessage={paymentError}
        retryPayment={paymentRetryReady}
        onBack={onCancelPayment}
        onSetup={handleNeighborhoodSetupSubmit}
        formData={formData}
        setFormData={setFormData}
        user={user}
      />
    );
  }

  return null;
}