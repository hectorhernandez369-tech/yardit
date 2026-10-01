export function getHalloweenViewportBounds(map) {
  const bounds = map.getContainer().getBoundingClientRect();
  const viewport = window.visualViewport;
  const nav = document.querySelector(".yardit-mobile-bottom-nav");
  return {
    mapTop: bounds.top,
    top: Math.max(bounds.top + 64, viewport?.offsetTop || 0),
    bottom: Math.min(bounds.bottom, (viewport?.offsetTop || 0) + (viewport?.height || window.innerHeight), nav?.getClientRects().length ? nav.getBoundingClientRect().top : Infinity) - 16,
    left: bounds.left + 12,
    right: bounds.right - 12,
  };
}

export default function fitHalloweenPopup(map, popup) {
  if (!window.matchMedia("(max-width: 639px)").matches || !popup?.isOpen()) return;
  const element = popup.getElement();
  if (!element?.classList.contains("yardit-halloween-popup")) return;
  let marker;
  map.eachLayer((layer) => {
    if (layer.getPopup?.() === popup) marker = layer.getElement?.();
  });
  const bounds = getHalloweenViewportBounds(map);
  const card = element.querySelector(".leaflet-popup-content > div");
  const markerRect = marker?.getBoundingClientRect();
  let rect = element.getBoundingClientRect();
  if (card) {
    // Reserve space for the full icon below the popup, not just the popup tip.
    const below = Math.max(0, (markerRect?.bottom ?? rect.bottom) - rect.bottom);
    const chrome = rect.height - card.getBoundingClientRect().height;
    card.style.maxHeight = `${Math.max(80, Math.min(window.innerHeight * 0.42, bounds.bottom - bounds.top - below - chrome))}px`;
    rect = element.getBoundingClientRect();
  }
  const bottom = Math.max(rect.bottom, markerRect?.bottom ?? rect.bottom);
  const top = Math.min(rect.top, markerRect?.top ?? rect.top);
  const left = Math.min(rect.left, markerRect?.left ?? rect.left);
  const right = Math.max(rect.right, markerRect?.right ?? rect.right);
  const dy = bottom > bounds.bottom ? bottom - bounds.bottom : top < bounds.top ? top - bounds.top : 0;
  const dx = right > bounds.right ? right - bounds.right : left < bounds.left ? left - bounds.left : 0;
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) map.panBy([dx, dy], { animate: false });
}