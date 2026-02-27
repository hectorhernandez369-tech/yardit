import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";

export default function StepOne({ formData, setFormData }) {
  const listingType = formData?.listingType || "yard_sale";

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
          <div className="flex items-center space-x-2 p-4 border-2 border-[#2C4F4E] rounded-lg bg-[#F3E6CF] mb-2">
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

      {listingType !== "neighborhood_sale" && (
        <div className="space-y-3 mt-4 pt-4 border-t border-[#2C4F4E]/20">
          <Label className="text-[#2C4F4E] font-semibold block mb-2">Choose your tier</Label>
          <div className="grid gap-3">
            <Card className={`p-4 cursor-pointer border-2 transition-all ${tier === "free" ? "border-[#5DADA5] bg-[#E7D7B8] shadow-md" : "border-[#2C4F4E]/40 bg-[#F3E6CF] hover:border-[#2C4F4E]"}`} onClick={() => setTier("free")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#2C4F4E] flex items-center gap-2">
                    Free
                    {tier === "free" && <span className="text-xs bg-[#5DADA5] text-white px-2 py-0.5 rounded-full">Selected</span>}
                  </div>
                  <div className="text-sm text-[#1F2937] opacity-80 mt-1">List view only. Runs next weekend (Fri–Sun).</div>
                </div>
                <div className="text-sm font-semibold text-[#2C4F4E]">Free</div>
              </div>
            </Card>

            <Card className={`p-4 cursor-pointer border-2 transition-all ${tier === "featured" ? "border-[#5DADA5] bg-[#E7D7B8] shadow-md" : "border-[#2C4F4E]/40 bg-[#F3E6CF] hover:border-[#2C4F4E]"}`} onClick={() => setTier("featured")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#2C4F4E] flex items-center gap-2">
                    Featured
                    {tier === "featured" && <span className="text-xs bg-[#5DADA5] text-white px-2 py-0.5 rounded-full">Selected</span>}
                  </div>
                  <div className="text-sm text-[#1F2937] opacity-80 mt-1">Strong visibility. Requires exactly 3 consecutive days.</div>
                </div>
                <div className="text-sm font-semibold text-[#2C4F4E]">($)</div>
              </div>
            </Card>

            <Card className={`p-4 cursor-pointer border-2 transition-all ${tier === "premium" ? "border-[#F4A849] bg-[#E7D7B8] shadow-md" : "border-[#2C4F4E]/40 bg-[#F3E6CF] hover:border-[#2C4F4E]"}`} onClick={() => setTier("premium")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#2C4F4E] flex items-center gap-2">
                    Premium
                    {tier === "premium" && <span className="text-xs bg-[#F4A849] text-[#2C4F4E] px-2 py-0.5 rounded-full">Selected</span>}
                  </div>
                  <div className="text-sm text-[#1F2937] opacity-80 mt-1">Highest residential tier. Requires exactly 5 consecutive days. (Pre-activation options available next step.)</div>
                </div>
                <div className="text-sm font-semibold text-[#2C4F4E]">$7.99</div>
              </div>
            </Card>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-[#2C4F4E]/20">
        <Label className="text-[#2C4F4E]" htmlFor="title">Title *</Label>
        <Input
          id="title"
          placeholder="e.g., Multi-Family Yard Sale"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
          className="border-[#2C4F4E] focus-visible:ring-[#5DADA5] bg-[#F3E6CF] mt-2"
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
          className="border-[#2C4F4E] focus-visible:ring-[#5DADA5] bg-[#F3E6CF] mt-2"
        />
      </div>

      {listingType === "neighborhood_sale" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-[#2C4F4E]" htmlFor="homeCount">Number of Homes (Max 25)</Label>
            <Input
              id="homeCount"
              type="number"
              min="1"
              max="25"
              value={formData.homeCount}
              onChange={(e) => setFormData(prev => ({ ...prev, homeCount: parseInt(e.target.value) || 1 }))}
              className="border-[#2C4F4E] focus-visible:ring-[#5DADA5] bg-[#F3E6CF] mt-2"
            />
          </div>
          <div>
            <Label className="text-[#2C4F4E]" htmlFor="spanFeet">Radius in Feet</Label>
            <Input
              id="spanFeet"
              type="number"
              value={500}
              disabled
              className="border-[#2C4F4E] bg-[#E7D7B8] opacity-70 cursor-not-allowed mt-2"
            />
          </div>
        </div>
      )}
    </div>
  );
}