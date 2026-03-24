import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StepOne({ formData, setFormData }) {
  const navigate = useNavigate();
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
          onValueChange={(value) => setFormData(prev => ({
            ...prev,
            listingType: value,
            ...(value === "neighborhood_sale" ? {
              categories: [],
              category: "Neighborhood Sale",
              description: "",
            } : {}),
          }))}
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

      {listingType !== "neighborhood_sale" && (
        <>
          <div>
            <Label className="text-[#2C4F4E]">Categories (Up to 10) *</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.categories?.map((cat, i) => (
                 <Badge key={i} className="flex items-center gap-1 bg-[#5DADA5] py-1.5 px-3 text-sm rounded-full">
                    {cat} 
                    <X className="w-3 h-3 cursor-pointer" onClick={() => {
                      const newCats = formData.categories.filter((_, idx) => idx !== i);
                      setFormData(prev => ({ 
                        ...prev, 
                        categories: newCats, 
                        category: newCats[0] || "", 
                        collectible_type: newCats.includes("Collectibles") ? prev.collectible_type : null 
                      }));
                    }} />
                 </Badge>
              ))}
            </div>
            {(!formData.categories || formData.categories.length < 10) && (
              <Select
                value=""
                onValueChange={(value) => {
                  if (formData.categories?.includes(value)) return;
                  const newCats = [...(formData.categories || []), value];
                  setFormData(prev => ({ 
                    ...prev, 
                    categories: newCats,
                    category: newCats[0] || "",
                    collectible_type: newCats.includes("Collectibles") ? prev.collectible_type : null
                  }));
                }}
              >
                <SelectTrigger className="border-[#2C4F4E] bg-[#F3E6CF] mt-3">
                  <SelectValue placeholder="Add Category +" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Household Items", "Furniture", "Clothing & Accessories",
                    "Electronics", "Tools & Hardware", "Toys & Games",
                    "Baby & Kids", "Outdoor & Garden", "Sports Equipment",
                    "Collectibles", "Antiques & Vintage", "Vehicles & Auto Parts",
                    "Free Items", "Food / Baked Goods", "Miscellaneous"
                  ].filter(cat => !(formData.categories || []).includes(cat)).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {(formData.category === "Collectibles" || formData.categories?.includes("Collectibles")) && (
            <div>
              <Label className="text-[#2C4F4E]">Collectible Type *</Label>
              <Select
                value={formData.collectible_type || ""}
                onValueChange={(value) => setFormData(prev => ({ ...prev, collectible_type: value }))}
              >
                <SelectTrigger className="border-[#2C4F4E] bg-[#F3E6CF] mt-2">
                  <SelectValue placeholder="Select collectible type" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Funko Pops", "Sports Cards", "Pokémon Cards",
                    "Trading Cards (Other)", "Star Wars Collectibles", "Comics",
                    "Action Figures", "Die-cast Cars", "Video Game Collectibles",
                    "Movie Memorabilia", "Other Collectible"
                  ].map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-[#2C4F4E]" htmlFor="description">Description *</Label>
            <p className="text-xs text-[#1F2937] opacity-80 mt-1">
              Tip: Use searchable keywords like #item, #Pokémon card, #baby crib, #tools, #furniture.
            </p>
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
        </>
      )}

      {listingType === "neighborhood_sale" && (
        <div className="space-y-3 rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
          <div className="flex flex-col gap-2">
            <div>
              <p className="font-semibold text-[#2C4F4E]">Neighborhood Sale Pricing & Rules</p>
              <div className="text-sm text-[#1F2937] opacity-90 mt-2 space-y-2">
                <p><strong>Neighborhood Sales work best when planned ahead with your neighbors.</strong></p>
                <p>Your final cost is calculated as <strong>$19.99 base plus $2 per participating home</strong>. Participants are never charged.</p>
                <p>Once your sale reaches 5 participating homes, your event is considered committed and the organizer will be charged at the 24-hour mark.</p>
                <p className="mb-1">After activation:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>No additional homes can be added</li>
                  <li>The event is locked to provide a consistent experience for all participants</li>
                </ul>
                <p>We recommend inviting neighbors early to get the most out of your sale.</p>
              </div>
            </div>
            <div className="pt-2 flex justify-start border-t border-[#2C4F4E]/20 mt-2">
              <button
                type="button"
                onClick={() => navigate(createPageUrl("FAQ") + "#neighborhood-sale-pricing")}
                className="text-sm font-semibold text-[#0F766E] underline underline-offset-4"
              >
                Read more in our FAQ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}