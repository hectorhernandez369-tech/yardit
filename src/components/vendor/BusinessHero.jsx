import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Camera, Loader2, MapPin, Palette, Phone, Pencil, Store, Tag } from "lucide-react";
import { toast } from "sonner";

const categories = [
  "Food Truck", "Coffee & Drinks", "Desserts", "Bakery", "Catering", "Farmers Market", "Fresh Produce", "BBQ", "Tacos", "Pizza", "Ice Cream",
  "Retail", "Boutique", "Vintage", "Thrift", "Handmade Goods", "Art", "Crafts", "Jewelry", "Home Decor", "Furniture", "Collectibles", "Books", "Toys",
  "Health & Wellness", "Fitness", "Beauty", "Hair & Barber", "Skincare", "Massage", "Pet Services", "Auto Services", "Repair Services", "Cleaning Services",
  "Entertainment", "Music", "Photography", "Party Services", "Kids Activities", "Community Organization", "Nonprofit", "Other"
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
  const logoInputRef = useRef(null);

  const fields = {
    business_name: { label: "Business name", entityField: "business_name", value: profile?.business_name || "" },
    business_category: { label: "Category", entityField: "business_category", value: profile?.category || "" },
    phone: { label: "Phone number", entityField: "phone", value: profile?.phone || "" },
    location: { label: "Location", entityField: "location", value: profile?.location || "" },
    description: { label: "Description", entityField: "description", value: profile?.description || "" },
    hero_background_color: { label: "Hero background", entityField: "hero_background_color", value: profile?.hero_background_color || "#FFFFFF" },
  };

  const heroBackgroundColor = profile?.hero_background_color && profile.hero_background_color !== "#FFFFFF" ? profile.hero_background_color : "#5DADA5";

  const startEdit = (field) => {
    if (!editable) return;
    setEditing(field);
    setValue(fields[field].value);
  };

  const saveEdit = async () => {
    if (!editing || !profile?.id) return;
    setSaving(true);
    await base44.entities.VendorAccount.update(profile.id, { [fields[editing].entityField]: value });
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
    <section className={asHeader ? "overflow-hidden bg-white min-w-0" : "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm min-w-0"}>
      <div className={asHeader ? "max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-8 flex flex-col sm:flex-row gap-4 sm:gap-5 sm:items-start" : "p-4 sm:p-7 lg:p-9 flex flex-col sm:flex-row gap-4 sm:gap-5 sm:items-start"} style={{ backgroundColor: heroBackgroundColor }}>
        <button
          type="button"
          onClick={() => editable && logoInputRef.current?.click()}
          disabled={!editable || uploadingLogo}
          className="group relative h-24 w-24 rounded-2xl border border-slate-100 bg-white/80 shadow-sm flex items-center justify-center overflow-hidden shrink-0 disabled:cursor-default"
          title={editable ? "Upload business photo" : undefined}
        >
          {profile?.logo_url || profile?.business_logo ? (
            <img src={profile.logo_url || profile.business_logo} alt={profile.business_name} className="h-full w-full object-cover" />
          ) : (
            <Store className="h-10 w-10 text-slate-400" />
          )}
          {editable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition group-hover:opacity-100">
              {uploadingLogo ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            </div>
          )}
          <input ref={logoInputRef} type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
        </button>
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <EditableButton field="business_name" className="rounded-lg px-1 -mx-1">
              <h1 className="inline text-2xl sm:text-3xl font-bold text-[#1F2937] break-words">{profile?.business_name || "My Business"}</h1>
            </EditableButton>
            <Badge className="bg-[#FFF1D6] text-[#7A4B00] border border-[#F4A849]/40 capitalize">♨ {profile?.tier || "starter"}</Badge>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            {editable && (
              <EditableButton field="hero_background_color" className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 border border-slate-200">
                <Palette className="h-3.5 w-3.5 text-[#5DADA5]" /> Background
              </EditableButton>
            )}
            <EditableButton field="business_category" className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 border border-slate-200">
              <Tag className="h-3.5 w-3.5 text-[#5DADA5]" /> {profile?.category || "Category not added"}
            </EditableButton>
            <EditableButton field="phone" className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 border border-slate-200">
              <Phone className="h-3.5 w-3.5 text-[#5DADA5]" /> {profile?.phone || "Phone not added"}
            </EditableButton>
            <EditableButton field="location" className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 border border-slate-200">
              <MapPin className="h-3.5 w-3.5 text-[#5DADA5]" /> {profile?.location || "Location not added"}
            </EditableButton>
          </div>
          <EditableButton field="description" className="rounded-xl px-2 py-1 -mx-2">
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600">{profile?.description || "Add a brief description so customers know what your business offers."}</p>
          </EditableButton>
        </div>
      </div>
      {activeCheckIn && (
        <div className="border-t border-slate-200 bg-white px-5 py-3">
          <div className="rounded-xl bg-[#E8F7F5] px-4 py-3 text-sm text-[#2C4F4E] break-words">
            <span className="mr-1 inline-block h-3 w-3 rounded-full bg-emerald-500 align-middle" />
            <span className="font-bold text-[#00A88A]">LIVE NOW</span>
            <span className="text-slate-600"> · Open until {format(new Date(activeCheckIn.checkin_end_time), "h:mm a")}</span>
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
                  className={`rounded-2xl border p-3 text-left text-sm font-medium transition ${value === color ? "border-[#5DADA5] ring-2 ring-[#5DADA5]/30" : "border-slate-200"}`}
                  style={{ backgroundColor: color }}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : editing === "business_category" ? (
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : editing === "description" ? (
            <Textarea value={value} onChange={(e) => setValue(e.target.value)} className="min-h-24 bg-white" />
          ) : (
            <Input value={value} onChange={(e) => setValue(e.target.value)} className="bg-white" />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white">Save</Button>
          </div>
        </div>
      )}
    </section>
  );
}