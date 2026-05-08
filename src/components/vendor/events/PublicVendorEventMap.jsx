import { Circle, MapContainer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import VendorEventMapboxTileLayer from "./VendorEventMapboxTileLayer";
import { getEventFlagIcon } from "@/lib/eventFlagIcons";

const makePublicFlagIcon = (spot) => L.divIcon({
  className: "public-vendor-event-flag-marker",
  html: `<div style="display:flex;align-items:center;gap:4px;transform:translate(-2px,-28px);"><div style="width:26px;height:26px;border-radius:9999px;background:#F4A849;border:2px solid #2C4F4E;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,.25);">${getEventFlagIcon(spot.icon_key)}</div><span style="white-space:nowrap;background:white;border:1px solid #2C4F4E22;border-radius:9999px;padding:2px 8px;font-size:12px;font-weight:700;color:#2C4F4E;box-shadow:0 2px 6px rgba(0,0,0,.12);">${spot.title || spot.label || "Flag"}</span></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

export default function PublicVendorEventMap({ event, spots = [], scheduleEntries = [] }) {
  const center = [event.latitude, event.longitude];
  const showRadius = ["multi_spot", "multi_location"].includes(event.event_type);

  return (
    <div className="space-y-3">
      <div className="h-[320px] overflow-hidden rounded-2xl border border-[#2C4F4E]/20">
        <MapContainer center={center} zoom={14} className="h-full w-full" scrollWheelZoom={false}>
          <VendorEventMapboxTileLayer />
          {showRadius && <Circle center={center} radius={Number(event.radius_feet || 500) * 0.3048} pathOptions={{ color: "#5DADA5", fillColor: "#5DADA5", fillOpacity: 0.1, weight: 2 }} />}
          <Marker position={center} />
          {spots.map((spot) => (
            <Marker key={spot.id} position={[spot.latitude, spot.longitude]} icon={makePublicFlagIcon(spot)}>
              <Popup>
                <div className="space-y-1">
                  <p className="font-bold">{getEventFlagIcon(spot.icon_key)} {spot.title || spot.label || "Flag"}</p>
                  {scheduleEntries.filter((entry) => entry.spot_id === spot.id || entry.field_name === spot.title).slice(0, 3).map((entry) => (
                    <p key={entry.id} className="text-xs">{new Date(entry.start_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} — {entry.title}</p>
                  ))}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <p className="text-sm text-slate-700">{event.display_address || "Location details coming soon"}</p>
    </div>
  );
}