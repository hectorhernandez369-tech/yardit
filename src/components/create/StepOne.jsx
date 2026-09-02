import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Home, Users, Calendar, Lock, ChevronDown, ChevronUp, Sparkles, MapPin, Star, Megaphone, Ghost } from "lucide-react";
import CharacterCounter from "@/components/shared/CharacterCounter";
import { getResidentialDescriptionLimit, limitText } from "@/lib/residentialDescriptionLimits";
import { RESIDENTIAL_CATEGORY_GROUPS } from "@/lib/residentialCategories";
import { HALLOWEEN_PREVIEW_ICON_ASSETS } from "@/lib/halloweenMapIcons";

// LAUNCH CONFIG: Temporarily lock non-residential listing types for Founding Seller Access
const LOCKED_LISTING_TYPES = [];

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

const HALLOWEEN_ICON_OPTIONS = [
  { value: "halloween_decorations", label: "Halloween Decorations", description: "A decorated home or yard with pumpkins, props, inflatables, lights, or general Halloween decor.", image: HALLOWEEN_PREVIEW_ICON_ASSETS.halloween_decorations },
  { value: "haunted", label: "Haunted House", description: "A scary or immersive stop with walkthroughs, actors, jump scares, or heavier horror themes.", image: HALLOWEEN_PREVIEW_ICON_ASSETS.haunted },
  { value: "trick_or_treat", label: "Trick-or-Treat", description: "A home or stop actively handing out candy to trick-or-treaters.", image: HALLOWEEN_PREVIEW_ICON_ASSETS.trick_or_treat },
  { value: "trunk_or_treat", label: "Trunk-or-Treat", description: "An organized candy stop at a church, school, business, parking lot, or decorated vehicle event.", image: HALLOWEEN_PREVIEW_ICON_ASSETS.trunk_or_treat },
  { value: "scary_yard", label: "Scary Yard", description: "An outdoor setup focused on graveyards, monsters, animatronics, or spooky yard scenes.", image: HALLOWEEN_PREVIEW_ICON_ASSETS.scary_yard },
  { value: "light_show", label: "Light Show", description: "A Halloween display centered on synchronized lights, projections, music, or animated lighting effects.", image: HALLOWEEN_PREVIEW_ICON_ASSETS.light_show },
];

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
  {
    value: "halloween_spot",
    icon: Ghost,
    title: "Halloween",
    subtitle: "Show off your spooky house, candy stop, or Halloween display",
    accent: "border-orange-300 bg-gradient-to-r from-purple-950 via-purple-900 to-slate-950 text-white shadow-[0_0_18px_rgba(249,115,22,0.22)]",
    activeAccent: "border-orange-400 bg-gradient-to-r from-purple-950 via-purple-900 to-slate-950 ring-2 ring-orange-400/40 shadow-[0_0_28px_rgba(249,115,22,0.42)] -translate-y-0.5",
    iconColor: "text-orange-300",
  },
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
  const isHalloween = listingType === "halloween_spot";
  const descriptionLimit = getResidentialDescriptionLimit(listingType);
  const [expandedLocked, setExpandedLocked] = useState(null);

  const handleListingTypeSelect = (value) => {
    if (LOCKED_LISTING_TYPES.includes(value)) return;

    setFormData(prev => ({
      ...prev,
      listingType: value,
      ...(value === "neighborhood_sale" ? {
        categories: [],
        category: "Neighborhood Sale",
        description: "",
        title: prev.title || "Neighborhood Sale",
        organizer_participation: prev.organizer_participation || "participating",
      } : {}),
      ...(value === "event" ? {
        tier: "basic",
        event_tier: "basic",
      } : {}),
      ...(value === "halloween_spot" ? {
        tier: "free",
        category: "Halloween",
        categories: ["Halloween"],
        halloween_icon_key: prev.halloween_spot_type || prev.halloween_icon_key || "halloween_decorations",
        halloween_spot_type: prev.halloween_spot_type || prev.halloween_icon_key || "halloween_decorations",
        halloween_tags: prev.halloween_tags || [],
        full_icon_activation_time: prev.full_icon_activation_time || "15:00",
      } : {}),
    }));

  };

  return (
    <div className="space-y-8">

      {/* Listing type selector */}
      <div>
        <Label className="text-sm font-semibold text-slate-900 mb-3 block">What are you listing?</Label>
        <RadioGroup
          value={formData.listingType}
          onValueChange={handleListingTypeSelect}
          className="space-y-2.5"
        >
          {LISTING_TYPES.map(({ value, icon: Icon, title, subtitle, accent, activeAccent, iconColor }) => {
            const isLocked = LOCKED_LISTING_TYPES.includes(value);
            const isSelected = formData.listingType === value && !isLocked;
            const isHalloweenOption = value === "halloween_spot";
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
                  isSelected ? `${activeAccent} cursor-pointer` : `${accent} ${isHalloweenOption ? "hover:border-orange-400 hover:shadow-[0_0_24px_rgba(249,115,22,0.32)]" : "hover:border-slate-300"} cursor-pointer`
                }`}
                onClick={() => handleListingTypeSelect(value)}
              >
                <label htmlFor={value} className="flex items-start gap-4 p-4 cursor-pointer">
                  <RadioGroupItem value={value} id={value} className="mt-0.5 shrink-0" />
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isHalloweenOption ? "bg-orange-500/15 ring-1 ring-orange-300/40 shadow-inner" : isSelected ? "bg-white shadow-sm" : "bg-white/60"}`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-center gap-2 font-semibold text-sm ${isHalloweenOption ? "text-white" : "text-slate-800"}`}>
                      <span>{title}</span>
                      {isHalloweenOption && <span className="inline-flex items-center rounded-full border border-orange-300/60 bg-orange-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-orange-200">Seasonal</span>}
                    </div>
                    <div className={`text-xs mt-0.5 ${isHalloweenOption ? "text-purple-100/85" : "text-slate-500"}`}>{subtitle}</div>
                  </div>
                  {isHalloweenOption && <div className="pointer-events-none absolute right-3 top-2 text-sm opacity-70">🎃</div>}
                </label>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      {listingType === "halloween_spot" && (
        <div className="space-y-2 rounded-xl border border-purple-200 bg-purple-50/60 p-4">
          <Label className="text-sm font-semibold text-purple-950">Halloween Spot Type</Label>
          <p className="text-xs text-purple-800/70">Choose the map icon that best describes this Halloween stop.</p>
          <Select
            value={formData.halloween_spot_type || formData.halloween_icon_key || "halloween_decorations"}
            onValueChange={(value) => setFormData(prev => ({
              ...prev,
              halloween_spot_type: value,
              halloween_icon_key: value,
              halloween_tags: ["trick_or_treat", "trunk_or_treat"].includes(value)
                ? (prev.halloween_tags || []).filter((tag) => tag !== "no_candy_here")
                : (prev.halloween_tags || []),
              halloween_candy_available: ["trick_or_treat", "trunk_or_treat"].includes(value) ? true : prev.halloween_candy_available,
            }))}
          >
            <SelectTrigger className="bg-white border-purple-300">
              <SelectValue placeholder="Choose a Halloween icon" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Halloween Icons</SelectLabel>
                {HALLOWEEN_ICON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2 py-1">
                      <img src={option.image} alt="" className="h-9 w-9 shrink-0 object-contain" />
                      <div>
                        <div className="text-sm font-semibold">{option.label}</div>
                        <div className="max-w-[240px] whitespace-normal text-[11px] leading-snug text-slate-500">{option.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {(() => {
            const selectedIcon = HALLOWEEN_ICON_OPTIONS.find((option) => option.value === (formData.halloween_spot_type || formData.halloween_icon_key || "halloween_decorations"));
            return selectedIcon ? (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-purple-200 bg-white p-3">
                <img src={selectedIcon.image} alt="" className="h-12 w-12 object-contain" />
                <div>
                  <p className="text-sm font-bold text-purple-950">{selectedIcon.label}</p>
                  <p className="text-xs leading-snug text-slate-600">{selectedIcon.description}</p>
                  <p className="mt-1 text-[11px] text-slate-400">Preview artwork; the map uses a visibility-optimized pin.</p>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* Title — skipped for Neighborhood Sale */}
      {!isNeighborhood && (
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-sm font-semibold text-slate-700">
            {isHalloween ? "Halloween Spot Title *" : "Sale Title *"}
          </Label>
          <p className="text-xs text-slate-500">
            {isHalloween ? "Give your spooky stop a short, recognizable name" : "A clear title helps shoppers find your sale faster"}
          </p>
          <Input
            id="title"
            placeholder={isHalloween ? "e.g., Haunted Ramblewood House" : "e.g., Multi-Family Yard Sale — Great Deals!"}
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
            className="mt-1.5 bg-white border-slate-400 focus-visible:ring-[#006168] focus-visible:border-[#006168] rounded-xl h-11 text-slate-800 placeholder:text-slate-400"
          />
        </div>
      )}

      {/* Categories + Description — only for non-neighborhood */}
      {!isNeighborhood && (
        <>
          {/* Categories */}
          {!isHalloween && <div className="space-y-2">
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
                  {RESIDENTIAL_CATEGORY_GROUPS.map((group) => {
                    const availableCategories = group.children.filter(cat => !(formData.categories || []).includes(cat));
                    if (availableCategories.length === 0) return null;
                    return (
                      <SelectGroup key={group.label}>
                        <SelectLabel className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          {group.label}
                        </SelectLabel>
                        {availableCategories.map(cat => (
                          <SelectItem key={cat} value={cat} className="pl-4">{cat}</SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-semibold text-slate-900">Description</Label>
            <p className="text-xs text-slate-500">
              {isHalloween ? "Tell visitors what to expect — decorations, walkthrough, lights, scares, candy, or anything helpful." : "Use keywords buyers search for — furniture, baby clothes, tools, Pokémon cards, etc."}
            </p>
            <Textarea
              id="description"
              placeholder={isHalloween ? "Describe your Halloween display or attraction." : "What are you selling? Be specific — buyers search by item type, brand, and condition."}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: limitText(e.target.value, descriptionLimit) }))}
              maxLength={descriptionLimit || undefined}
              rows={4}
              className="mt-1 bg-white border-slate-400 focus-visible:ring-[#006168] focus-visible:border-[#006168] rounded-xl text-slate-800 placeholder:text-slate-400 resize-none"
            />
            <CharacterCounter value={formData.description} limit={descriptionLimit} />
          </div>
        </>
      )}


    </div>
  );
}