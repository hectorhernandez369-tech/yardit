import React from "react";
import StepOne from "./StepOne";
import StepTwo from "./StepTwo";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function CreateListingHalloween({ step, formData, setFormData, setGeocodeRef, user, onAddressSelected }) {
  if (step === 1) {
    return <StepOne formData={formData} setFormData={setFormData} />;
  }

  if (step === 2) {
    return <StepTwo formData={formData} setFormData={setFormData} onGeocodeRef={setGeocodeRef} user={user} onAddressSelected={onAddressSelected} />;
  }

  if (step === 3) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-purple-950">Halloween Spot Details</h2>
          <p className="text-sm text-slate-500">Your Halloween Spot is free. Full artwork appears after the activation time; daytime uses the small pumpkin marker.</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-slate-800">Full icon appears after</Label>
          <Input
            type="time"
            value={formData.full_icon_activation_time || "15:00"}
            onChange={(e) => setFormData((prev) => ({ ...prev, full_icon_activation_time: e.target.value }))}
            className="max-w-[180px] bg-white"
          />
          <p className="text-xs text-slate-500">Default is 3:00 PM.</p>
        </div>

        <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 text-sm text-purple-950">
          <p className="font-bold">Ready to post</p>
          <p className="mt-1">{formData.title || "Halloween Spot"}</p>
          <p className="text-xs text-purple-900/70 mt-1">{formData.addressText || [formData.city, formData.state].filter(Boolean).join(", ")}</p>
        </div>
      </div>
    );
  }

  return null;
}
