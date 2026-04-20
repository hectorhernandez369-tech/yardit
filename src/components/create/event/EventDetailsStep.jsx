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
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
        <h3 className="text-[#2C4F4E] font-semibold">Event Details</h3>
        <p className="text-sm text-[#1F2937] opacity-80">Create a new event listing for visibility on the map.</p>
      </div>

      <div>
        <Label className="mb-3 block text-[#2C4F4E]">Listing Type</Label>
        <RadioGroup value={formData.listingType} onValueChange={setListingType}>
          {[
            { value: "yard_sale", title: "Yard Sale", description: "Individual residential sale" },
            { value: "neighborhood_sale", title: "Neighborhood Sale", description: "Up to 25 homes within a 500 ft radius" },
            { value: "event", title: "Event", description: "Sports, pop-ups, food, auto, community, and more" },
          ].map((option) => (
            <div key={option.value} className="flex items-center space-x-2 p-4 border-2 border-[#2C4F4E] rounded-lg bg-[#F3E6CF] mb-2">
              <RadioGroupItem value={option.value} id={option.value} />
              <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                <div className="font-semibold text-[#2C4F4E]">{option.title}</div>
                <div className="text-sm text-[#1F2937] opacity-80">{option.description}</div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-[#2C4F4E]" htmlFor="event_name">Event Name *</Label>
        <Input
          id="event_name"
          value={formData.event_name || ""}
          onChange={(e) => setFormData((prev) => ({ ...prev, event_name: e.target.value, title: e.target.value }))}
          placeholder="e.g., Saturday Farmers Market"
          className="border-[#2C4F4E] bg-[#F3E6CF] mt-2"
        />
      </div>

      <div>
        <Label className="text-[#2C4F4E]" htmlFor="event_description">Event Description</Label>
        <Textarea
          id="event_description"
          value={formData.event_description || ""}
          onChange={(e) => setFormData((prev) => ({ ...prev, event_description: e.target.value, description: e.target.value }))}
          placeholder="Add event details, schedule notes, or highlights..."
          rows={5}
          className="border-[#2C4F4E] bg-[#F3E6CF] mt-2"
        />
      </div>

      <div>
        <Label className="text-[#2C4F4E]">Event Category *</Label>
        <Select
          value={formData.event_category || ""}
          onValueChange={(value) => setFormData((prev) => ({
            ...prev,
            event_category: value,
            category: value,
            event_icon: getDefaultEventIconForCategory(value),
          }))}
        >
          <SelectTrigger className="border-[#2C4F4E] bg-[#F3E6CF] mt-2">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>{category.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-[#2C4F4E]/20 bg-white/70 p-3 text-sm text-[#2C4F4E]">
        Your event icon is automatically selected from the chosen category. You can manage it later from My Listings based on your event tier.
      </div>

      <EventPhotoUpload
        value={formData.event_photos || []}
        maxPhotos={getPhotoLimitByTier(formData.event_tier || formData.tier || "basic")}
        onChange={(photos) => setFormData((prev) => ({ ...prev, event_photos: photos, photoUrls: photos }))}
      />
    </div>
  );
}