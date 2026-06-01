import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Home, Users, Calendar, Lock, ChevronDown, ChevronUp, Sparkles, MapPin, Star, Megaphone } from "lucide-react";

// LAUNCH CONFIG: Temporarily lock non-residential listing types for Founding Seller Access
const LOCKED_LISTING_TYPES = ["neighborhood_sale", "event"];

const LOCKED_PREVIEW = {
  neighborhood_sale: {
    tagline: "Turn your block into a destination.",
    highlights: [
      { icon: Users, text: "Coordinate up to 25 homes in one unified listing" },
      { icon: MapPin, text: "Buyers discover your whole street on a single map pin" },
      { icon: Star, text: "Organizers set the dates — neighbors join for free" },
    ],
    teaser: "Neighborhood Sales launch after Founding Hunt Weekend. Early sellers will get first access.",
  },
  event: {
    tagline: "Put your local event on the Yardit map.",
    highlights: [
      { icon: Megaphone, text: "Reach thousands of active yard sale hunters nearby" },
      { icon: MapPin, text: "Featured map placement with custom branding options" },
      { icon: Star, text: "Drive foot traffic to flea markets, pop-ups & community events" },
    ],
    teaser: "Events launch after Founding Hunt Weekend. Be first to list when we go live.",
  },
};

const LISTING_TYPES = [
  {
    value: "yard_sale",
    icon: Home,
    title: "Yard Sale",
    subtitle: "Individual residential sale at your home",
    accent: "border-amber-200 bg-amber-50/40",
    activeAccent: "border-amber-400 bg-amber-50 ring-2 ring-amber-400/20",
    iconColor: "text-amber-600",
  },
  {
    value: "neighborhood_sale",
    icon: Users,
    title: "Neighborhood Sale",
    subtitle: "Coordinate up to 25 homes within 500 ft",
    accent: "border-emerald-200 bg-emerald-50/40",
    activeAccent: "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/20",
    iconColor: "text-emerald-600",
    comingSoonMessage: "Neighborhood Sales will launch after Founding Hunt Weekend.",
  },
  {
    value: "event",
    icon: Calendar,
    title: "Event",
    subtitle: "Public awareness listing for local events",
    accent: "border-[#b3d9db] bg-[#e6f3f4]/40",
    activeAccent: "border-[#006168] bg-[#e6f3f4] ring-2 ring-[#006168]/15",
    iconColor: "text-[#006168]",
    comingSoonMessage: "Events will launch after Founding Hunt Weekend.",
  },
];

const CATEGORIES = [
  "Household Items", "Furniture", "Clothing & Accessories",
  "Electronics", "Tools & Hardware", "Toys & Games",
  "Baby & Kids", "Outdoor & Garden", "Sports Equipment",
  "Collectibles", "Antiques & Vintage", "Vehicles & Auto Parts",
  "Free Items", "Food / Baked Goods", "Miscellaneous"
];

const COLLECTIBLE_TYPES = [
  "Funko Pops", "Sports Cards", "Pokémon Cards",
  "Trading Cards (Other)", "Star Wars Collectibles", "Comics",
  "Action Figures", "Die-cast Cars", "Video Game Collectibles",
  "Movie Memorabilia", "Other Collectible"
];

