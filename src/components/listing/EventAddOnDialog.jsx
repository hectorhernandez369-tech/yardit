import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Minus, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import EventAddOnCard from "@/components/create/event/EventAddOnCard";
import EventPhotoUpload from "@/components/create/event/EventPhotoUpload";
import MarqueeSlotsEditor from "@/components/create/event/MarqueeSlotsEditor";
import EventIconManager from "@/components/events/EventIconManager";
import ReviewPayContent from "@/components/payment/ReviewPayContent";
import { RESIDENTIAL_EVENT_ADD_ONS } from "@/lib/eventListingConfig";

const CHECKOUT_KEY = "yardit_listing_upgrade_checkout_v1";
const money = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

export default function EventAddOnDialog({ open, onClose, listing, user }) {
  const [formData, setFormData] = useState({});
  const [isUploadingFlyer, setIsUploadingFlyer] = useState(false);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const existingAddOns = listing?.event_add_ons || {};
  const selectedAddOns = formData.event_add_ons || {};

  useEffect(() => {
    if (!open || !listing) return;
    setFormData({
      ...listing,
      event_add_ons: {},
      event_animation: listing.event_animation || "pulse",
      event_photo_gallery_count: listing.event_photo_gallery_count || 1,
      event_photos: listing.event_photos || listing.photoUrls || [],
      photoUrls: listing.event_photos || listing.photoUrls || [],
    });
  }, [open, listing]);

  const selectedLines = useMemo(() => {
    return Object.values(RESIDENTIAL_EVENT_ADD_ONS).filter((addOn) => selectedAddOns[addOn.key] && !existingAddOns[addOn.key]);
  }, [selectedAddOns, existingAddOns]);

  const amountDue = selectedLines.reduce((sum, item) => sum + Number(item.price || 0), 0);

  const updateAddOns = (changes) => {
    setFormData((prev) => ({ ...prev, event_add_ons: { ...(prev.event_add_ons || {}), ...changes } }));
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

  const buildPatch = () => {
    const mergedAddOns = { ...(listing?.event_add_ons || {}) };
    selectedLines.forEach((line) => { mergedAddOns[line.key] = true; });
    return {
      event_add_ons: mergedAddOns,
      event_animation: selectedAddOns.animation ? formData.event_animation || "pulse" : listing?.event_animation || "",
      event_flyer_url: selectedAddOns.flyer_upload ? formData.event_flyer_url || "" : listing?.event_flyer_url || "",
      event_photo_gallery_count: selectedAddOns.photo_gallery ? formData.event_photo_gallery_count || 1 : listing?.event_photo_gallery_count || 0,
      event_photos: selectedAddOns.photo_gallery ? formData.event_photos || [] : listing?.event_photos || [],
      photoUrls: selectedAddOns.photo_gallery ? formData.event_photos || [] : listing?.photoUrls || [],
      event_icon: selectedAddOns.custom_icon ? formData.event_icon || listing?.event_icon || "" : listing?.event_icon || "",
      event_logo_url: selectedAddOns.custom_icon ? formData.event_logo_url || "" : listing?.event_logo_url || "",
      marquee_schedule_slots: selectedAddOns.marquee ? formData.marquee_schedule_slots || [] : listing?.marquee_schedule_slots || [],
    };
  };

  const handleCheckout = async () => {
    if (!listing || amountDue <= 0) return;
    if (window.self !== window.top) {
      toast.error("Checkout works only from the published app.");
      return;
    }

    try {
      setIsStartingPayment(true);
      localStorage.setItem(CHECKOUT_KEY, JSON.stringify({ listingId: listing.id, targetTier: listing.event_tier || listing.tier || "event", purchaseType: "event_add_on" }));
      const response = await base44.functions.invoke("createListingUpgradeCheckout", {
        action: "create",
        listing_id: listing.id,
        target_tier: listing.event_tier || listing.tier || "event",
        listing_kind: "event",
        event_add_on_purchase: true,
        add_on_keys: selectedLines.map((line) => line.key),
        add_on_patch: buildPatch(),
        customer_email: user?.email,
        amount_cents: amountDue,
        return_url: `${window.location.origin}/CreateListingUpgradeReturn`,
      });
      const checkoutUrl = response?.data?.checkoutUrl;
      if (!checkoutUrl) throw new Error("Add-on checkout could not start.");
      window.location.assign(checkoutUrl);
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || "Add-on checkout could not start.");
      setIsStartingPayment(false);
    }
  };

  const renderAlreadyActive = (key) => existingAddOns[key] ? <span className="text-xs font-bold text-emerald-700">Already active</span> : null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add-ons for {listing?.title || listing?.event_name || "Event"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-xl border border-[#b3d9db] bg-[#e6f3f4] p-4 text-sm text-[#2C4F4E]">
            Add-ons help your active or pending event stand out with better visibility, map movement, flyers, photos, custom icons, or marquee placement.
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            <EventAddOnCard title="Be Seen By More People" price={RESIDENTIAL_EVENT_ADD_ONS.premium_visibility.price} selected={!!selectedAddOns.premium_visibility || !!existingAddOns.premium_visibility} onToggle={(checked) => !existingAddOns.premium_visibility && updateAddOns({ premium_visibility: checked })} description={<><p>Increase your event’s visibility beyond your immediate neighborhood and help more nearby users discover it.</p>{renderAlreadyActive("premium_visibility")}</>} />
            <EventAddOnCard title="Animation" price={RESIDENTIAL_EVENT_ADD_ONS.animation.price} selected={!!selectedAddOns.animation || !!existingAddOns.animation} onToggle={(checked) => !existingAddOns.animation && setFormData((prev) => ({ ...prev, event_animation: checked ? (prev.event_animation || "pulse") : "", event_add_ons: { ...(prev.event_add_ons || {}), animation: checked } }))} description={<><p>Make your event pin move on the map so it catches attention.</p>{renderAlreadyActive("animation")}</>}>
              <div className="grid grid-cols-2 gap-2"><Button type="button" variant={formData.event_animation === "pulse" ? "default" : "outline"} onClick={() => setFormData((prev) => ({ ...prev, event_animation: "pulse" }))}>Pulse</Button><Button type="button" variant={formData.event_animation === "bounce" ? "default" : "outline"} onClick={() => setFormData((prev) => ({ ...prev, event_animation: "bounce" }))}>Bounce</Button></div>
            </EventAddOnCard>
            <EventAddOnCard title="Flyer Upload" price={RESIDENTIAL_EVENT_ADD_ONS.flyer_upload.price} selected={!!selectedAddOns.flyer_upload || !!existingAddOns.flyer_upload} onToggle={(checked) => !existingAddOns.flyer_upload && updateAddOns({ flyer_upload: checked })} description={<><p>Use a flyer as the main event image and event detail header.</p>{renderAlreadyActive("flyer_upload")}</>}>
              <label className="inline-flex"><input type="file" accept="image/*" className="hidden" onChange={handleFlyerUpload} disabled={isUploadingFlyer} /><span className="inline-flex items-center gap-2 rounded-md bg-[#5DADA5] px-3 py-2 text-sm font-medium text-white cursor-pointer hover:bg-[#4A9B93]">{isUploadingFlyer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}{isUploadingFlyer ? "Uploading..." : "Upload Flyer"}</span></label>
              {formData.event_flyer_url && <div className="relative mt-3 rounded-xl overflow-hidden border border-slate-200 bg-white"><img src={formData.event_flyer_url} alt="Event flyer" className="w-full h-40 object-cover" /><Button type="button" size="icon" variant="secondary" className="absolute top-2 right-2 h-8 w-8" onClick={() => setFormData((prev) => ({ ...prev, event_flyer_url: "" }))}><X className="w-4 h-4" /></Button></div>}
            </EventAddOnCard>
            <EventAddOnCard title="Photo Gallery" price={RESIDENTIAL_EVENT_ADD_ONS.photo_gallery.price} selected={!!selectedAddOns.photo_gallery || !!existingAddOns.photo_gallery} onToggle={(checked) => !existingAddOns.photo_gallery && setFormData((prev) => ({ ...prev, event_photo_gallery_count: checked ? (prev.event_photo_gallery_count || 1) : 0, event_add_ons: { ...(prev.event_add_ons || {}), photo_gallery: checked } }))} description={<><p>Add up to 10 photos to show visitors more about your event.</p>{renderAlreadyActive("photo_gallery")}</>}>
              <div className="space-y-4"><div className="flex items-center justify-between rounded-xl border border-slate-200 p-3"><Label>Gallery photo slots</Label><div className="flex items-center gap-2"><Button type="button" size="icon" variant="outline" onClick={() => setPhotoCount((formData.event_photo_gallery_count || 1) - 1)}><Minus className="w-4 h-4" /></Button><span className="w-8 text-center font-bold">{formData.event_photo_gallery_count || 1}</span><Button type="button" size="icon" variant="outline" onClick={() => setPhotoCount((formData.event_photo_gallery_count || 1) + 1)}><Plus className="w-4 h-4" /></Button></div></div><EventPhotoUpload value={formData.event_photos || []} maxPhotos={formData.event_photo_gallery_count || 1} onChange={(photos) => setFormData((prev) => ({ ...prev, event_photos: photos, photoUrls: photos }))} /></div>
            </EventAddOnCard>
            <EventAddOnCard title="Custom Icon" price={RESIDENTIAL_EVENT_ADD_ONS.custom_icon.price} selected={!!selectedAddOns.custom_icon || !!existingAddOns.custom_icon} onToggle={(checked) => !existingAddOns.custom_icon && updateAddOns({ custom_icon: checked })} description={<><p>Replace the standard category icon with your own uploaded event logo or selected icon.</p>{renderAlreadyActive("custom_icon")}</>}><EventIconManager tier="premium" selectedIcon={formData.event_icon} setSelectedIcon={(icon) => setFormData((prev) => ({ ...prev, event_icon: icon, event_logo_url: "" }))} uploadedImageUrl={formData.event_logo_url || ""} setUploadedImageUrl={(url) => setFormData((prev) => ({ ...prev, event_logo_url: url }))} /></EventAddOnCard>
            <EventAddOnCard title="Marquee" price={RESIDENTIAL_EVENT_ADD_ONS.marquee.price} selected={!!selectedAddOns.marquee || !!existingAddOns.marquee} onToggle={(checked) => !existingAddOns.marquee && updateAddOns({ marquee: checked })} description={<><p>Give your event maximum visibility with the large event-board presentation.</p>{renderAlreadyActive("marquee")}</>}><MarqueeSlotsEditor value={formData.marquee_schedule_slots || []} onChange={(slots) => setFormData((prev) => ({ ...prev, marquee_schedule_slots: slots }))} eventStartDate={listing?.event_start_date || listing?.startDateTime?.slice(0, 10)} eventEndDate={listing?.event_end_date || listing?.endDateTime?.slice(0, 10)} /></EventAddOnCard>
          </div>

          <ReviewPayContent purchaseName="Event Add-ons" badge="Add-ons" purchaseType="event_add_on" tier="event_add_on" price={amountDue / 100} listing={listing} summaryTitle="Selected Add-ons" summaryItems={[{ label: "Event", value: listing?.title || listing?.event_name }, { label: "Selected", value: selectedLines.length ? selectedLines.map((item) => `${item.label} (${money(item.price)})`).join(", ") : "No new add-ons selected" }, { label: "Total", value: money(amountDue) }]} benefits={selectedLines.map((item) => item.label)} isProcessing={isStartingPayment} onBack={onClose} onPay={handleCheckout} continueLabel="Pay for Add-ons" />
        </div>
      </DialogContent>
    </Dialog>
  );
}