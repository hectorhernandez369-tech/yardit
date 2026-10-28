import React, { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { isPublishedVendorEvent } from "@/lib/vendorEvents";
import { getVendorEventVisibilityStatus } from "@/lib/vendorEventPromotion";
import { SPECIALTY_MARQUEE_SIZES, chooseSpecialtyMarqueeMode } from "@/lib/specialtyMarqueeCollision";
import { getRenderedLeafletMarkerBounds } from "@/lib/leafletMarkerCollisionBounds";
import ExclusiveEventPopupCard from "@/components/map/ExclusiveEventPopupCard";

// Independently disable the decorative layer without touching real event pins.
export const YARDITS_ON_SPOTLIGHTS_ENABLED = true;
export const YARDIT_EXCLUSIVE_EVENT_IDS = ["6adf911b4e77d965a479e3e1"];

const styles = [
  ".yardits-on-marker{background:transparent;border:0}",
  ".yardits-on-scene{position:relative;width:164px;height:152px}",
  ".yardits-on-beam{position:absolute;bottom:57px;left:75px;width:16px;height:83px;transform-origin:50% 100%;opacity:.78;background:linear-gradient(to top,rgba(255,213,105,.9),rgba(255,239,183,.18) 80%,transparent);clip-path:polygon(38% 100%,62% 100%,100% 0,0 0);filter:drop-shadow(0 0 8px #ffd58a);pointer-events:none}",
  ".yardits-on-beam.left{animation:yardits-on-left 3.6s ease-in-out infinite alternate}",
  ".yardits-on-beam.right{animation:yardits-on-right 3.6s ease-in-out infinite alternate}",
  ".yardits-on-sign{position:absolute;bottom:13px;left:13px;width:138px;box-sizing:border-box;padding:8px 5px;text-align:center;border:5px dotted #ffe19a;border-radius:10px;background:linear-gradient(145deg,#5a1830,#230d2c);box-shadow:0 0 0 3px #a66a28,0 0 19px rgba(255,180,62,.8);color:#ffe8aa;font-family:system-ui,sans-serif}",
  ".yardits-on-mini-scene{position:relative;width:116px;height:72px}",
  ".yardits-on-mini-sign{position:absolute;inset:3px;box-sizing:border-box;background:#42172d;border:3px solid #f5cf79;border-radius:10px;color:#ffe8aa;text-align:center;padding:5px;box-shadow:0 0 8px rgba(255,180,62,.5)}",
  ".yardits-on-mini-headline{font-weight:900;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".yardits-on-dot-scene{position:relative;width:38px;height:42px}",
  ".yardits-on-dot{position:absolute;top:1px;left:2px;display:flex;align-items:center;justify-content:center;width:34px;height:34px;box-sizing:border-box;border:3px solid #f5cf79;border-radius:50%;background:#42172d;color:#ffe8aa;font-size:21px;box-shadow:0 2px 6px rgba(0,0,0,.3)}",
  ".yardits-on-dot-tail{position:absolute;bottom:0;left:14px;width:10px;height:10px;transform:rotate(45deg);background:#42172d;border-right:3px solid #f5cf79;border-bottom:3px solid #f5cf79}",
  "@keyframes yardits-on-left{from{transform:rotate(-36deg)}to{transform:rotate(12deg)}}",
  "@keyframes yardits-on-right{from{transform:rotate(36deg)}to{transform:rotate(-12deg)}}",
  "@media(prefers-reduced-motion:reduce){.yardits-on-beam{animation:none!important}.yardits-on-beam.left{transform:rotate(-22deg)}.yardits-on-beam.right{transform:rotate(22deg)}}",
].join("\n");

function iconForMode(mode, event) {
  const label = String(event.organizer_business_name || "YARDIT'S ON!").replace(/[&<>"]/g, "").slice(0, 24);
  let html;
  if (mode === "full") {
    html = '<div class="yardits-on-scene"><div class="yardits-on-beam left"></div><div class="yardits-on-beam right"></div>' +
      '<div class="yardits-on-sign"><div style="font-size:10px;font-weight:900">YARDIT&#39;S ON!</div>' +
      '<div style="font-size:16px;font-weight:900;overflow-wrap:anywhere;line-height:1.15">' + label + '</div>' +
      '<div style="font-size:9px;font-weight:800;color:white">COMING SOON</div></div></div>';
  } else if (mode === "compact") {
    html = '<div class="yardits-on-mini-scene"><div class="yardits-on-mini-sign">' +
      '<div style="font-size:9px;font-weight:900">YARDIT&#39;S ON!</div><div class="yardits-on-mini-headline">' +
      label + '</div></div></div>';
  } else {
    html = '<div class="yardits-on-dot-scene" aria-label="Featured event"><div class="yardits-on-dot-tail"></div>' +
      '<div class="yardits-on-dot">★</div></div>';
  }
  const size = SPECIALTY_MARQUEE_SIZES[mode];
  return L.divIcon({
    className: "yardits-on-marker yardits-on-" + mode,
    html,
    iconSize: [size.width, size.height],
    iconAnchor: [size.anchorX, size.anchorY],
    popupAnchor: [0, size.popupY],
  });
}

function validCoordinate(value, limit) {
  const number = Number(value);
  return value !== null && value !== undefined && value !== "" &&
    Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

export default function YarditsOnSpotlightLayer({
  events = [], enabled = YARDITS_ON_SPOTLIGHTS_ENABLED,
  exclusiveEventIds = YARDIT_EXCLUSIVE_EVENT_IDS,
}) {
  const map = useMap();
  const [modes, setModes] = useState({});
  const modesRef = useRef({});

  const eligible = useMemo(() => {
    if (!enabled) return [];
    const approved = new Set(exclusiveEventIds.map(String));
    const now = Date.now();
    return events.filter((event) => {
      if (!approved.has(String(event.id)) || !isPublishedVendorEvent(event, new Date(now))) return false;
      const visibility = getVendorEventVisibilityStatus(event, new Date(now));
      if (!["coming_soon", "active"].includes(visibility)) return false;
      if (validCoordinate(event.latitude ?? event.lat ?? event.location?.lat, 90) === null ||
          validCoordinate(event.longitude ?? event.lng ?? event.location?.lng, 180) === null) return false;
      const expiry = event.endDateTime || event.end_date_time || event.end_date || event.ends_at;
      return !expiry || (Number.isFinite(Date.parse(expiry)) && Date.parse(expiry) >= now);
    }).slice(0, 3);
  }, [events, enabled, exclusiveEventIds]);

  useEffect(() => {
    let frame = 0;
    let stopped = false;
    const refresh = () => {
      if (stopped) return;
      const size = map.getSize();
      const obstacles = getRenderedLeafletMarkerBounds(map, {
        excludeClasses: ["yardits-on-marker", "yardit-specialty-marker"],
      });
      const next = {};
      eligible.forEach((event) => {
        const lat = validCoordinate(event.latitude ?? event.lat ?? event.location?.lat, 90);
        const lng = validCoordinate(event.longitude ?? event.lng ?? event.location?.lng, 180);
        const point = map.latLngToContainerPoint([lat, lng]);
        const chosen = chooseSpecialtyMarqueeMode(
          point, obstacles, { width: size.x, height: size.y }, modesRef.current[String(event.id)]
        );
        next[String(event.id)] = chosen.mode;
        if (chosen.rect) obstacles.push(chosen.rect);
      });
      const old = modesRef.current;
      if (Object.keys(next).length === Object.keys(old).length &&
          Object.keys(next).every((id) => old[id] === next[id])) return;
      modesRef.current = next;
      setModes(next);
    };
    const schedule = () => {
      if (stopped || frame) return;
      frame = window.requestAnimationFrame(() => { frame = 0; refresh(); });
    };

    const pane = map.getPanes().markerPane;
    const observer = typeof MutationObserver !== "undefined" ? new MutationObserver(schedule) : null;
    if (pane) observer?.observe(pane, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
    map.on("moveend zoomend resize layeradd layerremove", schedule);
    schedule();
    return () => {
      stopped = true;
      map.off("moveend zoomend resize layeradd layerremove", schedule);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [map, eligible]);

  if (!enabled || !eligible.length) return null;
  return (
    <>
      <style>{styles}</style>
      {eligible.map((event) => {
        const lat = validCoordinate(event.latitude ?? event.lat ?? event.location?.lat, 90);
        const lng = validCoordinate(event.longitude ?? event.lng ?? event.location?.lng, 180);
        const mode = modes[String(event.id)] || "marker";
        if (mode === "hidden") return null;
        return (
          <Marker key={event.id} position={[lat, lng]} icon={iconForMode(mode, event)} zIndexOffset={-1200}
            eventHandlers={{ popupopen: (e) => {
              window.requestAnimationFrame(() => {
                const marker = e.target.getElement()?.getBoundingClientRect();
                const popup = e.popup.getElement()?.getBoundingClientRect();
                const container = map.getContainer().getBoundingClientRect();
                if (!marker || !popup) return;
                map.panBy([
                  (Math.min(marker.left, popup.left) + Math.max(marker.right, popup.right) - container.left - container.right) / 2,
                  (Math.min(marker.top, popup.top) + Math.max(marker.bottom, popup.bottom) - container.top - container.bottom) / 2,
                ], { animate: true, duration: 0.35 });
              });
            } }}>
            <Popup maxWidth={195} minWidth={165} autoPan={false} className="yardit-exclusive-event-popup">
              <ExclusiveEventPopupCard event={event} />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
