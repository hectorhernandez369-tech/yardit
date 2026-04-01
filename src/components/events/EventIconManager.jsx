import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, Search,
  Trophy, Medal, Dumbbell, Bike, Footprints, Target, Activity, Flag,
  Utensils, Coffee, Pizza, IceCream, Cookie, Beer, Wine, Sandwich,
  Store, ShoppingBag, Tag, Package, Archive, Gem, BookOpen,
  Car, CarFront, Truck, Wrench, Fuel,
  Home, Building, Building2, Sofa, Lamp, Hammer,
  Music, Music2, Mic, Headphones, Ticket, Film, Tv, Drama,
  PartyPopper, Cake, Baby, Heart, Gift, Users,
  Box, Star, Bookmark, Camera, Gamepad, Puzzle,
  School, GraduationCap, Book, Church, HandHeart, Megaphone, Vote,
  Calendar, MapPin, Zap, Info, Sparkles, Sun, Tent, Leaf
} from "lucide-react";
import { getEventIconOptionsForTier, EVENT_ICON_REGISTRY } from "@/lib/eventListingConfig";

const LUCIDE_MAP = {
  trophy: Trophy, medal: Medal, dumbbell: Dumbbell, bike: Bike,
  footprints: Footprints, target: Target, activity: Activity, flag: Flag,
  utensils: Utensils, coffee: Coffee, pizza: Pizza, "ice-cream": IceCream,
  cookie: Cookie, beer: Beer, wine: Wine, sandwich: Sandwich,
  store: Store, "shopping-bag": ShoppingBag, tag: Tag, package: Package,
  archive: Archive, gem: Gem, "book-open": BookOpen,
  car: Car, "car-front": CarFront, truck: Truck, wrench: Wrench, fuel: Fuel,
  home: Home, building: Building, "building-2": Building2, sofa: Sofa,
  lamp: Lamp, hammer: Hammer,
  music: Music, "music-2": Music2, mic: Mic, headphones: Headphones,
  ticket: Ticket, film: Film, tv: Tv, drama: Drama,
  party: PartyPopper, cake: Cake, baby: Baby, heart: Heart, gift: Gift, users: Users,
  box: Box, star: Star, bookmark: Bookmark, camera: Camera,
  gamepad: Gamepad, puzzle: Puzzle,
  school: School, "graduation-cap": GraduationCap, book: Book, church: Church,
  "hand-heart": HandHeart, megaphone: Megaphone, vote: Vote,
  calendar: Calendar, "map-pin": MapPin, zap: Zap, info: Info,
  sparkles: Sparkles, sun: Sun, tent: Tent, leaf: Leaf,
};

function LucideIcon({ name, className }) {
  const Icon = LUCIDE_MAP[name];
  if (!Icon) return <span className={className}>•</span>;
  return <Icon className={className} strokeWidth={1.5} />;
}

export default function EventIconManager({ tier = "basic", selectedIcon, setSelectedIcon, uploadedImageUrl, setUploadedImageUrl }) {
  const [search, setSearch] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const isPremium = tier === "premium";
  const isMarquee = tier === "marquee";
  const iconOptions = getEventIconOptionsForTier(tier);

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return iconOptions;
    const q = search.toLowerCase().trim();
    return iconOptions.filter((key) => {
      const meta = EVENT_ICON_REGISTRY[key];
      if (!meta) return key.includes(q);
      return (
        meta.label.toLowerCase().includes(q) ||
        meta.category.toLowerCase().includes(q) ||
        (meta.tags || []).some((t) => t.includes(q)) ||
        key.includes(q)
      );
    });
  }, [search, iconOptions]);

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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C4F4E]/50 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, category, or keyword…"
          className="pl-9 bg-[#F3E6CF] border-[#2C4F4E]"
        />
      </div>

      {/* Icon grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
        {filteredIcons.length === 0 && (
          <p className="col-span-full text-sm text-slate-500 text-center py-6">No icons match "{search}"</p>
        )}
        {filteredIcons.map((icon) => {
          const meta = EVENT_ICON_REGISTRY[icon];
          const selected = selectedIcon === icon && !uploadedImageUrl;
          return (
            <button
              key={icon}
              type="button"
              onClick={() => {
                setSelectedIcon(icon);
                if (isPremium) setUploadedImageUrl("");
              }}
              className={`rounded-xl border p-3 flex flex-col items-center gap-1.5 text-center transition-all ${
                selected
                  ? "border-[#F4A849] bg-white shadow-md"
                  : "border-[#2C4F4E]/20 bg-[#F3E6CF] hover:border-[#2C4F4E]/50 hover:bg-white/60"
              }`}
            >
              <LucideIcon
                name={icon}
                className={`w-6 h-6 ${selected ? "text-[#2C4F4E]" : "text-[#2C4F4E]/70"}`}
              />
              <span className="text-[10px] leading-tight font-medium text-[#2C4F4E] line-clamp-2">
                {meta?.label || icon.replace(/-/g, " ")}
              </span>
            </button>
          );
        })}
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