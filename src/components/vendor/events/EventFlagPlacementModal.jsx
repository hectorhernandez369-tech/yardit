import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { calculateMiles } from "@/lib/vendorEvents";
import { toast } from "sonner";
import VendorEventMapboxTileLayer from "./VendorEventMapboxTileLayer";

const makeFlagIcon = (label) => L.divIcon({
  className: "vendor-event-flag-marker",
  html: `<div style="display:flex;align-items:center;gap:4px;transform:translate(-2px,-28px);"><div style="width:24px;height:24px;border-radius:9999px;background:#F4A849;border:2px solid #2C4F4E;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.25);">⚑</div><span style="white-space:nowrap;background:white;border:1px solid #2C4F4E22;border-radius:9999px;padding:2px 8px;font-size:12px;font-weight:700;color:#2C4F4E;box-shadow:0 2px 6px rgba(0,0,0,.12);">${label}</span></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

function MapBounds({ center, radiusFeet }) {
  const map = useMap();

  useEffect(() => {
    const radiusMeters = Number(radiusFeet || 500) * 0.3048;
    const latOffset = radiusMeters / 111320;
    const lngOffset = radiusMeters / (111320 * Math.cos((center[0] * Math.PI) / 180));
    map.fitBounds([
      [center[0] - latOffset, center[1] - lngOffset],
      [center[0] + latOffset, center[1] + lngOffset],
    ], { padding: [36, 36], maxZoom: 17 });
    setTimeout(() => map.invalidateSize(), 100);
  }, [center[0], center[1], radiusFeet, map]);

  return null;
}

function MapTapHandler({ eventLocation, flags, onAddFlag }) {
  useMapEvents({
    click: (mapEvent) => {
      const { lat, lng } = mapEvent.latlng;
      const miles = calculateMiles(eventLocation.latitude, eventLocation.longitude, lat, lng);
      const radiusMiles = Number(eventLocation.radius_feet || 0) / 5280;

      if (miles !== null && radiusMiles > 0 && miles > radiusMiles) {
        toast.error("Flags must be inside the event area.");
        return;
      }

      onAddFlag({
        temp_id: `flag-${Date.now()}-${flags.length + 1}`,
        label: `Field ${flags.length + 1}`,
        title: `Field ${flags.length + 1}`,
        icon_key: "flag",
        schedule_entries: [],
        latitude: lat,
        longitude: lng,
        display_order: flags.length,
      });
    },
  });

  return null;
}

export default function EventFlagPlacementModal({ open, onOpenChange, eventLocation, flags = [], onSave }) {
  const [draftFlags, setDraftFlags] = useState(flags);
  const [deleteFlag, setDeleteFlag] = useState(null);
  const [mapStyle, setMapStyle] = useState("standard");
  const longPressTimerRef = useRef(null);
  const center = useMemo(() => [eventLocation.latitude, eventLocation.longitude], [eventLocation.latitude, eventLocation.longitude]);
  const radiusMeters = Number(eventLocation.radius_feet || 500) * 0.3048;

  const renumberFlags = (items) => items.map((flag, index) => ({ ...flag, label: `Field ${index + 1}`, display_order: index }));

  useEffect(() => {
    if (open) {
      setDraftFlags(renumberFlags(flags));
      setDeleteFlag(null);
      setMapStyle("standard");
    }
  }, [open, flags]);

  const isSameFlag = (item, flag) => {
    if (flag.temp_id) return item.temp_id === flag.temp_id;
    if (flag.id) return item.id === flag.id;
    return false;
  };

  const updateFlagLocation = (flag, lat, lng) => {
    const miles = calculateMiles(eventLocation.latitude, eventLocation.longitude, lat, lng);
    const radiusMiles = Number(eventLocation.radius_feet || 0) / 5280;

    if (miles !== null && radiusMiles > 0 && miles > radiusMiles) {
      toast.error("Flags must be inside the event area.");
      return false;
    }

    setDraftFlags((current) => current.map((item) => (
      isSameFlag(item, flag) ? { ...item, latitude: lat, longitude: lng } : item
    )));
    return true;
  };

  const removeFlag = (flag) => {
    setDraftFlags((current) => renumberFlags(current.filter((item) => !isSameFlag(item, flag))));
    setDeleteFlag(null);
  };

  const startFlagLongPress = (flag) => {
    longPressTimerRef.current = setTimeout(() => setDeleteFlag(flag), 650);
  };

  const clearFlagLongPress = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const saveFlags = () => {
    onSave(draftFlags.map((flag, index) => ({ ...flag, label: flag.label || `Field ${index + 1}`, display_order: index })));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Place Event Flags</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FBFAF7] p-3 text-sm font-semibold text-[#2C4F4E]">
            <span>Flags placed: {draftFlags.length}</span>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={mapStyle === "standard" ? "default" : "outline"} onClick={() => setMapStyle("standard")}>Standard</Button>
              <Button type="button" size="sm" variant={mapStyle === "satellite" ? "default" : "outline"} onClick={() => setMapStyle("satellite")}>Satellite</Button>
            </div>
          </div>
          <div className="h-[520px] overflow-hidden rounded-2xl border border-[#2C4F4E]/20">
            <MapContainer center={center} zoom={15} className="h-full w-full" scrollWheelZoom>
              <VendorEventMapboxTileLayer mapStyle={mapStyle} />
              <MapBounds center={center} radiusFeet={eventLocation.radius_feet} />
              <Circle center={center} radius={radiusMeters} pathOptions={{ color: "#5DADA5", fillColor: "#5DADA5", fillOpacity: 0.12, weight: 2 }} />
              <Marker position={center} />
              {draftFlags.map((flag) => (
                <Marker
                  key={flag.temp_id || flag.id}
                  position={[Number(flag.latitude), Number(flag.longitude)]}
                  icon={makeFlagIcon(flag.label)}
                  draggable
                  bubblingMouseEvents={false}
                  eventHandlers={{
                    mousedown: () => startFlagLongPress(flag),
                    touchstart: () => startFlagLongPress(flag),
                    mouseup: clearFlagLongPress,
                    touchend: clearFlagLongPress,
                    dragstart: clearFlagLongPress,
                    dragend: (markerEvent) => {
                      clearFlagLongPress();
                      const position = markerEvent.target.getLatLng();
                      const movedInsideRadius = updateFlagLocation(flag, position.lat, position.lng);
                      if (!movedInsideRadius) markerEvent.target.setLatLng([Number(flag.latitude), Number(flag.longitude)]);
                    },
                  }}
                />
              ))}
              <MapTapHandler eventLocation={eventLocation} flags={draftFlags} onAddFlag={(flag) => setDraftFlags((current) => renumberFlags([...current, flag]))} />
            </MapContainer>
          </div>
          {deleteFlag && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="font-semibold text-red-700">Delete {deleteFlag.label}?</span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setDeleteFlag(null)}>Cancel</Button>
                <Button type="button" size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => removeFlag(deleteFlag)}>Delete Flag</Button>
              </div>
            </div>
          )}
          {draftFlags.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {draftFlags.map((flag) => (
                <div key={flag.temp_id || flag.id} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-3 text-sm">
                  <span className="font-bold text-[#2C4F4E]">{flag.label}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => setDeleteFlag(flag)}>Remove</Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" onClick={saveFlags} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">Save Flags</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}