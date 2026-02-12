import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

// Determine minimum zoom for a tier
function getMinZoomForTier(tier) {
  if (tier === "premium" || tier === "neighborhood_tier") return 11;
  if (tier === "featured" || tier === "map_pin") return 13;
  return 15; // free
}

export default function MapFocusController({ focusListing, markerRefsMap, onFocusComplete }) {
  const map = useMap();
  const hasHandledInitialFocus = useRef(false);

  useEffect(() => {
    if (!focusListing) return;
    if (!focusListing.lat || !focusListing.lng) return;

    const currentZoom = map.getZoom();
    const minZoom = getMinZoomForTier(focusListing.tier);
    const targetZoom = Math.max(currentZoom, minZoom);

    // Center map on listing
    map.flyTo([focusListing.lat, focusListing.lng], targetZoom, { 
      animate: true,
      duration: 0.5 
    });

    // Open popup after animation
    setTimeout(() => {
      const ref = markerRefsMap.current[focusListing.id];
      if (ref) {
        ref.openPopup();
      }
      if (onFocusComplete && !hasHandledInitialFocus.current) {
        hasHandledInitialFocus.current = true;
        onFocusComplete();
      }
    }, 600);
  }, [focusListing, map, markerRefsMap, onFocusComplete]);

  return null;
}