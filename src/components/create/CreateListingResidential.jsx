import React from "react";
import StepOne from "./StepOne";
import StepTwo from "./StepTwo";
import StepThree from "./StepThree";
import ResidentialPaymentStep from "../payment/ResidentialPaymentStep";
import AdminAssignUserStep from "../admin/AdminAssignUserStep";

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
  isGlobalDemoMode,
  isStartingPayment,
  paymentError,
  setPaymentError,
  setStep,
  handlePaymentStepSubmit,
  residentialTierPrices,
  onAddressSelected,
}) {
  if (step === 1) {
    return <StepOne formData={formData} setFormData={setFormData} />;
  }

  if (step === 2) {
    return <StepTwo formData={formData} setFormData={setFormData} onGeocodeRef={setGeocodeRef} user={user} onAddressSelected={onAddressSelected} />;
  }

  if (step === 3) {
    return (
      <StepThree
        formData={formData}
        setFormData={setFormData}
        reservedDates={reservedDates}
      />
    );
  }

  if (step === 4) {
    if (isAdminCreate) {
      return <AdminAssignUserStep selectedUser={selectedUserForAdmin} setSelectedUser={setSelectedUserForAdmin} />;
    }

    return (
      <ResidentialPaymentStep
        tier={formData.tier}
        amount={residentialTierPrices[formData.tier] || 0}
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
    );
  }

  return null;
}