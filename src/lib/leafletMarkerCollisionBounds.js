// Measure rendered pins and clusters across every pane, including decorative panes.
export function getRenderedLeafletMarkerBounds(map, { excludeClasses = [] } = {}) {
  const mapElement = map?.getContainer?.();
  if (!mapElement) return [];

  const mapRect = mapElement.getBoundingClientRect();
  const scaleX = mapRect.width / mapElement.offsetWidth || 1;
  const scaleY = mapRect.height / mapElement.offsetHeight || 1;
  const borderX = mapElement.clientLeft || 0;
  const borderY = mapElement.clientTop || 0;
  const result = [];

  mapElement.querySelectorAll(".leaflet-marker-icon").forEach((markerElement) => {
    if (excludeClasses.some((name) => markerElement.classList.contains(name))) return;
    const computed = window.getComputedStyle(markerElement);
    if (computed.display === "none" || computed.visibility === "hidden" ||
        Number(computed.opacity) === 0) return;

    // Include nested artwork such as Halloween badges and cluster decorations
    // that may be rendered outside the Leaflet icon's nominal width/height.
    const elements = [markerElement, ...Array.from(markerElement.querySelectorAll("*"))];
    elements.forEach((element) => {
      if (element !== markerElement) {
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" ||
            Number(style.opacity) === 0) return;
      }
      const rect = element.getBoundingClientRect();
      if (!Number.isFinite(rect.width) || rect.width < 1 ||
          !Number.isFinite(rect.height) || rect.height < 1) return;
      result.push({
        left: (rect.left - mapRect.left) / scaleX - borderX,
        top: (rect.top - mapRect.top) / scaleY - borderY,
        right: (rect.right - mapRect.left) / scaleX - borderX,
        bottom: (rect.bottom - mapRect.top) / scaleY - borderY,
      });
    });
  });
  return result;
}