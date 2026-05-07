import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Phone, Pencil, Store, Tag } from "lucide-react";
import { toast } from "sonner";

const categories = [
"Food Truck", "Coffee & Drinks", "Desserts", "Bakery", "Catering", "Farmers Market", "Fresh Produce", "BBQ", "Tacos", "Pizza", "Ice Cream",
"Retail", "Boutique", "Vintage", "Thrift", "Handmade Goods", "Art", "Crafts", "Jewelry", "Home Decor", "Furniture", "Collectibles", "Books", "Toys",
"Health & Wellness", "Fitness", "Beauty", "Hair & Barber", "Skincare", "Massage", "Pet Services", "Auto Services", "Repair Services", "Cleaning Services",
"Entertainment", "Music", "Photography", "Party Services", "Kids Activities", "Community Organization", "Nonprofit", "Other"];


export default function BusinessHero({ profile, activeCheckIn, onRefresh }) {
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fields = {
    business_name: { label: "Business name", entityField: "business_name", value: profile?.business_name || "" },
    business_category: { label: "Category", entityField: "business_category", value: profile?.category || "" },
    phone: { label: "Phone number", entityField: "phone", value: profile?.phone || "" },
    location: { label: "Location", entityField: "location", value: profile?.location || "" },
    description: { label: "Description", entityField: "description", value: profile?.description || "" }
  };

  const startEdit = (field) => {
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

  const EditableButton = ({ field, children, className = "" }) =>
  <button type="button" onClick={() => startEdit(field)} className={`group text-left transition hover:bg-slate-100 ${className}`}>
      {children}
      <Pencil className="ml-1.5 inline h-3 w-3 opacity-0 group-hover:opacity-60" />
    </button>;


  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      
      <div className="p-5 sm:p-7 flex flex-col sm:flex-row gap-5 sm:items-center">
        <div className="h-24 w-24 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
          {profile?.logo_url ?
          <img src={profile.logo_url} alt={profile.business_name} className="h-full w-full object-cover" /> :

          <Store className="h-10 w-10 text-slate-400" />
          }
        </div>
        <div className="flex-1 space-y-3 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#5DADA5]">Public business profile</p>
          <div className="flex flex-wrap items-center gap-2">
            <EditableButton field="business_name" className="rounded-lg px-1 -mx-1">
              <h1 className="inline text-2xl sm:text-3xl font-bold text-[#1F2937]">{profile?.business_name || "My Business"}</h1>
            </EditableButton>
            <Badge className="bg-[#F4A849] text-[#2C4F4E] capitalize">{profile?.tier || "starter"}</Badge>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <EditableButton field="business_category" className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 border border-slate-200">
              <Tag className="h-3.5 w-3.5 text-[#5DADA5]" /> {profile?.category || "Category not added"}
            </EditableButton>
            <EditableButton field="phone" className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 border border-slate-200">
              <Phone className="h-3.5 w-3.5 text-[#5DADA5]" /> {profile?.phone || "Phone not added"}
            </EditableButton>
            <EditableButton field="location" className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 border border-slate-200">
              <MapPin className="h-3.5 w-3.5 text-[#5DADA5]" /> {profile?.location || "Location not added"}
            </EditableButton>
          </div>
          <EditableButton field="description" className="rounded-xl px-2 py-1 -mx-2">
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600">{profile?.description || "Add a brief description so customers know what your business offers."}</p>
          </EditableButton>
        </div>
        {activeCheckIn &&
        <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 shrink-0">
            <MapPin className="h-4 w-4" /> Live now
          </div>
        }
      </div>

      {editing &&
      <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-6 space-y-3">
          <p className="text-sm font-semibold text-[#1F2937]">Edit {fields[editing].label}</p>
          {editing === "business_category" ?
        <Select value={value} onValueChange={setValue}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) =>
            <SelectItem key={category} value={category}>{category}</SelectItem>
            )}
              </SelectContent>
            </Select> :
        editing === "description" ?
        <Textarea value={value} onChange={(e) => setValue(e.target.value)} className="min-h-24 bg-white" /> :

        <Input value={value} onChange={(e) => setValue(e.target.value)} className="bg-white" />
        }
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white">Save</Button>
          </div>
        </div>
      }
    </section>);

}