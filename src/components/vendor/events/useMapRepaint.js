import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";

const EVENTS = ["move", "zoom", "viewreset", "moveend", "zoomend", "resize", "zoomanim"];

// Forces a re-render whenever the map is panned or zoomed so that overlay
// components (labels, toolbars, handles) can recompute their pixel positions.
export function useMapRepaint() {
  const map = useMap();
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => (t + 1) % 1e9);
    EVENTS.forEach((e) => map.on(e, bump));
    return () => EVENTS.forEach((e) => map.off(e, bump));
  }, [map]);
}