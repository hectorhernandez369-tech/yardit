import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function StepOne({ formData, setFormData }) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="mb-3 block">Listing Type</Label>
        <RadioGroup
          value={formData.listingType}
          onValueChange={(value) => setFormData(prev => ({ ...prev, listingType: value }))}
        >
          <div className="flex items-center space-x-2 p-4 border rounded-lg">
            <RadioGroupItem value="yard_sale" id="yard_sale" />
            <Label htmlFor="yard_sale" className="flex-1 cursor-pointer">
              <div className="font-semibold">Yard Sale</div>
              <div className="text-sm text-slate-600">Individual residential sale</div>
            </Label>
          </div>
          <div className="flex items-center space-x-2 p-4 border rounded-lg">
            <RadioGroupItem value="neighborhood_sale" id="neighborhood_sale" />
            <Label htmlFor="neighborhood_sale" className="flex-1 cursor-pointer">
              <div className="font-semibold">Neighborhood Sale</div>
              <div className="text-sm text-slate-600">Multi-home event (max 10 homes, 500 ft span)</div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          placeholder="e.g., Multi-Family Yard Sale"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="Describe what you're selling..."
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={5}
          required
        />
      </div>

      {formData.listingType === "neighborhood_sale" && (
        <>
          <div>
            <Label htmlFor="homeCount">Number of Homes (max 10)</Label>
            <Input
              id="homeCount"
              type="number"
              min="2"
              max="10"
              value={formData.homeCount}
              onChange={(e) => setFormData(prev => ({ ...prev, homeCount: parseInt(e.target.value) }))}
            />
          </div>
          <div>
            <Label htmlFor="spanFeet">Span in Feet (max 500)</Label>
            <Input
              id="spanFeet"
              type="number"
              max="500"
              value={formData.spanFeet}
              onChange={(e) => setFormData(prev => ({ ...prev, spanFeet: parseInt(e.target.value) }))}
            />
          </div>
        </>
      )}
    </div>
  );
}