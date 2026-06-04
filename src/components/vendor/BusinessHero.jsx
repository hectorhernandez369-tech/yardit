import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Camera, CheckCircle2, Loader2, MapPin, Palette, Phone, Pencil, Store, Tag } from "lucide-react";
import { toast } from "sonner";

const categories = [
  "Food Truck", "Coffee & Drinks", "Desserts", "Bakery", "Catering", "Farmers Market", "Fresh Produce", "BBQ", "Tacos", "Pizza", "Ice Cream",
  "Retail", "Boutique", "Vintage", "Thrift", "Handmade Goods", "Art", "Crafts", "Jewelry", "Home Decor", "Furniture", "Collectibles", "Books", "Toys",
  "Health & Wellness", "Fitness", "Beauty", "Hair & Barber", "Skincare", "Massage", "Pet Services", "Auto Services", "Repair Services", "Cleaning Services",
  "Entertainment", "Music", "Photography", "Party Services", "Kids Activities", "Community Organization", "Nonprofit", "YARDIT EVENT", "Other"
];

const heroColors = [
  ["White", "#FFFFFF"],
  ["Soft Teal", "#E8F7F5"],
  ["Deep Teal", "#D7F0ED"],
  ["Warm Cream", "#FFF7E8"],
  ["Light Gold", "#FFF1D6"],
  ["Sunset", "#FFE8CC"],
  ["Slate", "#F8FAFC"],
  ["Cloud Blue", "#EFF6FF"],
  ["Sky", "#E0F2FE"],
  ["Blush", "#FFF1F2"],
  ["Rose", "#FFE4E6"],
  ["Peach", "#FFEDD5"],
  ["Mint", "#ECFDF5"],
  ["Sage", "#F0FDF4"],
  ["Lavender", "#F5F3FF"],
  ["Lilac", "#FAE8FF"],
  ["Sand", "#F5EFE0"],
  ["Parchment", "#F3E6CF"],
  ["Charcoal", "#F1F5F9"],
  ["Pearl", "#F8F5F0"]
];

