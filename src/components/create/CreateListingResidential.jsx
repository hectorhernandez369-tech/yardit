import React from "react";
import StepOne from "./StepOne";
import StepTwo from "./StepTwo";
import StepThree from "./StepThree";
import ResidentialPaymentStep from "../payment/ResidentialPaymentStep";
import AdminAssignUserStep from "../admin/AdminAssignUserStep";
import DeveloperReviewStep from "@/components/developer/DeveloperReviewStep";

export default function CreateListingResidential({
  step,
  formData,
  setFormData,
  setGeocodeRef,
  user,
  reservedDates,
  isAdminCreate,
  selectedUserForAdmin,
  setSelectedUserForAdmin,
  isAdminDemoMode,
  isStartingPayment,
  paymentError,
  paymentRetryReady,
  setPaymentError,
  setStep,
  handlePaymentStepSubmit,
  onCancelPayment,
  residentialTierPrices,
  onAddressSelected,
  onResidentialConflictInteraction,
  isAssistedPost = false,
  isDeveloperMode = false,
  onDeveloperPublish,
}) {
  if (step === 1) {
    return <StepOne formData={formData} setFormData={setFormData} />;
  }

  if (step === 2) {
    return <StepTwo formData={formData} setFormData={setFormData} onGeocodeRef={setGeocodeRef} user={user} onAddressSelected={onAddressSelected} canEditAddressOverride={isAssistedPost || isDeveloperMode} />;
  }

  if (step === 3) {
    return (
      <StepThree
        formData={formData}
        setFormData={setFormData}
        reservedDates={reservedDates}
        onResidentialConflictInteraction={onResidentialConflictInteraction}
        isDeveloperMode={isDeveloperMode}
      />
    );
  }

  if (step === 4) {
    if (isDeveloperMode) return <DeveloperReviewStep listing={formData} onPublish={onDeveloperPublish} onBack={() => setStep(3)} isProcessing={isStartingPayment} errorMessage={paymentError} />;
    if (isAdminCreate) {
      return <AdminAssignUserStep selectedUser={selectedUserForAdmin} setSelectedUser={setSelectedUserForAdmin} />;
    }

    return (
      <ResidentialPaymentStep
        tier={formData.tier}
        amount={residentialTierPrices[formData.tier] || 0}
        listing={formData}
        isDemoMode={isAdminDemoMode}
        isProcessing={isStartingPayment}
        errorMessage={paymentError}
        retryPayment={paymentRetryReady}
        user={user}
        onBack={onCancelPayment}
        onPay={handlePaymentStepSubmit}
      />
    );
  }

  return null;
}