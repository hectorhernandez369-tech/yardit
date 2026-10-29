import React, { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Pane, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { getVendorEventVisibilityStatus } from "@/lib/vendorEventPromotion";
import { chooseYarditsUnifiedMode, YARDITS_UNIFIED_SIZES } from "@/lib/yarditsUnifiedMarqueeLayout.js";
import { getRenderedLeafletMarkerBounds } from "@/lib/leafletMarkerCollisionBounds";
import ExclusiveEventPopupCard from "@/components/map/ExclusiveEventPopupCard";
import "@/components/map/yarditsUnifiedMarquee.css";

function escapeText(text) {
  return String(text || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));
}

// The marquee is itself the ONE event marker, not an overlay above a second pin.
// Its bottom anchor remains attached to the event coordinates at every zoom.
function buildMarqueeIcon(event, mode) {
  const size = YARDITS_UNIFIED_SIZES[mode];
  const headline = escapeText(
    String(event.organizer_business_name || event.title || "FEATURED EVENT")
      .split(/\s+aka\b/i)[0].trim().slice(0, 30)
  );
  const status = getVendorEventVisibilityStatus(event, new Date()) === "active"
    ? "LIVE NOW" : "COMING SOON";
  const beams = mode === "full"
    ? '<div class="yardits-unified-beam yardits-unified-beam--left" aria-hidden="true"></div>' +
      '<div class="yardits-unified-beam yardits-unified-beam--right" aria-hidden="true"></div>'
    : "";
  const html =
    '<div class="yardits-unified-scene yardits-unified-scene--' + mode + '">' +
      beams +
      '<div class="yardits-unified-sign" role="img" aria-label="Yardit&#39;s Own: ' + headline + '">' +
        '<div class="yardits-unified-kicker">YARDIT&#39;S OWN!</div>' +
        '<div class="yardits-unified-headline">' + headline + '</div>' +
        '<div class="yardits-unified-status">' + status + '</div>' +
      '</div>' +
      '<div class="yardits-unified-pointer" aria-hidden="true"></div>' +
    '</div>';

  return L.divIcon({
    className: "yardits-unified-exclusive-marker",
    html,
    iconSize: [size.width, size.height],
    iconAnchor: [size.anchorX, size.anchorY],
    popupAnchor: [0, -size.height + 6],
  });
}

export default function YarditsOnUnifiedMarker({ event, registerMarker }) {
  const map = useMap();
  const [mode, setMode] = useState("mini");
  const modeRef = useRef("mini");
  const lat = Number(event.latitude ?? event.lat ?? event.location?.lat);
  const lng = Number(event.longitude ?? event.lng ?? event.location?.lng);
  const markerIcon = useMemo(
    () => mode === "hidden" ? null : buildMarqueeIcon(event, mode),
    [event, mode]
  );

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    let frame = 0;
    let cancelled = false;

    const refresh = () => {
      if (cancelled) return;
      const size = map.getSize();
      const point = map.latLngToContainerPoint([lat, lng]);
      const obstacles = getRenderedLeafletMarkerBounds(map, {
        excludeClasses: ["yardits-unified-exclusive-marker"],
      });
      const nextMode = chooseYarditsUnifiedMode(
        point, obstacles, { width: size.x, height: size.y }, map.getZoom(), modeRef.current
      );
      if (nextMode === modeRef.current) return;
      modeRef.current = nextMode;
      setMode(nextMode);
    };

    const schedule = () => {
      if (cancelled || frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        refresh();
      });
    };

    const observer = typeof MutationObserver !== "undefined"
      ? new MutationObserver(schedule) : null;
    const pane = map.getPanes().mapPane;
    if (pane) observer?.observe(pane, {
      childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"],
    });
    map.on("moveend zoomend resize layeradd layerremove", schedule);
    schedule();

    return () => {
      cancelled = true;
      observer?.disconnect();
      map.off("moveend zoomend resize layeradd layerremove", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [map, lat, lng]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || mode === "hidden") return null;

  return (
    // Lower than Leaflet's normal marker pane (600). Halloween pins and
    // cluster circles always draw above the marquee without being hidden.
    <Pane name="yardits-unified-marquee-preview" style={{ zIndex: 575, pointerEvents: "none" }}>
      <Marker
        position={[lat, lng]}
        icon={markerIcon}
        ref={registerMarker}
        title={"Yardit's Own: " + (event.organizer_business_name || event.title)}
      >
        <Popup pane="popupPane" maxWidth={270} minWidth={205} autoPan={false} className="yardit-exclusive-event-popup">
          <ExclusiveEventPopupCard event={event} />
        </Popup>
      </Marker>
    </Pane>
  );
}