import React from "react";
import StepOne from "./StepOne";
import StepTwo from "./StepTwo";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CalendarDays, Clock3 } from "lucide-react";

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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><CalendarDays className="h-4 w-4 text-purple-700" /> Start date</Label>
            <Input
              type="date"
              value={formData.halloween_start_date || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, halloween_start_date: e.target.value }))}
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><CalendarDays className="h-4 w-4 text-purple-700" /> End date</Label>
            <Input
              type="date"
              value={formData.halloween_end_date || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, halloween_end_date: e.target.value }))}
              min={formData.halloween_start_date || undefined}
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Clock3 className="h-4 w-4 text-orange-600" /> Starts at</Label>
            <Input
              type="time"
              value={formData.halloween_start_time || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, halloween_start_time: e.target.value, full_icon_activation_time: e.target.value || prev.full_icon_activation_time || "15:00" }))}
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Clock3 className="h-4 w-4 text-orange-600" /> Ends at</Label>
            <Input
              type="time"
              value={formData.halloween_end_time || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, halloween_end_time: e.target.value }))}
              className="bg-white"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-slate-800">Full icon appears after</Label>
          <Input
            type="time"
            value={formData.full_icon_activation_time || "15:00"}
            onChange={(e) => setFormData((prev) => ({ ...prev, full_icon_activation_time: e.target.value }))}
            className="max-w-[180px] bg-white"
          />
          <p className="text-xs text-slate-500">Default is 3:00 PM. Before this time, Yardit shows the small pumpkin marker.</p>
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
