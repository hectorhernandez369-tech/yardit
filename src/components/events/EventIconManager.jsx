import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Upload, X, Search,
  Trophy, Medal, Dumbbell, Bike, PersonStanding, Target, Activity, Flag,
  UtensilsCrossed, Coffee, Pizza, Cookie, Beer, Wine, Utensils,
  Store, ShoppingBag, Tag, Package, Archive, Gem, BookOpen,
  Car, Truck, Wrench,
  Home, Building, Building2, Armchair, Lightbulb, Hammer,
  Music, Music2, Mic, Headphones, Ticket, Film, Tv,
  PartyPopper, Cake, Baby, Heart, Gift, Users,
  Box, Star, Bookmark, Camera, Gamepad2, LayoutGrid,
  School, GraduationCap, BookMarked, Church, HeartHandshake, Megaphone,
  CalendarDays, MapPin, Zap, Info, Sparkle, Sun, Tent, Leaf,
} from "lucide-react";
import { EVENT_ICON_REGISTRY } from "@/lib/eventListingConfig";

// Map registry keys → Lucide components
const ICON_COMPONENT_MAP = {
  trophy: Trophy, medal: Medal, dumbbell: Dumbbell, bike: Bike,
  footprints: PersonStanding, target: Target, activity: Activity, flag: Flag,
  utensils: UtensilsCrossed, coffee: Coffee, pizza: Pizza, "ice-cream": Cookie,
  cookie: Cookie, beer: Beer, wine: Wine, sandwich: Utensils,
  store: Store, "shopping-bag": ShoppingBag, tag: Tag, package: Package,
  archive: Archive, gem: Gem, "book-open": BookOpen,
  car: Car, "car-front": Car, truck: Truck, wrench: Wrench, fuel: Wrench,
  home: Home, building: Building, "building-2": Building2, sofa: Armchair, lamp: Lightbulb, hammer: Hammer,
  music: Music, "music-2": Music2, mic: Mic, headphones: Headphones,
  ticket: Ticket, film: Film, tv: Tv, drama: Music,
  party: PartyPopper, cake: Cake, baby: Baby, heart: Heart, gift: Gift, users: Users,
  box: Box, star: Star, bookmark: Bookmark, camera: Camera, gamepad: Gamepad2, puzzle: LayoutGrid,
  school: School, "graduation-cap": GraduationCap, book: BookMarked, church: Church,
  "hand-heart": HeartHandshake, megaphone: Megaphone, vote: Megaphone,
  calendar: CalendarDays, "map-pin": MapPin, zap: Zap, info: Info,
  sparkles: Sparkle, sun: Sun, tent: Tent, leaf: Leaf,
};

function IconRenderer({ iconKey, size = 20 }) {
  const LucideIcon = ICON_COMPONENT_MAP[iconKey];
  if (LucideIcon) return <LucideIcon size={size} strokeWidth={1.5} />;
  return <span className="text-base font-bold">{(iconKey || "?").charAt(0).toUpperCase()}</span>;
}

const CATEGORY_LABELS = {
  sports: "Sports",
  food: "Food & Drink",
  market: "Market & Shopping",
  auto: "Auto",
  real_estate: "Home & Real Estate",
  entertainment: "Music & Entertainment",
  party: "Party & Family",
  collectibles: "Collectibles",
  community: "Community / School / Church",
  general: "General & Pop-Up",
};

export default function EventIconManager({ tier = "basic", selectedIcon, setSelectedIcon, uploadedImageUrl, setUploadedImageUrl }) {
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState("");

  const isPremium = tier === "premium";
  const isMarquee = tier === "marquee";

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setUploadedImageUrl(result.file_url);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const filteredKeys = useMemo(() => {
    const allKeys = Object.keys(EVENT_ICON_REGISTRY);
    if (!search.trim()) return allKeys;
    const q = search.toLowerCase().trim();
    return allKeys.filter((key) => {
      const meta = EVENT_ICON_REGISTRY[key];
      return (
        key.includes(q) ||
        meta.label.toLowerCase().includes(q) ||
        meta.category.toLowerCase().includes(q) ||
        meta.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [search]);

  const grouped = useMemo(() => {
    const groups = {};
    filteredKeys.forEach((key) => {
      const cat = EVENT_ICON_REGISTRY[key].category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(key);
    });
    return groups;
  }, [filteredKeys]);

  if (isMarquee) {
    return (
      <div className="rounded-lg border border-[#2C4F4E]/20 bg-[#F3E6CF] p-4 text-sm text-[#2C4F4E]">
        Marquee icon management will be handled separately later.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-[#2C4F4E]">Event Icon</Label>
        <p className="text-xs text-slate-500 mt-1">
          {isPremium
            ? "Choose an icon or upload a logo/image for your Premium event pin."
            : "Choose from the outline icon library."}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, category, or keyword…"
          className="pl-9 bg-[#F3E6CF] border-[#2C4F4E]"
        />
      </div>

      {/* Grouped icon grid */}
      <div className="max-h-[420px] overflow-y-auto space-y-5 pr-1">
        {Object.keys(grouped).length === 0 && (
          <p className="text-sm text-slate-500 py-4 text-center">No icons match your search.</p>
        )}
        {Object.entries(grouped).map(([cat, keys]) => (
          <div key={cat}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2C4F4E]/60 mb-2">
              {CATEGORY_LABELS[cat] || cat}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {keys.map((iconKey) => {
                const meta = EVENT_ICON_REGISTRY[iconKey];
                const selected = selectedIcon === iconKey && !uploadedImageUrl;
                return (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => {
                      setSelectedIcon(iconKey);
                      if (isPremium) setUploadedImageUrl("");
                    }}
                    title={meta.label}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all text-center ${
                      selected
                        ? "border-[#F4A849] bg-white shadow-md text-[#2C4F4E]"
                        : "border-[#2C4F4E]/20 bg-[#F3E6CF] hover:border-[#2C4F4E]/50 hover:bg-white text-[#2C4F4E]/70 hover:text-[#2C4F4E]"
                    }`}
                  >
                    <IconRenderer iconKey={iconKey} size={20} />
                    <span className="text-[10px] leading-tight font-medium line-clamp-2">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Premium upload */}
      {isPremium && (
        <div className="rounded-lg border border-[#2C4F4E]/20 bg-white/70 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-[#2C4F4E]">Uploaded logo / image</p>
              <p className="text-xs text-slate-500">Premium events can use a custom branded image instead of an icon.</p>
            </div>
            <label className="inline-flex">
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={isUploading} />
              <span className="inline-flex items-center gap-2 rounded-md bg-[#5DADA5] px-3 py-2 text-sm font-medium text-white cursor-pointer hover:bg-[#4A9B93]">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isUploading ? "Uploading..." : "Upload Image"}
              </span>
            </label>
          </div>

          {uploadedImageUrl && (
            <div className="relative w-24 h-24 rounded-full overflow-hidden border border-[#2C4F4E]/20 bg-white">
              <img src={uploadedImageUrl} alt="Uploaded event logo" className="w-full h-full object-cover" />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute top-1 right-1 h-7 w-7"
                onClick={() => setUploadedImageUrl("")}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}