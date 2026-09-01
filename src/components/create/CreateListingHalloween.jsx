import React from "react";
import StepOne from "./StepOne";
import StepTwo from "./StepTwo";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CalendarDays, Clock3, Candy, Baby, Footprints, Lightbulb, Volume2, AlertTriangle } from "lucide-react";

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

        <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4 space-y-3">
          <div>
            <h3 className="text-sm font-black text-purple-950">What should visitors know?</h3>
            <p className="text-xs text-purple-900/70">These are tags and features, not separate map pin types.</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => setFormData((prev) => ({ ...prev, halloween_tags: (prev.halloween_tags || []).includes("kid_friendly") ? (prev.halloween_tags || []).filter((tag) => tag !== "kid_friendly") : [...(prev.halloween_tags || []), "kid_friendly"] }))} className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm ${formData.halloween_tags?.includes("kid_friendly") ? "border-purple-500 bg-purple-100 text-purple-950" : "border-slate-200 bg-white text-slate-700"}`}><Baby className="h-4 w-4" /><span><strong>Kid Friendly</strong><span className="block text-[11px] font-normal opacity-70">Little or no intense scares.</span></span></button>
            <button type="button" onClick={() => setFormData((prev) => ({ ...prev, halloween_tags: (prev.halloween_tags || []).includes("no_candy_here") ? (prev.halloween_tags || []).filter((tag) => tag !== "no_candy_here") : [...(prev.halloween_tags || []), "no_candy_here"], halloween_candy_available: false }))} className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm ${formData.halloween_tags?.includes("no_candy_here") ? "border-orange-500 bg-orange-50 text-orange-950" : "border-slate-200 bg-white text-slate-700"}`}><Candy className="h-4 w-4" /><span><strong>No Candy Here</strong><span className="block text-[11px] font-normal opacity-70">Display only; no candy being handed out.</span></span></button>
            <button type="button" onClick={() => setFormData((prev) => ({ ...prev, halloween_walkthrough: !prev.halloween_walkthrough }))} className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm ${formData.halloween_walkthrough ? "border-purple-500 bg-purple-100 text-purple-950" : "border-slate-200 bg-white text-slate-700"}`}><Footprints className="h-4 w-4" /><span><strong>Walk-through</strong><span className="block text-[11px] font-normal opacity-70">Visitors can walk through the attraction.</span></span></button>
            <button type="button" onClick={() => setFormData((prev) => ({ ...prev, halloween_lights: !prev.halloween_lights }))} className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm ${formData.halloween_lights ? "border-orange-500 bg-orange-50 text-orange-950" : "border-slate-200 bg-white text-slate-700"}`}><Lightbulb className="h-4 w-4" /><span><strong>Lights</strong><span className="block text-[11px] font-normal opacity-70">Lighting effects are part of the display.</span></span></button>
            <button type="button" onClick={() => setFormData((prev) => ({ ...prev, halloween_sound: !prev.halloween_sound }))} className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm ${formData.halloween_sound ? "border-purple-500 bg-purple-100 text-purple-950" : "border-slate-200 bg-white text-slate-700"}`}><Volume2 className="h-4 w-4" /><span><strong>Sound / Music</strong><span className="block text-[11px] font-normal opacity-70">Music or sound effects are used.</span></span></button>
            <button type="button" onClick={() => setFormData((prev) => ({ ...prev, halloween_jump_scares: !prev.halloween_jump_scares }))} className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm ${formData.halloween_jump_scares ? "border-red-500 bg-red-50 text-red-950" : "border-slate-200 bg-white text-slate-700"}`}><AlertTriangle className="h-4 w-4" /><span><strong>Jump Scares</strong><span className="block text-[11px] font-normal opacity-70">May include sudden scares or actors.</span></span></button>
          </div>

          {!formData.halloween_tags?.includes("no_candy_here") && <button type="button" onClick={() => setFormData((prev) => ({ ...prev, halloween_candy_available: prev.halloween_candy_available === true ? false : true }))} className={`flex w-full items-center gap-2 rounded-xl border p-3 text-left text-sm ${formData.halloween_candy_available ? "border-orange-500 bg-orange-50 text-orange-950" : "border-slate-200 bg-white text-slate-700"}`}><Candy className="h-4 w-4" /><span><strong>Candy Available</strong><span className="block text-[11px] font-normal opacity-70">This stop plans to hand out candy.</span></span></button>}

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-800">Suggested age <span className="font-normal text-slate-400">(optional)</span></Label>
            <Input value={formData.halloween_suggested_age || ""} onChange={(e) => setFormData((prev) => ({ ...prev, halloween_suggested_age: e.target.value }))} placeholder="e.g., All ages, 8+, Teens & adults" className="bg-white" />
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
