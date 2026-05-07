import React from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Store, Tag } from "lucide-react";

export default function BusinessHero({ profile, activeCheckIn }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="h-2 bg-[#5DADA5]" />
      <div className="p-5 sm:p-7 flex flex-col sm:flex-row gap-5 sm:items-center">
        <div className="h-24 w-24 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
          {profile?.logo_url ? (
            <img src={profile.logo_url} alt={profile.business_name} className="h-full w-full object-cover" />
          ) : (
            <Store className="h-10 w-10 text-slate-400" />
          )}
        </div>
        <div className="flex-1 space-y-3 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#5DADA5]">Public business profile</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937]">{profile?.business_name || "My Business"}</h1>
            <Badge className="bg-[#F4A849] text-[#2C4F4E] capitalize">{profile?.tier || "starter"}</Badge>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 border border-slate-200">
              <Tag className="h-3.5 w-3.5 text-[#5DADA5]" /> {profile?.category || "Vendor"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 border border-slate-200">
              <Phone className="h-3.5 w-3.5 text-[#5DADA5]" /> {profile?.phone || "Phone not added"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 border border-slate-200">
              <MapPin className="h-3.5 w-3.5 text-[#5DADA5]" /> {profile?.location || "Location not added"}
            </span>
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">{profile?.description || "Add a brief description so customers know what your business offers."}</p>
        </div>
        {activeCheckIn && (
          <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 shrink-0">
            <MapPin className="h-4 w-4" /> Live now
          </div>
        )}
      </div>
    </section>
  );
}