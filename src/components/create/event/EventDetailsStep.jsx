import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_CATEGORIES, getDefaultEventIconForCategory } from "@/lib/eventListingConfig";
import { getPhotoLimitByTier } from "@/components/shared/listingTierEngine";
import EventPhotoUpload from "./EventPhotoUpload";

export default function EventDetailsStep({ formData, setFormData }) {
  const setListingType = (value) => {
    setFormData((prev) => ({
      ...prev,
      listingType: value,
      ...(value === "event" ? { tier: "basic", event_tier: "basic" } : {}),
      ...(value === "neighborhood_sale" ? { categories: [], category: "Neighborhood Sale", description: "" } : {}),
    }));
  };

  return (
    <div className="space-y-8">
      {/* Listing type switcher */}
      <div>
        <Label className="text-sm font-semibold text-slate-700 mb-3 block">Listing Type</Label>
        <RadioGroup value={formData.listingType} onValueChange={setListingType} className="space-y-2.5">
          {[
            { value: "yard_sale", title: "Yard Sale", description: "Individual residential sale" },
            { value: "neighborhood_sale", title: "Neighborhood Sale", description: "Up to 25 homes within a 500 ft radius" },
            { value: "event", title: "Event", description: "Sports, pop-ups, food, auto, community, and more" },
          ].map((option) => {
            const selected = formData.listingType === option.value;
            return (
              <label key={option.value} htmlFor={option.value} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selected ? "border-[#006168] bg-[#e6f3f4] ring-2 ring-[#006168]/15" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                <RadioGroupItem value={option.value} id={option.value} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{option.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{option.description}</div>
                </div>
              </label>
            );
          })}
        </RadioGroup>
      </div>

      {/* Event Name */}
      <div className="space-y-1.5">
        <Label htmlFor="event_name" className="text-sm font-semibold text-slate-700">Event Name *</Label>
        <Input
          id="event_name"
          value={formData.event_name || ""}
          onChange={(e) => setFormData((prev) => ({ ...prev, event_name: e.target.value, title: e.target.value }))}
          placeholder="e.g., Saturday Farmers Market"
          className="bg-white border-slate-200 focus-visible:ring-[#006168] focus-visible:border-[#006168] rounded-xl h-11 text-slate-800 placeholder:text-slate-300"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="event_description" className="text-sm font-semibold text-slate-700">Event Description</Label>
        <Textarea
          id="event_description"
          value={formData.event_description || ""}
          onChange={(e) => setFormData((prev) => ({ ...prev, event_description: e.target.value, description: e.target.value }))}
          placeholder="Add event details, schedule notes, or highlights..."
          rows={4}
          className="bg-white border-slate-200 focus-visible:ring-[#006168] focus-visible:border-[#006168] rounded-xl text-slate-800 placeholder:text-slate-300 resize-none"
        />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-slate-700">Event Category *</Label>
        <Select
          value={formData.event_category || ""}
          onValueChange={(value) => setFormData((prev) => ({
            ...prev,
            event_category: value,
            category: value,
            event_icon: getDefaultEventIconForCategory(value),
          }))}
        >
          <SelectTrigger className="bg-white border-slate-200 rounded-xl h-11 text-sm">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>{category.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-400">Your event icon is auto-selected by category. Manage it later from My Listings.</p>
      </div>

      <EventPhotoUpload
        value={formData.event_photos || []}
        maxPhotos={getPhotoLimitByTier(formData.event_tier || formData.tier || "basic")}
        onChange={(photos) => setFormData((prev) => ({ ...prev, event_photos: photos, photoUrls: photos }))}
      />
    </div>
  );
}