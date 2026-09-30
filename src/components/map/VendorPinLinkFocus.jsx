import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { getVendorPinMinZoom } from "@/components/map/vendorMarkerIcons";
import { isLiveVendorCheckIn } from "@/lib/vendorTiers";

export default function VendorPinLinkFocus({ target, markerRefs, currentZoom, markerAvailable }) {
  const map = useMap();
  const opened = useRef(false);
  useEffect(() => {
    if (!target || opened.current || !isLiveVendorCheckIn(target.checkIn)) return;
    const { checkIn, account } = target;
    map.setView([checkIn.checkin_latitude, checkIn.checkin_longitude], getVendorPinMinZoom(account), { animate: false });
    const openWhenMounted = () => {
      const marker = markerRefs.current[checkIn.id];
      if (!opened.current && isLiveVendorCheckIn(checkIn) && marker?.getPopup() && map.hasLayer(marker)) {
        opened.current = true;
        marker.openPopup();
      }
    };
    // Leaflet layers attach after React commits; wait for the actual marker,
    // including when changing zoom has to make that marker visible first.
    map.on("layeradd", openWhenMounted);
    const frame = requestAnimationFrame(openWhenMounted);
    return () => {
      cancelAnimationFrame(frame);
      map.off("layeradd", openWhenMounted);
    };
  }, [target, currentZoom, markerAvailable, markerRefs, map]);
  return null;
}