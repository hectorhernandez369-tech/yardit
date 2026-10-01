import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { getHalloweenViewportBounds } from "@/components/map/halloweenPopupPosition";

// Determine minimum zoom for a tier
function getMinZoomForTier(tier) {
  if (tier === "premium" || tier === "neighborhood_tier") return 11;
  if (tier === "featured" || tier === "map_pin") return 13;
  return 15; // free
}

export default function MapFocusController({ focusData, markerRefsMap, onFocusComplete }) {
  const map = useMap();
  const completeRef = useRef(onFocusComplete);
  completeRef.current = onFocusComplete;

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

    // Place the pin lower in the map so the full popup clears the map toolbar.
    const mapHeight = map.getSize()?.y || 0;
    const isHalloweenListing = listing.listingType === "halloween_candy" || listing.type === "halloween_candy";
    const mobileHalloween = isHalloweenListing && window.matchMedia("(max-width: 639px)").matches;
    let verticalOffset = isHalloweenListing
      ? Math.min(180, Math.max(140, mapHeight * 0.3))
      : Math.min(130, Math.max(70, mapHeight * 0.18));
    if (mobileHalloween) {
      const bounds = getHalloweenViewportBounds(map);
      const iconHeight = markerRefsMap.current[listing.id]?.getElement()?.getBoundingClientRect().height || 0;
      verticalOffset = Math.min(verticalOffset, bounds.bottom - bounds.mapTop - iconHeight / 2 - mapHeight / 2);
    }
    const targetPoint = map.project([lat, lng], targetZoom).subtract([0, verticalOffset]);
    const targetCenter = map.unproject(targetPoint, targetZoom);

    const finish = () => {
      markerRefsMap.current[listing.id]?.openPopup();
      completeRef.current?.();
    };
    // Halloween fitting waits until the flight ends so the two pans cannot compete.
    if (mobileHalloween) map.once("moveend", finish);
    map.flyTo(targetCenter, targetZoom, { animate: true, duration: 0.65 });
    const timer = mobileHalloween ? null : setTimeout(finish, 600);
    return () => {
      map.off("moveend", finish);
      if (timer !== null) clearTimeout(timer);
    };
  }, [focusData, map, markerRefsMap]);

  return null;
}