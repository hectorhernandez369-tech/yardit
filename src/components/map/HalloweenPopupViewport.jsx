import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function HalloweenPopupViewport() {
  const map = useMap();
  useEffect(() => {
    let popup = null;
    let frame;
    const fit = () => {
      if (!window.matchMedia("(max-width: 639px)").matches || !popup?.isOpen()) return;
      const element = popup.getElement();
      if (!element?.classList.contains("yardit-halloween-popup")) return;
      const bounds = map.getContainer().getBoundingClientRect();
      const viewport = window.visualViewport;
      const nav = document.querySelector(".yardit-mobile-bottom-nav");
      const top = Math.max(bounds.top + 64, viewport?.offsetTop || 0);
      const bottom = Math.min(bounds.bottom, (viewport?.offsetTop || 0) + (viewport?.height || window.innerHeight), nav?.getClientRects().length ? nav.getBoundingClientRect().top : Infinity) - 16;
      const card = element.querySelector(".leaflet-popup-content > div");
      if (card) card.style.maxHeight = `${Math.max(100, Math.min(window.innerHeight * 0.42, bottom - top - 40))}px`;
      const rect = element.getBoundingClientRect();
      const dy = rect.bottom > bottom ? rect.bottom - bottom : rect.top < top ? rect.top - top : 0;
      const dx = rect.right > bounds.right - 12 ? rect.right - bounds.right + 12 : rect.left < bounds.left + 12 ? rect.left - bounds.left - 12 : 0;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) map.panBy([dx, dy], { animate: false });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit); };
    const observer = new ResizeObserver(schedule);
    const onOpen = (event) => { popup = event.popup; observer.disconnect(); observer.observe(map.getContainer()); if (popup.getElement()) observer.observe(popup.getElement()); schedule(); };
    const onClose = () => { popup = null; observer.disconnect(); };
    map.on("popupopen", onOpen);
    map.on("popupclose", onClose);
    map.on("moveend resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      map.off("popupopen", onOpen);
      map.off("popupclose", onClose);
      map.off("moveend resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, [map]);
  return null;
}