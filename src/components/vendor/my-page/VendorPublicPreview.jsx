import React, { useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BadgeCheck, ChevronDown, ExternalLink, Facebook, Globe, Heart, Instagram, MapPin, MessageCircle, Music2, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { sendYarditNotification } from "@/lib/yarditNotifications";
import BusinessHero from "@/components/vendor/BusinessHero";
import VendorNotifyButton from "@/components/vendor/VendorNotifyButton";
import { format } from "date-fns";
import { getVendorTierConfig, isLiveVendorCheckIn } from "@/lib/vendorTiers";
import { getPublicContactInfo } from "@/lib/publicContactPrivacy";

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

function getPublicLikeId() {
  const storageKey = "yardit_public_like_id";
  let likeId = localStorage.getItem(storageKey);
  if (!likeId) {
    likeId = `guest_${crypto.randomUUID?.() || Date.now()}`;
    localStorage.setItem(storageKey, likeId);
  }
  return likeId;
}

export default function VendorPublicPreview({ account, pins, checkIns, updates, onRefresh }) {
  const [likingIds, setLikingIds] = useState([]);
  const [messageForm, setMessageForm] = useState({ name: "", contact: "", message: "" });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const tier = getVendorTierConfig(account.vendor_tier);
  const liveItems = (checkIns || []).filter(isLiveVendorCheckIn);
  const activeCheckIn = liveItems[0];
  const pinFor = (id) => pins.find((pin) => pin.id === id);
  const publicLikeId = getPublicLikeId();
  const publicContact = getPublicContactInfo({ account });

  const handleLikeUpdate = async (update) => {
    const likedBy = update.liked_by || [];
    if (likedBy.includes(publicLikeId) || likingIds.includes(update.id)) return;

    setLikingIds((current) => [...current, update.id]);
    await base44.entities.VendorUpdate.update(update.id, {
      likes: (update.likes || 0) + 1,
      liked_by: [...likedBy, publicLikeId],
    });
    setLikingIds((current) => current.filter((id) => id !== update.id));
    onRefresh?.();
  };

  const handleMessageBusiness = async (event) => {
    event.preventDefault();
    if (!messageForm.message.trim()) return;

    const ownerIdentifier = account.owner_user_id;
    setSendingMessage(true);
    await sendYarditNotification({
      userId: ownerIdentifier,
      user_id: ownerIdentifier,
      user_email: ownerIdentifier?.includes("@") ? ownerIdentifier : undefined,
      title: "New business message",
      message: `${messageForm.name || "A customer"}: ${messageForm.message}${messageForm.contact ? ` Contact: ${messageForm.contact}` : ""}`,
      type: "vendor_message",
      related_entity_type: "vendor_account",
      related_entity_id: account.id,
      metadata: {
        vendor_account_id: account.id,
        sender_name: messageForm.name,
        sender_contact: messageForm.contact,
      },
      read: false,
      is_read: false,
    });
    setMessageForm({ name: "", contact: "", message: "" });
    setMessageSent(true);
    setSendingMessage(false);
  };

  const heroProfile = {
    id: account.id,
    business_name: account.business_name,
    logo_url: account.business_logo,
    tier: account.vendor_tier,
    category: account.business_category,
    description: account.description,
    phone: publicContact.visible ? publicContact.phone : "",
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
          {account.is_verified_vendor && (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#5DADA5]/40 bg-[#E9FFFB] px-3 py-2 text-sm font-bold text-[#2C4F4E]">
              <BadgeCheck className="h-4 w-4 text-[#5DADA5]" /> Verified Vendor
            </span>
          )}
          {socialLinks.filter(([key]) => key === "website" ? publicContact.website : account[key]).map(([key, Icon, label]) => (
            <a key={key} href={key === "website" ? publicContact.website : account[key]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm text-[#2C4F4E] hover:bg-[#F3E6CF]">
              <Icon className="h-4 w-4" /> {label} <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>

        <VendorNotifyButton account={account} />


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
          <h3 className="mb-3 text-xl font-black text-[#2C4F4E] sm:text-2xl">Latest Posts</h3>
          <div className="space-y-4">
            {updates.length ? updates.map((update) => {
              const hasLiked = (update.liked_by || []).includes(publicLikeId);
              const isLiking = likingIds.includes(update.id);

              return (
                <div key={update.id} className="rounded-3xl border-2 border-[#F4A849]/40 bg-[#FFF7E8] p-5 shadow-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Posted {format(new Date(update.created_date), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                  <p className="text-base font-semibold leading-relaxed text-[#1F2937] sm:text-lg">{update.text}</p>
                  {tier.hasLikeButton && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-slate-600">{update.likes || 0} likes</p>
                      <Button
                        type="button"
                        size="sm"
                        variant={hasLiked ? "secondary" : "outline"}
                        disabled={hasLiked || isLiking}
                        onClick={() => handleLikeUpdate(update)}
                        className="rounded-full border-[#2C4F4E]/30 text-black"
                      >
                        <Heart className={`h-4 w-4 ${hasLiked ? "fill-[#F4A849] text-[#F4A849]" : "text-black"}`} />
                        {hasLiked ? "Liked" : "Like"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            }) : <p className="text-sm text-slate-600">No updates yet.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-[#5DADA5]/20 bg-white p-3 shadow-sm">
          <button
            type="button"
            onClick={() => setShowMessageForm(!showMessageForm)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[#5DADA5]" />
              <span className="font-bold text-[#2C4F4E]">Message Business</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-[#2C4F4E] transition-transform ${showMessageForm ? "rotate-180" : ""}`} />
          </button>
          {messageSent && !showMessageForm && <p className="mt-2 text-sm font-semibold text-[#2C4F4E]">Message sent to the business.</p>}
          {showMessageForm && <form onSubmit={handleMessageBusiness} className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={messageForm.name}
                onChange={(event) => setMessageForm({ ...messageForm, name: event.target.value })}
                placeholder="Your name"
                className="bg-white text-black"
              />
              <Input
                value={messageForm.contact}
                onChange={(event) => setMessageForm({ ...messageForm, contact: event.target.value })}
                placeholder="Email or phone"
                className="bg-white text-black"
              />
            </div>
            <Textarea
              value={messageForm.message}
              onChange={(event) => setMessageForm({ ...messageForm, message: event.target.value })}
              placeholder="Write your message..."
              className="min-h-24 bg-white text-black"
              required
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              {messageSent ? <p className="text-sm font-semibold text-[#2C4F4E]">Message sent to the business.</p> : <span />}
              <Button type="submit" disabled={sendingMessage} className="rounded-full bg-[#5DADA5] text-white hover:bg-[#4A9B93]">
                <Send className="h-4 w-4" /> {sendingMessage ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </form>}
        </section>
      </CardContent>
    </div>
  );
}