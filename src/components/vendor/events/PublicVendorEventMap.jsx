import { Circle, MapContainer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import VendorEventMapboxTileLayer from "./VendorEventMapboxTileLayer";
import { getEventFlagIcon, getEventFlagIconAsset, getEventFlagIconLabel } from "@/lib/eventFlagIcons";

const makePublicFlagIcon = (spot, isSelected = false) => {
  const iconAsset = getEventFlagIconAsset(spot.icon_key);
  const iconMarkup = iconAsset
    ? `<img src="${iconAsset}" alt="" style="width:${isSelected ? 30 : 23}px;height:${isSelected ? 30 : 23}px;object-fit:contain;display:block;" />`
    : `<span style="font-size:${isSelected ? 18 : 14}px;line-height:1;">${getEventFlagIcon(spot.icon_key)}</span>`;
  const title = spot.title || spot.label || getEventFlagIconLabel(spot.icon_key) || "Flag";

  return L.divIcon({
    className: "public-vendor-event-flag-marker",
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;transform:translate(-2px,-42px);"><div style="width:${isSelected ? 38 : 30}px;height:${isSelected ? 38 : 30}px;border-radius:9999px;background:#F4A849;border:${isSelected ? 3 : 2}px solid #2C4F4E;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.32);overflow:hidden;">${iconMarkup}</div><span style="white-space:nowrap;background:${isSelected ? "#FFF6E8" : "white"};border:1px solid #2C4F4E22;border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:700;color:#2C4F4E;box-shadow:0 2px 6px rgba(0,0,0,.12);">${title}</span></div>`,
    iconSize: [isSelected ? 38 : 30, isSelected ? 52 : 44],
    iconAnchor: [isSelected ? 19 : 15, isSelected ? 52 : 44],
  });
};

export default function PublicVendorEventMap({ event, spots = [], scheduleEntries = [], selectedSpotId = "", onSelectSpot }) {
  const center = [event.latitude, event.longitude];
  const showRadius = ["multi_spot", "multi_location"].includes(event.event_type);

  return (
    <div className="space-y-3">
      <div className="h-[320px] overflow-hidden rounded-2xl border border-[#2C4F4E]/20">
        <MapContainer center={center} zoom={14} className="h-full w-full" scrollWheelZoom={false}>
          <VendorEventMapboxTileLayer />
          {showRadius && <Circle center={center} radius={Number(event.radius_feet || 500) * 0.3048} pathOptions={{ color: "#5DADA5", fillColor: "#5DADA5", fillOpacity: 0.1, weight: 2 }} />}
          <Marker position={center} />
          {spots.map((spot) => {
            const isSelected = spot.id === selectedSpotId;
            const iconAsset = getEventFlagIconAsset(spot.icon_key);
            return (
              <Marker key={spot.id} position={[spot.latitude, spot.longitude]} icon={makePublicFlagIcon(spot, isSelected)} zIndexOffset={isSelected ? 1000 : 0} eventHandlers={{ click: () => { if (onSelectSpot) onSelectSpot(spot); } }}>
                <Popup>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {iconAsset ? <img src={iconAsset} alt="" className="h-8 w-8 object-contain" /> : <span className="text-xl">{getEventFlagIcon(spot.icon_key)}</span>}
                      <div>
                        <p className="font-bold">{spot.title || spot.label || "Flag"}</p>
                        <p className="text-[11px] font-semibold text-slate-500">{getEventFlagIconLabel(spot.icon_key)}</p>
                      </div>
                    </div>
                    {scheduleEntries.filter((entry) => entry.spot_id === spot.id || entry.field_name === spot.title).slice(0, 3).map((entry) => (
                      <p key={entry.id} className="text-xs">{new Date(entry.start_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} — {entry.title}</p>
                    ))}
                    <button type="button" onClick={() => { if (onSelectSpot) onSelectSpot(spot); }} className="mt-2 w-full rounded-md bg-[#2C4F4E] px-3 py-2 text-sm font-bold text-white">View Full Field Schedule</button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
      <p className="text-sm text-slate-700">{event.display_address || "Location details coming soon"}</p>
    </div>
  );
}