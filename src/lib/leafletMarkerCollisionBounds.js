// Read the markers Leaflet actually displays, including markers inside LayerGroups.
// map.eachLayer() does not visit the children of the separate Halloween/regular
// clustering layers, which is why the earlier marquee collision check missed them.
export function getRenderedLeafletMarkerBounds(map, { excludeClasses = [] } = {}) {
  const pane = map?.getPanes?.()?.markerPane;
  const mapElement = map?.getContainer?.();
  if (!pane || !mapElement) return [];

  const mapRect = mapElement.getBoundingClientRect();
  const result = [];

  pane.querySelectorAll(".leaflet-marker-icon").forEach((markerElement) => {
    if (excludeClasses.some((name) => markerElement.classList.contains(name))) return;
    const computed = window.getComputedStyle(markerElement);
    if (computed.display === "none" || computed.visibility === "hidden" ||
        Number(computed.opacity) === 0) return;

    // Include nested artwork such as Halloween badges and cluster decorations
    // that may be rendered outside the Leaflet icon's nominal width/height.
    const elements = [markerElement, ...Array.from(markerElement.querySelectorAll("*")).slice(0, 25)];
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
        left: rect.left - mapRect.left,
        top: rect.top - mapRect.top,
        right: rect.right - mapRect.left,
        bottom: rect.bottom - mapRect.top,
      });
    });
  });
  return result;
}
