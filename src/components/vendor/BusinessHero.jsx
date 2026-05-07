import React from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin, Store } from "lucide-react";

export default function BusinessHero({ profile, activeCheckIn }) {
  return (
    <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="h-28 bg-gradient-to-r from-[#5DADA5] via-[#6FC3BA] to-[#F4A849]" />
      <div className="-mt-12 p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-end">
        <div className="h-24 w-24 rounded-3xl border-4 border-background bg-muted shadow flex items-center justify-center overflow-hidden">
          {profile?.logo_url ? (
            <img src={profile.logo_url} alt={profile.business_name} className="h-full w-full object-cover" />
          ) : (
            <Store className="h-10 w-10 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{profile?.business_name || "My Business"}</h1>
            <Badge className="bg-[#F4A849] text-[#2C4F4E] capitalize">{profile?.tier || "starter"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{profile?.category || "Vendor"}</p>
          {profile?.description && <p className="max-w-3xl text-sm text-muted-foreground">{profile.description}</p>}
          {activeCheckIn && (
            <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
              <MapPin className="h-3.5 w-3.5" /> Live now
            </div>
          )}
        </div>
      </div>
    </section>
  );
}