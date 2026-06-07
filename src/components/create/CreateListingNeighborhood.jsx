import React from "react";
import StepOne from "./StepOne";
import StepTwo from "./StepTwo";
import StepThree from "./StepThree";
import NeighborhoodSetupStep from "../payment/NeighborhoodSetupStep";
import AdminAssignUserStep from "../admin/AdminAssignUserStep";

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
  setPaymentError,
  setStep,
  handleNeighborhoodSetupSubmit,
}) {
  if (step === 1) {
    return <StepOne formData={formData} setFormData={setFormData} />;
  }

  if (step === 2) {
    return <StepTwo formData={formData} setFormData={setFormData} onGeocodeRef={setGeocodeRef} user={user} />;
  }

  if (step === 3) {
    return <StepThree formData={formData} setFormData={setFormData} reservedDates={reservedDates} />;
  }

  if (step === 4) {
    if (isAdminCreate) {
      return <AdminAssignUserStep selectedUser={selectedUserForAdmin} setSelectedUser={setSelectedUserForAdmin} />;
    }

    return (
      <NeighborhoodSetupStep
        isProcessing={isStartingPayment}
        errorMessage={paymentError}
        onBack={() => {
          setPaymentError("");
          setStep(3);
        }}
        onSetup={handleNeighborhoodSetupSubmit}
      />
    );
  }

  return null;
}