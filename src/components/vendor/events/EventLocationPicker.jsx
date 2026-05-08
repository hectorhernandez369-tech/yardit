import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [34.0522, -118.2437];

async function reverseGeocode(lat, lng) {
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
  const data = await response.json();
  return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function LocationClickHandler({ onSelect }) {
  useMapEvents({
    click: (event) => onSelect(event.latlng.lat, event.latlng.lng),
  });
  return null;
}

export default function EventLocationPicker({ open, onOpenChange, eventType, value, onChange }) {
  const hasValidValue = value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude);
  const [selected, setSelected] = useState(hasValidValue ? value : null);
  const [radius, setRadius] = useState(value?.radius_feet || 500);
  const showRadius = eventType === "multi_spot" || eventType === "multi_location";

  useEffect(() => {
    if (open) {
      const hasValidOpenValue = value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude);
      setSelected(hasValidOpenValue ? value : null);
      setRadius(value?.radius_feet || 500);
    }
  }, [open, value]);

  const selectLocation = async (lat, lng) => {
    const displayAddress = await reverseGeocode(lat, lng);
    setSelected({ latitude: lat, longitude: lng, display_address: displayAddress });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      selectLocation(position.coords.latitude, position.coords.longitude);
    });
  };

  const saveLocation = () => {
    if (!selected) return;
    onChange({ ...selected, radius_feet: Number(radius || 500) });
    onOpenChange(false);
  };

  const center = selected ? [selected.latitude, selected.longitude] : DEFAULT_CENTER;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Event Location</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Button type="button" variant="outline" onClick={useMyLocation}>Use My Location</Button>
          <div className="h-[360px] overflow-hidden rounded-2xl border border-[#2C4F4E]/20">
            <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationClickHandler onSelect={selectLocation} />
              {selected && <Marker position={[selected.latitude, selected.longitude]} />}
            </MapContainer>
          </div>
          {selected?.display_address && (
            <div className="rounded-xl bg-[#FBFAF7] p-3 text-sm text-slate-700">
              <strong>Selected location:</strong> {selected.display_address}
            </div>
          )}
          {showRadius && (
            <div className="space-y-2 rounded-xl bg-[#FBFAF7] p-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Event Area Radius</Label>
                <span className="text-sm font-bold text-[#2C4F4E]">{radius} ft</span>
              </div>
              <input className="w-full accent-[#5DADA5]" type="range" min="100" max="5000" step="100" value={radius} onChange={(e) => setRadius(e.target.value)} />
              <p className="text-xs text-slate-600">This controls how far away spots/fields can be added from the main event location.</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" disabled={!selected} onClick={saveLocation} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">Save Location</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}