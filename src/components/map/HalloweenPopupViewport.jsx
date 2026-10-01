import { useEffect } from "react";
import { useMap } from "react-leaflet";
import fitHalloweenPopup from "@/components/map/halloweenPopupPosition";

export default function HalloweenPopupViewport() {
  const map = useMap();
  useEffect(() => {
    let popup = null;
    let frame;
    let moving = false;
    const fit = () => { if (!moving) fitHalloweenPopup(map, popup); };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit); };
    const observer = new ResizeObserver(schedule);
    const onOpen = (event) => { popup = event.popup; observer.disconnect(); observer.observe(map.getContainer()); if (popup.getElement()) observer.observe(popup.getElement()); schedule(); };
    const onClose = () => { popup = null; observer.disconnect(); };
    map.on("popupopen", onOpen);
    map.on("popupclose", onClose);
    const onMoveStart = () => { moving = true; };
    const onMoveEnd = () => { moving = false; schedule(); };
    map.on("movestart", onMoveStart);
    map.on("moveend", onMoveEnd);
    map.on("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      map.off("popupopen", onOpen);
      map.off("popupclose", onClose);
      map.off("movestart", onMoveStart);
      map.off("moveend", onMoveEnd);
      map.off("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, [map]);
  return null;
}