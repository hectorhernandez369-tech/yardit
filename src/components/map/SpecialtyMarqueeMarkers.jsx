import React, { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { SPECIALTY_COLORS, SPECIALTY_FONTS, specialtyStyle, escapeSpecialtyText } from "@/lib/specialtyMarquee";
import { SPECIALTY_MARQUEE_SIZES, chooseSpecialtyMarqueeMode } from "@/lib/specialtyMarqueeCollision";
import { getRenderedLeafletMarkerBounds } from "@/lib/leafletMarkerCollisionBounds";

// Independent emergency switch. The normal event pins and clusters remain untouched.
export const SPECIALTY_MARQUEES_ENABLED = true;

const css = [
  ".yardit-specialty-marker{background:transparent;border:0}",
  ".yardit-specialty-scene{position:relative;width:164px;height:152px}",
  ".yardit-specialty-beam{position:absolute;bottom:57px;left:75px;width:16px;height:83px;transform-origin:50% 100%;opacity:.78;background:linear-gradient(to top,rgba(255,213,105,.9),rgba(255,239,183,.18) 80%,transparent);clip-path:polygon(38% 100%,62% 100%,100% 0,0 0);filter:drop-shadow(0 0 8px #ffd58a);pointer-events:none}",
  ".yardit-specialty-beam.left{animation:yardit-specialty-left 3.6s ease-in-out infinite alternate}",
  ".yardit-specialty-beam.right{animation:yardit-specialty-right 3.6s ease-in-out infinite alternate}",
  ".yardit-specialty-sign{position:absolute;bottom:13px;left:13px;width:138px;box-sizing:border-box;padding:8px 5px;text-align:center;border-width:5px;border-style:dotted;border-radius:10px;box-shadow:0 0 0 3px #a66a28,0 0 19px rgba(255,180,62,.8);color:#ffe8aa}",
  ".yardit-specialty-small-scene{position:relative;width:116px;height:72px}",
  ".yardit-specialty-small-sign{position:absolute;inset:3px;box-sizing:border-box;border-width:3px;border-style:solid;border-radius:10px;padding:5px;text-align:center;color:#ffe8aa;box-shadow:0 0 8px rgba(255,180,62,.5)}",
  ".yardit-specialty-small-headline{font-size:12px;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.35}",
  ".yardit-specialty-mini-scene{position:relative;width:38px;height:42px}",
  ".yardit-specialty-mini-circle{position:absolute;top:1px;left:2px;width:34px;height:34px;border-width:3px;border-style:solid;border-radius:50%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.28);color:#ffe8aa;font-size:21px;line-height:1}",
  ".yardit-specialty-mini-tail{position:absolute;bottom:0;left:14px;width:10px;height:10px;transform:rotate(45deg);border-right:3px solid #f5cf79;border-bottom:3px solid #f5cf79;box-sizing:border-box}",
  "@keyframes yardit-specialty-left{from{transform:rotate(-36deg)}to{transform:rotate(12deg)}}",
  "@keyframes yardit-specialty-right{from{transform:rotate(36deg)}to{transform:rotate(-12deg)}}",
  "@media(prefers-reduced-motion:reduce){.yardit-specialty-beam{animation:none!important}.yardit-specialty-beam.left{transform:rotate(-22deg)}.yardit-specialty-beam.right{transform:rotate(22deg)}}"
].join("\n");

function iconFor(listing, mode) {
  const preset = specialtyStyle({
    color: listing.specialty_marquee_color,
    font: listing.specialty_marquee_font,
    headline: listing.specialty_marquee_headline || listing.title,
  });
  const palette = SPECIALTY_COLORS[preset.color];
  const headline = escapeSpecialtyText(preset.headline || listing.title || "SPECIAL EVENT");
  const colors = "background:" + palette.background + ";border-color:" + palette.border +
    ";font-family:" + SPECIALTY_FONTS[preset.font] + ";";
  let html;

  if (mode === "full") {
    html = '<div class="yardit-specialty-scene">' +
      '<div class="yardit-specialty-beam left" aria-hidden="true"></div>' +
      '<div class="yardit-specialty-beam right" aria-hidden="true"></div>' +
      '<div class="yardit-specialty-sign" style="' + colors + '">' +
      '<div style="font-size:10px;font-weight:900">YARDIT&#39;S ON!</div>' +
      '<div style="font-size:16px;font-weight:900;line-height:1.15;overflow-wrap:anywhere">' + headline + '</div>' +
      '<div style="font-size:9px;font-weight:800;color:white">COMING SOON</div>' +
      '</div></div>';
  } else if (mode === "compact") {
    html = '<div class="yardit-specialty-small-scene">' +
      '<div class="yardit-specialty-small-sign" style="' + colors + '">' +
      '<div style="font-size:9px;font-weight:900">SPECIAL EVENT</div>' +
      '<div class="yardit-specialty-small-headline">' + headline + '</div>' +
      '</div></div>';
  } else {
    html = '<div class="yardit-specialty-mini-scene" aria-label="Specialty Event">' +
      '<div class="yardit-specialty-mini-tail" style="background:' + palette.background + '"></div>' +
      '<div class="yardit-specialty-mini-circle" style="' + colors + '">★</div>' +
      '</div>';
  }

  const size = SPECIALTY_MARQUEE_SIZES[mode];
  return L.divIcon({
    className: "yardit-specialty-marker yardit-specialty-" + mode,
    html,
    iconSize: [size.width, size.height],
    iconAnchor: [size.anchorX, size.anchorY],
    popupAnchor: [0, size.popupY],
  });
}

export default function SpecialtyMarqueeMarkers({
  listings = [], approvals = [], enabled = SPECIALTY_MARQUEES_ENABLED,
}) {
  const map = useMap();
  const [modes, setModes] = useState({});
  const modesRef = useRef({});
  const visible = useMemo(() => {
    if (!enabled) return [];
    const approvedIds = new Set(
      approvals.filter((approval) => approval.enabled === true).map((approval) => String(approval.listing_id))
    );
    const now = Date.now();
    return listings.filter((listing) =>
      listing.listingType === "event" &&
      listing.specialty_marquee_enabled === true &&
      approvedIds.has(String(listing.id)) &&
      listing.created_by_admin === true &&
      ["active", "scheduled", "activated_locked"].includes(listing.status) &&
      listing.lat !== null && listing.lat !== undefined &&
      listing.lng !== null && listing.lng !== undefined &&
      Number.isFinite(Number(listing.lat)) && Number.isFinite(Number(listing.lng)) &&
      (!listing.endDateTime || Date.parse(listing.endDateTime) >= now)
    ).slice(0, 3);
  }, [listings, approvals, enabled]);

  useEffect(() => {
    let frame = 0;
    let stopped = false;

    const refresh = () => {
      if (stopped) return;
      const size = map.getSize();
      const obstacles = getRenderedLeafletMarkerBounds(map, { excludeClasses: ["yardit-specialty-marker"] });
      const next = {};

      visible.forEach((listing) => {
        const id = String(listing.id);
        const point = map.latLngToContainerPoint([Number(listing.lat), Number(listing.lng)]);
        const chosen = chooseSpecialtyMarqueeMode(
          point, obstacles, { width: size.x, height: size.y }, modesRef.current[id]
        );
        next[id] = chosen.mode;
        // A marquee must also avoid other marquees; reserve each accepted screen rectangle.
        if (chosen.rect) obstacles.push(chosen.rect);
      });

      const previous = modesRef.current;
      const keys = Object.keys(next);
      if (keys.length === Object.keys(previous).length &&
          keys.every((key) => next[key] === previous[key])) return;
      modesRef.current = next;
      setModes(next);
    };

    const schedule = () => {
      if (stopped || frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        refresh();
      });
    };

    // Leaflet creates cluster markers outside React. Observe those additions and removals
    // without measuring every frame of a drag or causing an observer feedback loop.
    const pane = map.getPanes().markerPane;
    const observer = typeof MutationObserver !== "undefined" ? new MutationObserver(schedule) : null;
    if (pane) observer?.observe(pane, { childList: true, subtree: true });
    map.on("moveend zoom zoomend resize layeradd layerremove", schedule);
    schedule();

    return () => {
      stopped = true;
      map.off("moveend zoom zoomend resize layeradd layerremove", schedule);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [map, visible]);

  if (!enabled) return null;

  return (
    <>
      <style>{css}</style>
      {visible.map((listing) => {
        const mode = modes[String(listing.id)] || "marker";
        if (mode === "hidden") return null;
        return (
          <Marker
            key={listing.id}
            position={[Number(listing.lat), Number(listing.lng)]}
            icon={iconFor(listing, mode)}
            title={listing.title || "Specialty Event"}
            zIndexOffset={-1200}
            eventHandlers={{
              popupopen: (event) => {
                window.requestAnimationFrame(() => {
                  const markerBounds = event.target.getElement()?.getBoundingClientRect();
                  const popupBounds = event.popup.getElement()?.getBoundingClientRect();
                  const containerBounds = map.getContainer().getBoundingClientRect();
                  if (!markerBounds || !popupBounds) return;
                  const left = Math.min(markerBounds.left, popupBounds.left);
                  const right = Math.max(markerBounds.right, popupBounds.right);
                  const top = Math.min(markerBounds.top, popupBounds.top);
                  const bottom = Math.max(markerBounds.bottom, popupBounds.bottom);
                  map.panBy([
                    (left + right - containerBounds.left - containerBounds.right) / 2,
                    (top + bottom - containerBounds.top - containerBounds.bottom) / 2,
                  ], { animate: true, duration: 0.35 });
                });
              },
            }}
          >
            <Popup maxWidth={195} minWidth={165} autoPan={false}>
              <div style={{ maxWidth: 190, padding: 5 }}>
                <strong>{listing.title}</strong>
                <p>{listing.display_address || listing.addressText}</p>
                <p>{listing.startDateTime ? new Date(listing.startDateTime).toLocaleString() : ""}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
