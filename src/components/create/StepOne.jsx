import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function StepOne({ formData, setFormData }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
        <h3 className="text-[#2C4F4E] font-semibold">Details</h3>
        <p className="text-sm text-[#1F2937] opacity-80">
          Tell us about your sale
        </p>
      </div>

      <div>
        <Label className="mb-3 block text-[#2C4F4E]">Listing Type</Label>
        <RadioGroup
          value={formData.listingType}
          onValueChange={(value) => setFormData(prev => ({ ...prev, listingType: value }))}
        >
          <div className="flex items-center space-x-2 p-4 border-2 border-[#2C4F4E] rounded-lg bg-[#F3E6CF]">
            <RadioGroupItem value="yard_sale" id="yard_sale" />
            <Label htmlFor="yard_sale" className="flex-1 cursor-pointer">
              <div className="font-semibold text-[#2C4F4E]">Yard Sale</div>
              <div className="text-sm text-[#1F2937] opacity-80">Individual residential sale</div>
            </Label>
          </div>
          <div className="flex items-center space-x-2 p-4 border-2 border-[#2C4F4E] rounded-lg bg-[#F3E6CF]">
            <RadioGroupItem value="neighborhood_sale" id="neighborhood_sale" />
            <Label htmlFor="neighborhood_sale" className="flex-1 cursor-pointer">
              <div className="font-semibold text-[#2C4F4E]">Neighborhood Sale</div>
              <div className="text-sm text-[#1F2937] opacity-80">Up to 25 homes within a 500 ft radius</div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label className="text-[#2C4F4E]" htmlFor="title">Title *</Label>
        <Input
          id="title"
          placeholder="e.g., Multi-Family Yard Sale"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
          className="border-[#2C4F4E] focus-visible:ring-[#5DADA5] bg-[#F3E6CF]"
        />
      </div>

      <div>
        <Label className="text-[#2C4F4E]" htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="Describe what you're selling..."
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={5}
          required
          className="border-[#2C4F4E] focus-visible:ring-[#5DADA5] bg-[#F3E6CF]"
        />
      </div>

      {formData.listingType === "neighborhood_sale" && (
        <>
          <div>
            <Label className="text-[#2C4F4E]" htmlFor="homeCount">Number of Homes (max 10)</Label>
            <Input
              id="homeCount"
              type="number"
              min="2"
              max="10"
              value={formData.homeCount}
              onChange={(e) => setFormData(prev => ({ ...prev, homeCount: parseInt(e.target.value) }))}
              className="border-[#2C4F4E] focus-visible:ring-[#5DADA5] bg-[#F3E6CF]"
            />
          </div>
          <div>
            <Label className="text-[#2C4F4E]" htmlFor="spanFeet">Span in Feet (max 500)</Label>
            <Input
              id="spanFeet"
              type="number"
              max="500"
              value={formData.spanFeet}
              onChange={(e) => setFormData(prev => ({ ...prev, spanFeet: parseInt(e.target.value) }))}
              className="border-[#2C4F4E] focus-visible:ring-[#5DADA5] bg-[#F3E6CF]"
            />
          </div>
        </>
      )}
    </div>
  );
}