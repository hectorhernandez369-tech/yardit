import React from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { isPublishedVendorEvent } from "@/lib/vendorEvents";
import { getVendorEventVisibilityStatus } from "@/lib/vendorEventPromotion";

// Emergency kill switch: false immediately hides this entire layer.
// No changes to residential, Halloween, vendor, or standard event markers.
export const YARDITS_ON_SPOTLIGHTS_ENABLED = true;

const styles = `
.yardits-on-marker { background: transparent; border: 0; }
.yardits-on-scene { position: relative; width: 88px; height: 100px; pointer-events: auto; }
.yardits-on-beam { position: absolute; bottom: 29px; left: 41px; width: 18px; height: 65px;
  transform-origin: 50% 100%; opacity: .78;
  background: linear-gradient(to top, rgba(255,221,133,.9), rgba(255,244,196,.22) 70%, transparent);
  clip-path: polygon(35% 100%, 65% 100%, 100% 0, 0 0);
  filter: drop-shadow(0 0 6px rgba(255,219,120,.8)); }
.yardits-on-beam.left { animation: yardits-on-left 3.6s ease-in-out infinite alternate; }
.yardits-on-beam.right { animation: yardits-on-right 3.6s ease-in-out infinite alternate; }
.yardits-on-base { position:absolute; bottom:13px; left:31px; width:27px; height:24px;
  background:#302747; border:2px solid #f5c86b; border-radius:50% 50% 8px 8px; box-shadow:0 0 12px #eebd58; }
.yardits-on-label { position:absolute; bottom:0; left:50%; transform:translateX(-50%);
  white-space:nowrap; font:bold 10px system-ui,sans-serif; color:#fff; background:#2c2440;
  padding:2px 6px; border:1px solid #f5c86b; border-radius:5px; }
@keyframes yardits-on-left { from { transform:rotate(-38deg); } to { transform:rotate(15deg); } }
@keyframes yardits-on-right { from { transform:rotate(38deg); } to { transform:rotate(-15deg); } }
@media (prefers-reduced-motion: reduce) {
  .yardits-on-beam { animation:none!important; }
  .yardits-on-beam.left { transform:rotate(-22deg); }
  .yardits-on-beam.right { transform:rotate(22deg); }
}
`;
const spotlightIcon = L.divIcon({
  className: "yardits-on-marker",
  html: '<div class="yardits-on-scene"><div class="yardits-on-beam left"></div><div class="yardits-on-beam right"></div><div class="yardits-on-base"></div><div class="yardits-on-label">YARDIT\'S ON!</div></div>',
  iconSize: [88, 100], iconAnchor: [44, 88], popupAnchor: [0, -70],
});

function validCoordinate(value, limit) {
  const number = Number(value);
  return value !== null && value !== undefined && value !== "" && Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

export default function YarditsOnSpotlightLayer({ events = [], enabled = YARDITS_ON_SPOTLIGHTS_ENABLED }) {
  if (!enabled) return null;
  const now = Date.now();
  const eligible = events.filter((event) => {
    if (event.yardits_on_spotlight !== true && event.yardit_exclusive !== true || !isPublishedVendorEvent(event, new Date(now))) return false;
    const visibility = getVendorEventVisibilityStatus(event, new Date(now));
    if (visibility !== "coming_soon" && visibility !== "active") return false;
    const lat = validCoordinate(event.latitude ?? event.lat ?? event.location?.lat, 90);
    const lng = validCoordinate(event.longitude ?? event.lng ?? event.location?.lng, 180);
    if (lat === null || lng === null) return false;
    const expiry = event.endDateTime || event.end_date_time || event.end_date || event.ends_at;
    return !expiry || (Number.isFinite(Date.parse(expiry)) && Date.parse(expiry) >= now);
  }).slice(0, 3);
  if (!eligible.length) return null;
  return <>
    <style>{styles}</style>
    {eligible.map((event) => {
      const lat = validCoordinate(event.latitude ?? event.lat, 90);
      const lng = validCoordinate(event.longitude ?? event.lng, 180);
      return <Marker key={event.id} position={[lat, lng]} icon={spotlightIcon} zIndexOffset={1200}>
        <Popup>
          <div style={{ maxWidth: 260 }}>
            <strong>YARDIT'S ON! — {event.title || event.name || "Featured event"}</strong>
            {(event.flyer_url || event.flyerUrl) && <img src={event.flyer_url || event.flyerUrl} alt="Event flyer" style={{ width:"100%", marginTop:8 }} />}
            {(event.startDateTime || event.start_date_time || event.start_date) && <p>{new Date(event.start_date_time || event.start_date).toLocaleString()}</p>}
            {event.address && <p>{event.address}</p>}
          </div>
        </Popup>
      </Marker>;
    })}
  </>;
}