export default function StepOne({ formData, setFormData }) {
  const navigate = useNavigate();
  const listingType = formData?.listingType || "yard_sale";
  const isNeighborhood = listingType === "neighborhood_sale";
  const [expandedLocked, setExpandedLocked] = useState(null);

  return (
    <div className="space-y-8">

      {/* Listing type selector */}
      <div>
        <Label className="text-sm font-semibold text-slate-900 mb-3 block">What are you listing?</Label>
        <RadioGroup
          value={formData.listingType}
          onValueChange={(value) => {
            if (LOCKED_LISTING_TYPES.includes(value)) return;
            setFormData(prev => ({
              ...prev,
              listingType: value,
              ...(value === "neighborhood_sale" ? {
                categories: [],
                category: "Neighborhood Sale",
                description: "",
                organizer_participation: prev.organizer_participation || "participating",
              } : {}),
              ...(value === "event" ? {
                tier: "basic",
                event_tier: "basic",
              } : {}),
            }));
          }}
          className="space-y-2.5"
        >
          {LISTING_TYPES.map(({ value, icon: Icon, title, subtitle, accent, activeAccent, iconColor }) => {
            const isLocked = LOCKED_LISTING_TYPES.includes(value);
            const isSelected = formData.listingType === value && !isLocked;
            const isExpanded = expandedLocked === value;
            const preview = LOCKED_PREVIEW[value];

            if (isLocked) {
              return (
                <div key={value} className="rounded-xl border border-slate-200 bg-slate-50/60 opacity-60 overflow-hidden transition-all duration-200">
                  {/* Header row — always visible, tappable */}
                  <button
                    type="button"
                    onClick={() => setExpandedLocked(isExpanded ? null : value)}
                    className="w-full flex items-center gap-4 p-4 cursor-pointer text-left"
                  >
                    <div className="shrink-0 w-4 h-4 flex items-center justify-center">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white/40 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-500">{title}</span>
                        <span className="inline-flex items-center text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5 tracking-wide uppercase">
                          Coming Soon
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>
                    </div>
                    <div className="shrink-0 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Expandable preview panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-white/70 px-4 pb-4 pt-3 space-y-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <p className="text-sm font-semibold text-slate-700 italic">{preview.tagline}</p>
                      </div>
                      <ul className="space-y-2">
                        {preview.highlights.map(({ icon: HIcon, text }, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                              <HIcon className="w-3 h-3 text-slate-500" />
                            </div>
                            <span className="text-xs text-slate-600 leading-relaxed">{text}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                        <p className="text-xs text-amber-800 font-medium leading-snug">{preview.teaser}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={value}
                className={`relative rounded-xl border transition-all duration-150 ${
                  isSelected ? `${activeAccent} cursor-pointer` : `${accent} hover:border-slate-300 cursor-pointer`
                }`}
                onClick={() => setFormData(prev => ({
                  ...prev,
                  listingType: value,
                  ...(value === "event" ? { tier: "basic", event_tier: "basic" } : {}),
                }))}
              >
                <label htmlFor={value} className="flex items-start gap-4 p-4 cursor-pointer">
                  <RadioGroupItem value={value} id={value} className="mt-0.5 shrink-0" />
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-white shadow-sm" : "bg-white/60"}`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 text-sm">{title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
                  </div>
                </label>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-sm font-semibold text-slate-700">
          {isNeighborhood ? "Event Name *" : "Sale Title *"}
        </Label>
        <p className="text-xs text-slate-500">
          {isNeighborhood
            ? "Give your neighborhood event a memorable name"
            : "A clear title helps shoppers find your sale faster"}
        </p>
        <Input
          id="title"
          placeholder={isNeighborhood ? "e.g., Oak Street Neighborhood Sale" : "e.g., Multi-Family Yard Sale — Great Deals!"}
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
          className="mt-1.5 bg-white border-slate-400 focus-visible:ring-[#006168] focus-visible:border-[#006168] rounded-xl h-11 text-slate-800 placeholder:text-slate-400"
        />
      </div>

      {/* Categories + Description — only for non-neighborhood */}
      {!isNeighborhood && (
        <>
          {/* Categories */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-900">
              Categories <span className="text-slate-500 font-normal">(up to 10) *</span>
            </Label>
            <p className="text-xs text-slate-500">Help shoppers browse by what you're selling</p>

            {formData.categories?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {formData.categories.map((cat, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#e6f3f4] text-[#006168] border border-[#b3d9db] rounded-full px-3 py-1">
                    {cat}
                    <button
                      type="button"
                      onClick={() => {
                        const newCats = formData.categories.filter((_, idx) => idx !== i);
                        setFormData(prev => ({
                          ...prev,
                          categories: newCats,
                          category: newCats[0] || "",
                          collectible_type: newCats.includes("Collectibles") ? prev.collectible_type : null
                        }));
                      }}
                      className="hover:text-[#004d52] transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Collectible type sub-selector */}
            {(formData.category === "Collectibles" || formData.categories?.includes("Collectibles")) && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <Label className="text-xs font-semibold text-amber-800 mb-1.5 block">Collectible Type *</Label>
                <Select
                  value={formData.collectible_type || ""}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, collectible_type: value }))}
                >
                  <SelectTrigger className="bg-white border-amber-200 rounded-lg h-9 text-sm">
                    <SelectValue placeholder="Select collectible type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLECTIBLE_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
                <SelectTrigger className="bg-white border-slate-400 rounded-xl h-10 text-sm text-slate-600">
                  <SelectValue placeholder="+ Add a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter(cat => !(formData.categories || []).includes(cat)).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-semibold text-slate-900">Description *</Label>
            <p className="text-xs text-slate-500">
              Use keywords buyers search for — furniture, baby clothes, tools, Pokémon cards, etc.
            </p>
            <Textarea
              id="description"
              placeholder="What are you selling? Be specific — buyers search by item type, brand, and condition."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              required
              className="mt-1 bg-white border-slate-400 focus-visible:ring-[#006168] focus-visible:border-[#006168] rounded-xl text-slate-800 placeholder:text-slate-400 resize-none"
            />
          </div>
        </>
      )}

      {/* Neighborhood sale specific options */}
      {isNeighborhood && (
        <div className="space-y-5">
          {/* Participation choice */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <Label className="text-sm font-semibold text-slate-700 mb-3 block">
              Will you have a sale at your own address?
            </Label>
            <RadioGroup
              value={formData.organizer_participation || "participating"}
              onValueChange={(value) => setFormData(prev => ({ ...prev, organizer_participation: value }))}
              className="space-y-2"
            >
              <label htmlFor="organizer_participating" className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.organizer_participation !== "organizing_only" ? "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-300/20" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                <RadioGroupItem value="participating" id="organizer_participating" className="mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-slate-800">Yes, I'm hosting a sale at my address</div>
                  <div className="text-xs text-slate-500 mt-0.5">My home counts as one participant</div>
                </div>
              </label>
              <label htmlFor="organizer_only" className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.organizer_participation === "organizing_only" ? "border-[#006168]/40 bg-[#e6f3f4] ring-2 ring-[#006168]/15" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                <RadioGroupItem value="organizing_only" id="organizer_only" className="mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-slate-800">No, I'm just organizing</div>
                  <div className="text-xs text-slate-500 mt-0.5">My home will not be listed as a participant</div>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Pricing info */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">How Neighborhood Sale pricing works</p>
            <div className="text-sm text-slate-500 space-y-2 leading-relaxed">
              <p><strong className="text-slate-700">$19.99 base + $2 per participating home.</strong> Participants are never charged.</p>
              <p>Once you reach 5 confirmed homes, your event is committed and billing runs at the 24-hour mark before the event starts.</p>
              <ul className="list-disc pl-4 space-y-1 text-xs mt-2">
                <li>No new homes can be added after activation</li>
                <li>All participants are locked in for a consistent experience</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => navigate(createPageUrl("FAQ") + "#neighborhood-sale-pricing")}
              className="text-xs font-semibold text-[#006168] hover:text-[#004d52] underline underline-offset-2 transition-colors"
            >
              Full pricing FAQ →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}