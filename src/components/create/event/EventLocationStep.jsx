import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

const MAPBOX_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";

function ClickHandler({ onPick }) {
  useMapEvents({ click: (event) => onPick(event.latlng) });
  return null;
}

function MapPicker({ open, initialPosition, onClose, onConfirm }) {
  const [selected, setSelected] = useState(initialPosition || null);

  useEffect(() => {
    setSelected(initialPosition || null);
  }, [initialPosition, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Select Event Location</DialogTitle>
        </DialogHeader>
        <div className="h-[60vh] w-full relative">
          <MapContainer center={selected || [34.0522, -118.2437]} zoom={selected ? 15 : 11} className="w-full h-full">
            <TileLayer
              attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`}
              tileSize={512}
              zoomOffset={-1}
            />
            <ClickHandler onPick={(latlng) => setSelected([latlng.lat, latlng.lng])} />
            {selected && <Marker position={selected} />}
          </MapContainer>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex gap-3 bg-white/95 backdrop-blur rounded-xl p-3 shadow-lg">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" disabled={!selected} onClick={() => onConfirm(selected)} className="bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border border-[#2C4F4E]">Confirm Location</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EventLocationStep({ formData, setFormData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleConfirm = async ([lat, lng]) => {
    setIsSaving(true);
    const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`);
    const data = await response.json();
    const feature = data.features?.[0];

    setFormData((prev) => ({
      ...prev,
      lat,
      lng,
      address_text: feature?.place_name || "Selected event location",
      addressText: feature?.place_name || "Selected event location",
      city: feature?.context?.find((item) => item.id.startsWith("place"))?.text || prev.city,
      state: feature?.context?.find((item) => item.id.startsWith("region"))?.short_code?.split("-")?.[1] || prev.state,
      zip: feature?.context?.find((item) => item.id.startsWith("postcode"))?.text || prev.zip,
    }));

    setIsSaving(false);
    setIsOpen(false);
    toast.success("Event location saved.");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
        <h3 className="text-[#2C4F4E] font-semibold">Event Location</h3>
        <p className="text-sm text-[#1F2937] opacity-80">Pick the event location using the map selector.</p>
      </div>

      <Button type="button" onClick={() => setIsOpen(true)} className="w-full py-8 text-lg bg-[#5DADA5] hover:bg-[#4A9B93] text-white flex gap-3 shadow-md border-2 border-[#2C4F4E]">
        <MapPin className="w-6 h-6" />
        {formData.address_text || formData.addressText ? "Update Event Location" : "Select Event Location"}
      </Button>

      {(formData.address_text || formData.addressText) && (
        <div className="rounded-lg border border-[#2C4F4E]/30 bg-[#F3E6CF] p-4 space-y-2">
          <p className="text-sm font-medium text-[#2C4F4E]">Selected Address</p>
          <p className="text-sm text-[#1F2937]">{formData.address_text || formData.addressText}</p>
          {typeof formData.lat === "number" && typeof formData.lng === "number" && (
            <p className="text-xs text-slate-500">{formData.lat.toFixed(5)}, {formData.lng.toFixed(5)}</p>
          )}
        </div>
      )}

      {isSaving && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin" /> Saving selected location...
        </div>
      )}

      <MapPicker
        open={isOpen}
        initialPosition={typeof formData.lat === "number" && typeof formData.lng === "number" ? [formData.lat, formData.lng] : null}
        onClose={() => setIsOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}