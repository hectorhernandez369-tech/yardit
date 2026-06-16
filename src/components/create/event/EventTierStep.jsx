import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ChevronDown, Loader2, Minus, Plus, Upload, X } from "lucide-react";
import EventPhotoUpload from "./EventPhotoUpload";
import MarqueeSlotsEditor from "./MarqueeSlotsEditor";
import EventIconManager from "@/components/events/EventIconManager";
import { shiftDate } from "@/lib/eventSchedule";
import {
  RESIDENTIAL_EVENT_ADD_ONS,
  RESIDENTIAL_EVENT_COMING_SOON_PACKAGES,
  getResidentialEventPriceBreakdown,
} from "@/lib/eventListingConfig";

const money = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

function AddOnCard({ title, price, description, selected, onToggle, children }) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => onToggle(!selected);
  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className={`transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#006168]/30 ${selected ? "bg-[#e6f7ef] ring-2 ring-emerald-500/70 border-l-4 border-emerald-600" : "bg-white hover:bg-slate-50"}`}
    >
      <div className="w-full flex items-center justify-between gap-3 p-4 text-left">
        <div className="flex min-w-0 items-start gap-3">
          {selected && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />}
          <div>
            <h4 className={`font-semibold ${selected ? "text-emerald-950" : "text-slate-800"}`}>{title}</h4>
            <div className={`text-sm font-bold mt-0.5 ${selected ? "text-emerald-800" : "text-[#006168]"}`}>{money(price)}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded(!expanded);
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm hover:bg-white hover:text-[#006168]"
          aria-label={expanded ? "Hide add-on details" : "Show add-on details"}
        >
          <ChevronDown className={`w-5 h-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
          <div className="text-sm text-slate-600 leading-relaxed space-y-2">{description}</div>
          <Button
            type="button"
            variant={selected ? "secondary" : "default"}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(!selected);
            }}
            className="w-full sm:w-auto"
          >
            {selected ? "Remove enhancement" : "Add enhancement"}
          </Button>
          {selected && children && <div className="pt-4 border-t border-slate-100" onClick={(event) => event.stopPropagation()}>{children}</div>}
        </div>
      )}
    </div>
  );
}

export default function EventAddOnsStep({ formData, setFormData }) {
  const [isUploadingFlyer, setIsUploadingFlyer] = useState(false);
  const addOns = formData.event_add_ons || {};
  const breakdown = getResidentialEventPriceBreakdown(formData);

  const updateAddOns = (changes) => {
    setFormData((prev) => ({
      ...prev,
      tier: "event",
      event_tier: "event",
      event_add_ons: { ...(prev.event_add_ons || {}), ...changes },
    }));
  };

  const handleFlyerUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingFlyer(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData((prev) => ({ ...prev, event_flyer_url: result.file_url, event_add_ons: { ...(prev.event_add_ons || {}), flyer_upload: true } }));
    } finally {
      setIsUploadingFlyer(false);
      event.target.value = "";
    }
  };

  const setComingSoonPackage = (packageKey) => {
    const selected = String(formData.coming_soon_package || "") === packageKey;
    const nextPackage = selected ? "" : packageKey;
    const days = RESIDENTIAL_EVENT_COMING_SOON_PACKAGES[nextPackage]?.days;
    setFormData((prev) => ({
      ...prev,
      coming_soon_package: nextPackage,
      coming_soon_start_date: days && prev.event_start_date ? shiftDate(prev.event_start_date, -days) : "",
    }));
  };

  const setPhotoCount = (nextCount) => {
    const count = Math.max(1, Math.min(10, Number(nextCount || 1)));
    setFormData((prev) => ({
      ...prev,
      event_photo_gallery_count: count,
      event_photos: (prev.event_photos || []).slice(0, count),
      photoUrls: (prev.event_photos || []).slice(0, count),
      event_add_ons: { ...(prev.event_add_ons || {}), photo_gallery: true },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-green-900">Your Residential Event Package Includes ($9.99)</h3>
        <ul className="space-y-1.5 text-xs text-green-800">
          {[
            "Event detail page",
            "Event map pin",
            "Standard category icon",
            "One-day event listing",
            "Visible to people searching your local area and surrounding neighborhood",
            "Designed to help nearby residents discover your event"
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="font-bold text-green-600 mt-0.5">✔</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-green-700 font-medium pt-2">You're ready to publish your event. The options below are completely optional and can help increase visibility and engagement.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#e6f3f4] to-[#f0fdfa] border-b border-[#b3d9db] p-5">
          <h3 className="text-base font-semibold text-[#006168]">STAND OUT WITH THESE AD ONS</h3>
          <p className="text-sm text-[#2C4F4E] leading-relaxed mt-2">
            Your event is ready to publish. The options below can help more people discover your event, increase visibility, and make your event stand out from other local listings.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          <AddOnCard
           id="premium_visibility"
           title="Be Seen By More People"
           price={RESIDENTIAL_EVENT_ADD_ONS.premium_visibility.price}
           description={
             <>
               <p>Help more people discover your event.</p>
               <p>Your Residential Event is already visible in your local area. This upgrade increases visibility and helps your event appear to more users searching beyond your immediate neighborhood.</p>
             </>
           }
          selected={!!addOns.premium_visibility}
          onToggle={(checked) => updateAddOns({ premium_visibility: checked })}
        />

        <AddOnCard
          id="animation"
          title="Animation"
          price={RESIDENTIAL_EVENT_ADD_ONS.animation.price}
          description={
            <>
              <p>Make your event stand out on the map.</p>
              <p><span className="font-semibold text-slate-800">Choose:</span> Pulse or Bounce</p>
              <p><span className="font-semibold text-slate-800">Useful for:</span> Fundraisers, community events, and church events.</p>
            </>
          }
          selected={!!addOns.animation}
          onToggle={(checked) => setFormData((prev) => ({ ...prev, event_animation: checked ? (prev.event_animation || "pulse") : "", event_add_ons: { ...(prev.event_add_ons || {}), animation: checked } }))}
        >
          <div className="grid grid-cols-2 gap-2">
            {["pulse", "bounce"].map((option) => (
              <Button key={option} type="button" variant={formData.event_animation === option ? "default" : "outline"} onClick={() => setFormData((prev) => ({ ...prev, event_animation: option }))} className="capitalize">
                {option}
              </Button>
            ))}
          </div>
        </AddOnCard>

        <AddOnCard
          id="flyer_upload"
          title="Flyer Upload"
          price={RESIDENTIAL_EVENT_ADD_ONS.flyer_upload.price}
          description={
            <>
              <p>Upload a large promotional flyer.</p>
              <p>The flyer becomes your main event image, event detail header image, and social sharing image.</p>
              <p><span className="font-semibold text-slate-800">Recommended for:</span> Church events, school events, and fundraisers.</p>
            </>
          }
          selected={!!addOns.flyer_upload}
          onToggle={(checked) => updateAddOns({ flyer_upload: checked })}
        >
          <div className="space-y-3">
            <label className="inline-flex">
              <input type="file" accept="image/*" className="hidden" onChange={handleFlyerUpload} disabled={isUploadingFlyer} />
              <span className="inline-flex items-center gap-2 rounded-md bg-[#5DADA5] px-3 py-2 text-sm font-medium text-white cursor-pointer hover:bg-[#4A9B93]">
                {isUploadingFlyer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isUploadingFlyer ? "Uploading..." : "Upload Flyer"}
              </span>
            </label>
            {formData.event_flyer_url && (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white">
                <img src={formData.event_flyer_url} alt="Event flyer" className="w-full h-40 object-cover" />
                <Button type="button" size="icon" variant="secondary" className="absolute top-2 right-2 h-8 w-8" onClick={() => setFormData((prev) => ({ ...prev, event_flyer_url: "" }))}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </AddOnCard>

        <AddOnCard
          id="photo_gallery"
          title="Photo Gallery"
          price={RESIDENTIAL_EVENT_ADD_ONS.photo_gallery.price}
          description={
            <>
              <p>Add up to 10 gallery photos.</p>
              <p>Gallery photos appear separately from your flyer and help visitors learn more about your event.</p>
              <p><span className="font-semibold text-slate-800">Maximum:</span> 10 photos</p>
            </>
          }
          selected={!!addOns.photo_gallery}
          onToggle={(checked) => setFormData((prev) => ({ ...prev, event_photo_gallery_count: checked ? (prev.event_photo_gallery_count || 1) : 0, event_photos: checked ? prev.event_photos || [] : [], photoUrls: checked ? prev.event_photos || [] : [], event_add_ons: { ...(prev.event_add_ons || {}), photo_gallery: checked } }))}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-slate-200">
              <Label className="text-sm font-semibold text-slate-700">Gallery photo slots</Label>
              <div className="flex items-center gap-2">
                <Button type="button" size="icon" variant="outline" onClick={() => setPhotoCount((formData.event_photo_gallery_count || 1) - 1)} disabled={(formData.event_photo_gallery_count || 1) <= 1}>
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center font-bold text-slate-800">{formData.event_photo_gallery_count || 1}</span>
                <Button type="button" size="icon" variant="outline" onClick={() => setPhotoCount((formData.event_photo_gallery_count || 1) + 1)} disabled={(formData.event_photo_gallery_count || 1) >= 10}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <EventPhotoUpload value={formData.event_photos || []} maxPhotos={formData.event_photo_gallery_count || 1} onChange={(photos) => setFormData((prev) => ({ ...prev, event_photos: photos, photoUrls: photos }))} />
          </div>
        </AddOnCard>

        <AddOnCard
          id="custom_icon"
          title="Custom Icon"
          price={RESIDENTIAL_EVENT_ADD_ONS.custom_icon.price}
          description={
            <>
              <p>Replace the standard category icon with your own approved icon.</p>
              <p>Must meet existing icon upload requirements.</p>
            </>
          }
          selected={!!addOns.custom_icon}
          onToggle={(checked) => updateAddOns({ custom_icon: checked })}
        >
          <EventIconManager
            tier="premium"
            selectedIcon={formData.event_icon}
            setSelectedIcon={(icon) => setFormData((prev) => ({ ...prev, event_icon: icon, event_logo_url: "" }))}
            uploadedImageUrl={formData.event_logo_url || ""}
            setUploadedImageUrl={(url) => setFormData((prev) => ({ ...prev, event_logo_url: url }))}
          />
        </AddOnCard>

        <AddOnCard
          id="marquee"
          title="Marquee"
          price={RESIDENTIAL_EVENT_ADD_ONS.marquee.price}
          description={
            <>
              <p>Give your event maximum visibility.</p>
              <p>Marquee events receive the large event-board presentation currently used by marquee events.</p>
              <p><span className="font-semibold text-slate-800">Best for:</span> Large fundraisers, community-wide events, and holiday events.</p>
            </>
          }
          selected={!!addOns.marquee}
          onToggle={(checked) => updateAddOns({ marquee: checked })}
        >
          <MarqueeSlotsEditor
            value={formData.marquee_schedule_slots || []}
            onChange={(slots) => setFormData((prev) => ({ ...prev, marquee_schedule_slots: slots }))}
            eventStartDate={formData.event_start_date}
            eventEndDate={formData.event_start_date}
          />
        </AddOnCard>
        </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-slate-800">Coming Soon Packages</h4>
          <p className="text-sm text-slate-500">Optional promotion packages. Individual day pricing is no longer used.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {Object.values(RESIDENTIAL_EVENT_COMING_SOON_PACKAGES).map((pkg) => {
            const selected = String(formData.coming_soon_package || "") === pkg.key;
            return (
              <button key={pkg.key} type="button" onClick={() => setComingSoonPackage(pkg.key)} className={`rounded-xl border p-3 text-left transition-all ${selected ? "border-[#006168] bg-[#e6f3f4] ring-2 ring-[#006168]/15" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                <div className="font-semibold text-slate-800">{pkg.label}</div>
                <div className="text-sm font-bold text-[#006168]">{money(pkg.price)}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-[#2C4F4E]/20 bg-[#F3E6CF] p-4 flex items-center justify-between">
        <span className="font-semibold text-[#2C4F4E]">Event Total</span>
        <span className="text-xl font-bold text-[#2C4F4E]">{money(breakdown.total)}</span>
      </div>
    </div>
  );
}