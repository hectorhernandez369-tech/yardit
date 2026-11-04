/**
 * Place the Christmas pin and its open detail card together in the map viewport.
 * The popup is anchored above the pin; centering just the pin clips the card.
 * Use the measured popup height instead of a fixed mobile/desktop offset.
 */
export function centerChristmasPopup(map, latlng, popupElement, animate = true) {
  if (!map || !latlng) return;
  const lat = Number(latlng.lat ?? latlng[0]);
  const lng = Number(latlng.lng ?? latlng[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const { x: mapWidth, y: mapHeight } = map.getSize();
  if (!mapWidth || !mapHeight) return;

  const popupHeight = Math.min(
    Number(popupElement?.getBoundingClientRect?.().height || 290),
    Math.max(160, mapHeight - 130)
  );
  // Center the combined vertical footprint (detail card + pin), not only the pin.
  // Keep clearance for top map controls and safe-area headers.
  const topClearance = mapHeight < 550 ? 72 : 88;
  const bottomClearance = mapHeight < 550 ? 52 : 65;
  const availableHeight = Math.max(1, mapHeight - topClearance - bottomClearance);
  const effectiveHeight = Math.min(popupHeight + 45, availableHeight);
  const desiredPinY = Math.min(
    mapHeight - bottomClearance,
    Math.max(topClearance + effectiveHeight - 14, (mapHeight + popupHeight) / 2)
  );
  const zoom = map.getZoom();
  const pinPoint = map.project([lat, lng], zoom);
  const centerPoint = pinPoint.subtract([0, desiredPinY - mapHeight / 2]);
  const targetCenter = map.unproject(centerPoint, zoom);
  if (animate) map.panTo(targetCenter, { animate: true, duration: 0.4 });
  else map.setView(targetCenter, zoom, { animate: false });
}
