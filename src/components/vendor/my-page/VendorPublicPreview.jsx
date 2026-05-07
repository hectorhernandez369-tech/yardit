import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, ExternalLink, Facebook, Globe, Instagram, MapPin, Music2 } from "lucide-react";
import BusinessHero from "@/components/vendor/BusinessHero";
import { format } from "date-fns";
import { getVendorTierConfig, isLiveVendorCheckIn } from "@/lib/vendorTiers";

const socialLinks = [
  ["website", Globe, "Website"],
  ["facebook_url", Facebook, "Facebook"],
  ["instagram_url", Instagram, "Instagram"],
  ["tiktok_url", Music2, "TikTok"],
];

export default function VendorPublicPreview({ account, pins, checkIns, updates }) {
  const tier = getVendorTierConfig(account.vendor_tier);
  const photos = account.photo_urls || [];
  const liveItems = (checkIns || []).filter(isLiveVendorCheckIn);
  const activeCheckIn = liveItems[0];
  const pinName = (id) => pins.find((pin) => pin.id === id)?.pin_name || "Vendor Pin";
  const heroProfile = {
    id: account.id,
    business_name: account.business_name,
    logo_url: account.business_logo,
    tier: account.vendor_tier,
    category: account.business_category,
    description: account.description,
    phone: account.phone,
    location: account.location,
    hero_background_color: account.hero_background_color,
  };

  return (
    <div className="rounded-3xl border-2 border-[#2C4F4E]/20 bg-white shadow-sm overflow-hidden">
      <BusinessHero profile={heroProfile} activeCheckIn={activeCheckIn} editable={false} />
      <CardContent className="p-5 sm:p-8 space-y-6">

        <div className="flex flex-wrap gap-2">
          {socialLinks.filter(([key]) => account[key]).map(([key, Icon, label]) => (
            <a key={key} href={account[key]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm text-[#2C4F4E] hover:bg-[#F3E6CF]">
              <Icon className="h-4 w-4" /> {label} <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>

        <section>
          <h3 className="font-bold text-[#2C4F4E] mb-3">Photos</h3>
          {photos.length ? <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{photos.map((url) => <img key={url} src={url} alt="Vendor" className="h-32 w-full rounded-2xl object-cover" />)}</div> : <p className="text-sm text-slate-600">Add photos to make your vendor page stand out.</p>}
        </section>

        <section>
          <h3 className="font-bold text-[#2C4F4E] mb-3">Active Locations</h3>
          {liveItems.length ? <div className="grid gap-3">{liveItems.map((item) => <Card key={item.id} className="shadow-none"><CardContent className="p-4"><p className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-[#5DADA5]" />{pinName(item.vendor_pin_id)}</p><p className="text-sm text-slate-600">{item.checkin_display_address}</p><p className="text-xs text-slate-500">Live until {format(new Date(item.checkin_end_time), "h:mm a")}</p></CardContent></Card>)}</div> : <p className="text-sm text-slate-600">No live locations right now. Check in a pin to appear on the map.</p>}
        </section>

        <section>
          <h3 className="font-bold text-[#2C4F4E] mb-3">Updates</h3>
          <div className="space-y-3">{updates.length ? updates.map((update) => <div key={update.id} className="rounded-2xl bg-[#F3E6CF]/70 p-4"><p className="text-sm">{update.text}</p><p className="mt-2 text-xs text-slate-500">{update.likes || 0} likes</p></div>) : <p className="text-sm text-slate-600">No updates yet.</p>}</div>
        </section>
      </CardContent>
    </div>
  );
}