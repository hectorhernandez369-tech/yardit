import React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ListingCreationActions({ step, setStep, paymentStepNumber, entryStepNumber, isAdminCreate, isAssistedPost, isDeveloperMode, listingType, tier, regularAddressIncomplete, userHasVerifiedPrimaryAddress, isStartingPayment, isCreating, selectedUserForAdmin, onNext, onSubmit, onAdminCreate }) {
  const continuing = isAdminCreate ? step < paymentStepNumber : step < entryStepNumber;
  const nextDisabled = !isDeveloperMode && step === 2 && listingType !== "neighborhood_sale" && listingType !== "event" && (isAssistedPost ? regularAddressIncomplete : regularAddressIncomplete && !userHasVerifiedPrimaryAddress);
  const publishLabel = isStartingPayment ? (listingType === "neighborhood_sale" ? "Saving Payment Method..." : "Starting Payment...")
    : isCreating ? "Creating..."
    : isAdminCreate && step === paymentStepNumber ? "Create Listing (Admin)"
    : isAdminCreate && step === entryStepNumber ? "Continue to Assign User"
    : isAssistedPost ? (listingType === "halloween_spot" ? "Create Assisted Halloween Spot 🎃" : listingType === "event" ? "Create Assisted Event" : "Create Assisted Yard Sale")
    : isDeveloperMode ? (listingType === "halloween_spot" ? "Publish without payment" : "Review listing →")
    : listingType === "event" ? "Continue to Payment →"
    : listingType === "halloween_spot" ? "Publish Halloween Spot 🎃"
    : listingType === "neighborhood_sale" ? "Continue to Payment Setup →"
    : ["featured", "premium"].includes(tier) ? "Continue to Payment →" : "Publish Listing 🎉";
  const publish = () => {
    if (isAdminCreate && step === paymentStepNumber) {
      if (!selectedUserForAdmin) { toast.error("Please assign a user."); return; }
      onAdminCreate();
    } else onSubmit();
  };
  return (
    <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
      {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl h-11">← Back</Button>}
      {continuing ? <Button onClick={isAdminCreate && step === entryStepNumber ? () => setStep(paymentStepNumber) : onNext} disabled={nextDisabled} className="flex-1 bg-[#006168] hover:bg-[#004d52] text-white rounded-xl h-11 font-semibold shadow-sm">Continue →</Button>
        : <Button onClick={publish} disabled={isCreating || isStartingPayment} className="flex-1 bg-[#006168] hover:bg-[#004d52] text-white rounded-xl h-11 font-semibold shadow-sm">{publishLabel}</Button>}
    </div>
  );
}