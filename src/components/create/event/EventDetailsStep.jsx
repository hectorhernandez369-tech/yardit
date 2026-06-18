import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_CATEGORIES, getDefaultEventIconForCategory, getEventIconEmoji } from "@/lib/eventListingConfig";
import CharacterCounter from "@/components/shared/CharacterCounter";
import { getResidentialDescriptionLimit, limitText } from "@/lib/residentialDescriptionLimits";

export default function EventDetailsStep({ formData, setFormData }) {
  const descriptionLimit = getResidentialDescriptionLimit("event");

  const setListingType = (value) => {
    setFormData((prev) => ({
      ...prev,
      listingType: value,
      ...(value === "event" ? { tier: "event", event_tier: "event", event_add_ons: prev.event_add_ons || {} } : {}),
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
            { value: "event", title: "Event", description: "Church, school, fundraiser, charity, community, holiday, family, and sports events" },
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
          onChange={(e) => {
            const nextValue = limitText(e.target.value, descriptionLimit);
            setFormData((prev) => ({ ...prev, event_description: nextValue, description: nextValue }));
          }}
          maxLength={descriptionLimit}
          placeholder="Add event details, schedule notes, or highlights..."
          rows={4}
          className="bg-white border-slate-200 focus-visible:ring-[#006168] focus-visible:border-[#006168] rounded-xl text-slate-800 placeholder:text-slate-300 resize-none"
        />
        <CharacterCounter value={formData.event_description || ""} limit={descriptionLimit} />
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
            {EVENT_CATEGORIES.map((category) => {
              const iconKey = getDefaultEventIconForCategory(category);
              return (
                <SelectItem key={category} value={category}>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F3E6CF] text-lg shadow-sm">
                      {getEventIconEmoji(iconKey)}
                    </span>
                    <span>{category.replace(/_/g, " ")}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-400">Your default graphic icon is selected by category. You can replace it with the Custom Icon add-on later.</p>
      </div>
    </div>
  );
}