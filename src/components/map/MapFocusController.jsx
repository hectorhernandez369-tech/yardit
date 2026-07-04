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
    if (!listing) return;

    const lat = Number(listing.lat);
    const lng = Number(listing.lng);

    if (isNaN(lat) || isNaN(lng)) return;

    const currentZoom = map.getZoom() ?? 13;
    let targetZoom = currentZoom;

    // Only apply tier-based zoom when navigating from URL
    if (fromUrl) {
      const minZoom = getMinZoomForTier(listing.tier);
      targetZoom = Math.max(currentZoom, minZoom);
    }
    
    if (isNaN(targetZoom)) targetZoom = 13;

    // Center map on listing
    map.flyTo([lat, lng], targetZoom, { 
      animate: true,
      duration: 0.65 
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