export default function BusinessHero({ profile, activeCheckIn, onRefresh, editable = true, asHeader = false }) {
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const logoInputRef = useRef(null);
  const backgroundInputRef = useRef(null);

  const fields = {
    business_name: { label: "Business name", entityField: "business_name", value: profile?.business_name || "" },
    business_category: { label: "Category", entityField: "business_category", value: profile?.category || "" },
    phone: { label: "Phone number", entityField: "phone", value: profile?.phone || "" },
    location: { label: "Location", entityField: "location", value: profile?.location || "" },
    description: { label: "Description", entityField: "description", value: profile?.description || "" },
    hero_background_color: { label: "Hero background", entityField: "hero_background_color", value: profile?.hero_background_color || "#FFFFFF" },
  };

  const heroBackgroundColor = profile?.hero_background_color && profile.hero_background_color !== "#FFFFFF" ? profile.hero_background_color : "#E8F7F5";
  const heroImage = profile?.featured_photo_url || profile?.photo_urls?.[0] || "";

  const startEdit = (field) => {
    if (!editable) return;
    setEditing(field);
    setValue(fields[field].value);
  };

  const saveEdit = async () => {
    if (!editing || !profile?.id) return;
    setSaving(true);
    const updatePayload = { [fields[editing].entityField]: value };
    if (editing === "business_name") updatePayload.vendor_display_name = value;
    await base44.entities.VendorAccount.update(profile.id, updatePayload);
    setSaving(false);
    setEditing(null);
    toast.success("Business profile updated");
    onRefresh?.();
  };

  const uploadLogo = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.VendorAccount.update(profile.id, { business_logo: file_url });
    setUploadingLogo(false);
    toast.success("Business photo updated");
    onRefresh?.();
    event.target.value = "";
  };

  const uploadBackground = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    setUploadingBackground(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.VendorAccount.update(profile.id, { featured_photo_url: file_url });
    setUploadingBackground(false);
    toast.success("Background updated");
    onRefresh?.();
    event.target.value = "";
  };

  const EditableButton = ({ field, children, className = "" }) => {
    if (!editable) return <div className={className}>{children}</div>;

    return (
      <button type="button" onClick={() => startEdit(field)} className={`group text-left transition hover:bg-white/70 ${className}`}>
        {children}
        <Pencil className="ml-1.5 inline h-3 w-3 opacity-0 group-hover:opacity-60" />
      </button>
    );
  };

  return (
    <section className={asHeader ? "overflow-hidden bg-white min-w-0" : "overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md min-w-0"}>
      <div
        className={asHeader ? "relative max-w-7xl mx-auto w-full px-3 sm:px-6 py-3 sm:py-8 min-h-[118px] sm:min-h-[230px]" : "relative p-3 sm:p-6 min-h-[135px] sm:min-h-[250px]"}
        style={{
          backgroundColor: heroBackgroundColor,
          backgroundImage: heroImage ? `linear-gradient(135deg, rgba(44,79,78,.92), rgba(93,173,165,.55)), url(${heroImage})` : `radial-gradient(circle at top right, rgba(244,168,73,.35), transparent 34%), linear-gradient(135deg, ${heroBackgroundColor}, #ffffff)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {editable && (
          <div className="absolute right-3 top-3 z-20">
            <Button
              type="button"
              size="sm"
              onClick={() => backgroundInputRef.current?.click()}
              disabled={uploadingBackground}
              className="h-8 rounded-full bg-white/90 px-3 text-xs font-semibold text-[#2C4F4E] shadow-md hover:bg-white"
            >
              {uploadingBackground ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Pencil className="mr-1.5 h-3.5 w-3.5" />}
              Edit background
            </Button>
            <input ref={backgroundInputRef} type="file" accept="image/*" onChange={uploadBackground} className="hidden" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 sm:h-24 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="relative flex h-full flex-col justify-end gap-2 sm:gap-4">
          <div className="flex items-end gap-2 sm:gap-5 min-w-0">
            <button
              type="button"
              onClick={() => editable && logoInputRef.current?.click()}
              disabled={!editable || uploadingLogo}
              className="group relative h-12 w-12 sm:h-28 sm:w-28 rounded-xl sm:rounded-3xl border-2 sm:border-4 border-white bg-white shadow-xl flex items-center justify-center overflow-hidden shrink-0 disabled:cursor-default"
              title={editable ? "Upload business photo" : undefined}
            >
              {profile?.logo_url || profile?.business_logo ? (
                <img src={profile.logo_url || profile.business_logo} alt={profile.business_name} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-5 w-5 sm:h-11 sm:w-11 text-[#5DADA5]" />
              )}
              {editable && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition group-hover:opacity-100">
                  {uploadingLogo ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                </div>
              )}
              <input ref={logoInputRef} type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
            </button>
            <div className="min-w-0 flex-1 pb-1 text-black">
              <div className="flex flex-wrap items-center gap-2">
                <EditableButton field="business_name" className="rounded-xl px-1.5 -mx-1.5 hover:bg-white/15">
                  <h1 className="inline text-xl sm:text-4xl font-black tracking-tight break-words leading-tight drop-shadow">{profile?.business_name || "My Business"}</h1>
                </EditableButton>
                {profile?.is_verified_vendor && <Badge className="bg-blue-100 text-blue-800 shadow-sm"><CheckCircle2 className="h-3 w-3" /> Verified Vendor</Badge>}
                {activeCheckIn && <Badge className="bg-emerald-100 text-black shadow-sm">Live now</Badge>}
              </div>
              <EditableButton field="description" className="mt-0.5 sm:mt-1 rounded-xl px-2 py-0.5 sm:py-1 -mx-2 hover:bg-white/15">
                <p className="max-w-3xl text-[11px] sm:text-sm leading-snug sm:leading-relaxed text-black line-clamp-2">{profile?.description || "Add a brief description so customers know what your business offers."}</p>
              </EditableButton>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-2 text-[10px] sm:text-sm text-black">
            {editable && (
              <EditableButton field="hero_background_color" className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 sm:gap-1.5 sm:py-1 sm:px-3 border border-white shadow-sm">
                <Palette className="h-3.5 w-3.5 text-[#5DADA5]" /> Cover
              </EditableButton>
            )}
            <EditableButton field="business_category" className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 sm:gap-1.5 sm:py-1 sm:px-3 border border-white shadow-sm">
              <Tag className="h-3.5 w-3.5 text-[#5DADA5]" /> {profile?.category || "Category"}
            </EditableButton>
            <EditableButton field="phone" className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 sm:gap-1.5 sm:py-1 sm:px-3 border border-white shadow-sm">
              <Phone className="h-3.5 w-3.5 text-[#5DADA5]" /> {profile?.phone || "Phone"}
            </EditableButton>
            <EditableButton field="location" className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 sm:gap-1.5 sm:py-1 sm:px-3 border border-white shadow-sm">
              <MapPin className="h-3.5 w-3.5 text-[#5DADA5]" /> {profile?.location || "Location"}
            </EditableButton>
          </div>
        </div>
      </div>
      {activeCheckIn && (
        <div className="border-t border-slate-200 bg-white px-3 sm:px-5 py-2 sm:py-3">
          <div className="rounded-xl bg-white/70 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-[#2C4F4E] break-words">
            <span className="mr-1 inline-block h-3 w-3 rounded-full bg-emerald-500 align-middle" />
            <span className="font-bold text-black">LIVE NOW</span>
            <span className="text-black"> · Open until {format(new Date(activeCheckIn.checkin_end_time), "h:mm a")}</span>
          </div>
        </div>
      )}

      {editing && (
        <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-6 space-y-3">
          <p className="text-sm font-semibold text-[#1F2937]">Edit {fields[editing].label}</p>
          {editing === "hero_background_color" ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {heroColors.map(([label, color]) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue(color)}
                  className={`rounded-2xl border p-3 text-left text-sm font-medium text-black transition ${value === color ? "border-[#5DADA5] ring-2 ring-[#5DADA5]/30" : "border-slate-200"}`}
                  style={{ backgroundColor: color }}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : editing === "business_category" ? (
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger className="bg-white text-black">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : editing === "description" ? (
            <Textarea value={value} onChange={(e) => setValue(e.target.value)} className="min-h-24 bg-white text-black placeholder:text-black/60" />
          ) : (
            <Input value={value} onChange={(e) => setValue(e.target.value)} className="bg-white text-black placeholder:text-black/60" />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-black">Save</Button>
          </div>
        </div>
      )}
    </section>
  );
}