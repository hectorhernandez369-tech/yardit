import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

// Determine minimum zoom for a tier
function getMinZoomForTier(tier) {
  if (tier === "premium" || tier === "neighborhood_tier") return 11;
  if (tier === "featured" || tier === "map_pin") return 13;
  return 15; // free
}

export default function MapFocusController({ focusData, markerRefsMap, onFocusComplete }) {
  const map = useMap();

  useEffect(() => {
    if (!focusData) return;
    const { listing, fromUrl } = focusData;
    if (!listing || !listing.lat || !listing.lng) return;

    const currentZoom = map.getZoom();
    let targetZoom = currentZoom;

    // Only apply tier-based zoom when navigating from URL
    if (fromUrl) {
      const minZoom = getMinZoomForTier(listing.tier);
      targetZoom = Math.max(currentZoom, minZoom);
    }

    // Center map on listing
    map.flyTo([listing.lat, listing.lng], targetZoom, { 
      animate: true,
      duration: 0.5 
    });

    // Open popup after animation
    setTimeout(() => {
      const ref = markerRefsMap.current[listing.id];
      if (ref) {
        ref.openPopup();
      }
      if (onFocusComplete) {
        onFocusComplete();
      }
    }, 600);
  }, [focusData, map, markerRefsMap, onFocusComplete]);

  return null;
}