// One-finger quick zoom for the main Leaflet map; native pan/pinch stay intact.
export default function attachMapHoldZoom(map) {
  const container = map.getContainer();
  const options = { capture: true, passive: false };
  let first = null, lastTap = null, gesture = null, frame = 0, suppressUntil = 0;
  const stop = (event) => { if (event.cancelable) event.preventDefault(); event.stopImmediatePropagation(); };
  const distance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const position = (touch) => ({ clientX: touch.clientX, clientY: touch.clientY });
  const applyZoom = () => {
    frame = 0;
    if (gesture?.moved) map.setZoomAround(gesture.anchor, gesture.zoom, { animate: false });
  };
  const finish = (cancelled = false) => {
    if (!gesture) return;
    cancelAnimationFrame(frame);
    frame = 0;
    const current = gesture;
    if (current.moved) applyZoom();
    map.options.zoomSnap = current.snap;
    gesture = null;
    suppressUntil = Date.now() + 500;
    if (current.moved) {
      const zoom = current.snap ? Math.round(map.getZoom() / current.snap) * current.snap : map.getZoom();
      map.setZoomAround(current.anchor, zoom, { animate: false });
    } else if (!cancelled) {
      map.setZoomAround(current.anchor, current.startZoom + map.options.zoomDelta, { animate: false });
    }
  };
  const start = (event) => {
    if (event.touches.length !== 1) {
      finish(true);
      first = lastTap = null;
      return; // Let Leaflet take over two-finger pinch zoom.
    }
    if (event.target.closest('.leaflet-control, .leaflet-marker-icon, .leaflet-popup, .leaflet-interactive, button, a, input, [role="button"]')) {
      first = lastTap = null;
      return;
    }
    const touch = event.touches[0];
    const now = Date.now();
    if (lastTap && now - lastTap.time <= 320 && distance(touch, lastTap) <= 30) {
      stop(event); // Prevent the second tap from starting a pan or long-press.
      map.stop();
      gesture = { id: touch.identifier, y: touch.clientY, startZoom: map.getZoom(), zoom: map.getZoom(),
        anchor: map.mouseEventToContainerPoint(touch), snap: map.options.zoomSnap, moved: false };
      map.options.zoomSnap = 0;
      first = lastTap = null;
    } else {
      first = { ...position(touch), time: now, id: touch.identifier };
      lastTap = null;
    }
  };
  const move = (event) => {
    if (!gesture) {
      if (first && (event.touches.length !== 1 || distance(event.touches[0], first) > 12)) first = null;
      return;
    }
    if (event.touches.length !== 1) { finish(true); return; }
    const touch = event.touches[0];
    if (touch.identifier !== gesture.id) return;
    stop(event);
    const delta = gesture.y - touch.clientY;
    if (Math.abs(delta) > 6) gesture.moved = true;
    if (!gesture.moved) return;
    gesture.zoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), gesture.startZoom + delta / 120));
    if (!frame) frame = requestAnimationFrame(applyZoom);
  };
  const end = (event) => {
    if (gesture) { stop(event); finish(event.type === 'touchcancel'); }
    else if (first && event.type !== 'touchcancel' && !event.touches.length) {
      const touch = Array.from(event.changedTouches).find((item) => item.identifier === first.id);
      if (touch && Date.now() - first.time <= 250 && distance(touch, first) <= 12) {
        lastTap = { ...position(touch), time: Date.now() };
      }
    }
    first = null;
  };
  const suppress = (event) => {
    if (gesture || Date.now() < suppressUntil) stop(event);
  };
  const blur = () => { finish(true); first = lastTap = null; };
  container.addEventListener('touchstart', start, options);
  document.addEventListener('touchmove', move, options);
  document.addEventListener('touchend', end, options);
  document.addEventListener('touchcancel', end, options);
  ['click', 'dblclick', 'contextmenu'].forEach((type) => container.addEventListener(type, suppress, options));
  window.addEventListener('blur', blur);
  return () => {
    cancelAnimationFrame(frame);
    if (gesture) map.options.zoomSnap = gesture.snap;
    container.removeEventListener('touchstart', start, options);
    document.removeEventListener('touchmove', move, options);
    document.removeEventListener('touchend', end, options);
    document.removeEventListener('touchcancel', end, options);
    ['click', 'dblclick', 'contextmenu'].forEach((type) => container.removeEventListener(type, suppress, options));
    window.removeEventListener('blur', blur);
  };
}