import React from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Facebook, Globe, Instagram, MapPin, Music2 } from "lucide-react";
import BusinessHero from "@/components/vendor/BusinessHero";
import { format } from "date-fns";
import { getVendorTierConfig, isLiveVendorCheckIn } from "@/lib/vendorTiers";

const socialLinks = [
  ["website", Globe, "Website"],
  ["facebook_url", Facebook, "Facebook"],
  ["instagram_url", Instagram, "Instagram"],
  ["tiktok_url", Music2, "TikTok"],
];

function createMapPreviewIcon(pin) {
  const image = pin?.pin_logo_url || pin?.pin_icon_url;
  const html = image
    ? `<div style="width:42px;height:50px;position:relative;"><img src="${image}" style="width:42px;height:42px;object-fit:cover;border-radius:14px;border:2px solid #2C4F4E;background:white;box-shadow:0 4px 10px rgba(0,0,0,.25);"/><div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:10px solid #2C4F4E;"></div></div>`
    : `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;background:#F4A849;border:3px solid #2C4F4E;box-shadow:0 4px 10px rgba(0,0,0,.25);transform:rotate(-45deg);"><div style="width:9px;height:9px;border-radius:9999px;background:#2C4F4E;margin:8px auto 0;"></div></div>`;

  return L.divIcon({ className: "vendor-public-preview-pin", html, iconSize: [42, 50], iconAnchor: [21, 50] });
}

export default function VendorPublicPreview({ account, pins, checkIns, updates }) {
  const tier = getVendorTierConfig(account.vendor_tier);
  const liveItems = (checkIns || []).filter(isLiveVendorCheckIn);
  const activeCheckIn = liveItems[0];
  const pinFor = (id) => pins.find((pin) => pin.id === id);
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
    featured_photo_url: account.featured_photo_url,
    photo_urls: account.photo_urls,
  };

  return (
    <div className="rounded-3xl border-2 border-[#2C4F4E]/20 bg-white shadow-sm overflow-hidden min-w-0">
      <BusinessHero profile={heroProfile} activeCheckIn={activeCheckIn} editable={false} />
      <CardContent className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">

        <div className="flex flex-wrap gap-2">
          {socialLinks.filter(([key]) => account[key]).map(([key, Icon, label]) => (
            <a key={key} href={account[key]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm text-[#2C4F4E] hover:bg-[#F3E6CF]">
              <Icon className="h-4 w-4" /> {label} <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>

        <section>
          <h3 className="font-bold text-[#2C4F4E] mb-3">Active Location</h3>
          {liveItems.length ? (
            <div className="grid gap-3">
              {liveItems.map((item) => {
                const pin = pinFor(item.vendor_pin_id);
                return (
                  <Card key={item.id} className="shadow-none border-[#5DADA5]/30">
                    <CardContent className="p-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="h-14 w-14 shrink-0 rounded-2xl bg-[#F3E6CF] border border-[#2C4F4E]/10 overflow-hidden flex items-center justify-center">
                          {pin?.pin_logo_url || pin?.pin_icon_url ? (
                            <img src={pin.pin_logo_url || pin.pin_icon_url} alt={pin?.pin_name || "Vendor Pin"} className="h-full w-full object-cover" />
                          ) : (
                            <MapPin className="h-6 w-6 text-[#5DADA5]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#2C4F4E]">{pin?.pin_name || "Vendor Pin"}</p>
                          <p className="text-sm text-slate-600 break-words">{item.checkin_display_address}</p>
                          {pin?.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{pin.description}</p>}
                          <p className="mt-2 text-xs text-slate-500">Live until {format(new Date(item.checkin_end_time), "h:mm a")}</p>
                        </div>
                      </div>
                      <div className="h-36 overflow-hidden rounded-2xl border border-[#5DADA5]/30 bg-slate-100">
                        <MapContainer center={[item.checkin_latitude, item.checkin_longitude]} zoom={16} className="h-full w-full" scrollWheelZoom={false} dragging={false} zoomControl={false} attributionControl={false}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <Marker position={[item.checkin_latitude, item.checkin_longitude]} icon={createMapPreviewIcon(pin)} />
                        </MapContainer>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No live locations right now. Check in a pin to appear on the map.</p>
          )}
        </section>

        <section>
          <h3 className="font-bold text-[#2C4F4E] mb-3">Updates</h3>
          <div className="space-y-3">{updates.length ? updates.map((update) => <div key={update.id} className="rounded-2xl bg-[#F3E6CF]/70 p-4"><p className="text-sm">{update.text}</p><p className="mt-2 text-xs text-slate-500">{update.likes || 0} likes</p></div>) : <p className="text-sm text-slate-600">No updates yet.</p>}</div>
        </section>
      </CardContent>
    </div>
  );
}