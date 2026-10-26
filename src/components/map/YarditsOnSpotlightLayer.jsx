import React from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { isPublishedVendorEvent } from "@/lib/vendorEvents";
import { getVendorEventVisibilityStatus } from "@/lib/vendorEventPromotion";
import ExclusiveEventPopupCard from "@/components/map/ExclusiveEventPopupCard";

// Emergency kill switch: false immediately hides this entire layer.
// No changes to residential, Halloween, vendor, or standard event markers.
export const YARDITS_ON_SPOTLIGHTS_ENABLED = true;
// Admin-curated event IDs only. Never trust a flag supplied by an event creator.
// Add an approved published event ID here to activate its spotlight.
export const YARDIT_EXCLUSIVE_EVENT_IDS = ["6adf911b4e77d965a479e3e1"];

const styles = `
.yardits-on-marker { background: transparent; border: 0; }
.yardits-on-scene { position:relative; width:164px; height:152px; pointer-events:auto; }
.yardits-on-beam { position:absolute; bottom:57px; left:75px; width:16px; height:83px; transform-origin:50% 100%; opacity:.78; background:linear-gradient(to top,rgba(255,213,105,.9),rgba(255,239,183,.18) 80%,transparent); clip-path:polygon(38% 100%,62% 100%,100% 0,0 0); filter:drop-shadow(0 0 8px #ffd58a); }
.yardits-on-beam.left { animation:yardits-on-left 3.6s ease-in-out infinite alternate; }
.yardits-on-beam.right { animation:yardits-on-right 3.6s ease-in-out infinite alternate; }
.yardits-on-sign { position:absolute; bottom:13px; left:13px; width:138px; padding:8px 5px; text-align:center; border:5px dotted #ffe19a; border-radius:10px; background:linear-gradient(145deg,#5a1830,#230d2c); box-shadow:0 0 0 3px #a66a28,0 0 19px rgba(255,180,62,.8),0 8px 14px rgba(0,0,0,.35); color:#ffe8aa; font-family:system-ui,sans-serif; }
.yardits-on-kicker { font-size:10px; font-weight:900; letter-spacing:1px; }
.yardits-on-headline { font-size:16px; font-weight:1000; line-height:1.15; text-shadow:0 0 7px #ffb95e; }
.yardits-on-sub { font-size:9px; font-weight:800; color:#fff; }
@keyframes yardits-on-left { from {transform:rotate(-36deg)} to {transform:rotate(12deg)} }
@keyframes yardits-on-right { from {transform:rotate(36deg)} to {transform:rotate(-12deg)} }
@media (prefers-reduced-motion:reduce) {
.yardits-on-beam {animation:none!important}
.yardits-on-beam.left {transform:rotate(-22deg)}
.yardits-on-beam.right {transform:rotate(22deg)}
}
`;
const spotlightIcon = L.divIcon({
  className: "yardits-on-marker",
  html: '<div class="yardits-on-scene"><div class="yardits-on-beam left"></div><div class="yardits-on-beam right"></div><div class="yardits-on-sign"><div class="yardits-on-kicker">YARDIT\'S OWN!</div><div class="yardits-on-headline">BIG LOUIE</div><div class="yardits-on-sub">COMING SOON</div></div></div>',
  iconSize:[164,152],iconAnchor:[82,139],popupAnchor:[0,-70],
});

function validCoordinate(value, limit) {
  const number = Number(value);
  return value !== null && value !== undefined && value !== "" && Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

export default function YarditsOnSpotlightLayer({ events = [], enabled = YARDITS_ON_SPOTLIGHTS_ENABLED, exclusiveEventIds = YARDIT_EXCLUSIVE_EVENT_IDS }) {
  if (!enabled) return null;
  const map = useMap();
  const now = Date.now();
  const approvedIds = new Set(exclusiveEventIds.map(String));
  if (!approvedIds.size) return null;
  const eligible = events.filter((event) => {
    if (!approvedIds.has(String(event.id)) || !isPublishedVendorEvent(event, new Date(now))) return false;
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
      const lat = validCoordinate(event.latitude ?? event.lat ?? event.location?.lat, 90);
      const lng = validCoordinate(event.longitude ?? event.lng ?? event.location?.lng, 180);
      return <Marker key={event.id} position={[lat, lng]} icon={spotlightIcon} zIndexOffset={1200}
        eventHandlers={{ click: () => map.panTo([lat, lng], { animate: true, duration: 0.35 }) }}>
        <Popup maxWidth={232} minWidth={190} autoPan={false} className="yardit-exclusive-event-popup">
          <ExclusiveEventPopupCard event={event} />
        </Popup>
      </Marker>;
    })}
  </>;
}