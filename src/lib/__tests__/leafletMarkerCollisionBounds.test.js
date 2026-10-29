import test from "node:test";
import assert from "node:assert/strict";
import { getRenderedLeafletMarkerBounds } from "../leafletMarkerCollisionBounds.js";
import { chooseSpecialtyMarqueeMode } from "../specialtyMarqueeCollision.js";

function element(left, top, width, height, { children = [], classes = [], style = {} } = {}) {
  return {
    classList: { contains: (name) => classes.includes(name) },
    style: { display: "block", visibility: "visible", opacity: "1", ...style },
    getBoundingClientRect: () => ({ left, top, right: left + width, bottom: top + height, width, height }),
    querySelectorAll: () => children,
  };
}

function mapFor(markers, { scale = 1, left = 0, top = 0 } = {}) {
  const container = element(left, top, 384 * scale, 600 * scale);
  container.offsetWidth = 384;
  container.offsetHeight = 600;
  container.querySelectorAll = (selector) => selector === ".leaflet-marker-icon" ? markers : [];
  // Custom-pane markers are deliberately absent from the default marker pane.
  return { getContainer: () => container, getPanes: () => ({ markerPane: { querySelectorAll: () => [] } }) };
}

function mockStyles(t) {
  const previous = globalThis.window;
  globalThis.window = { getComputedStyle: (node) => node.style };
  t.after(() => {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  });
}

test("collects pins in custom panes and excludes only the requested decoration", (t) => {
  mockStyles(t);
  const pin = element(180, 280, 30, 40);
  const marquee = element(100, 100, 164, 152, { classes: ["yardits-on-marker"] });
  assert.deepEqual(getRenderedLeafletMarkerBounds(mapFor([pin, marquee]), {
    excludeClasses: ["yardits-on-marker"],
  }), [{ left: 180, top: 280, right: 210, bottom: 320 }]);
});

test("scaled mobile containers use the same coordinates as the collision calculation", (t) => {
  mockStyles(t);
  const pin = element(90, 120, 30, 45);
  const bounds = getRenderedLeafletMarkerBounds(mapFor([pin], { scale: 0.5, left: 10, top: 20 }));
  assert.deepEqual(bounds, [{ left: 160, top: 200, right: 220, bottom: 290 }]);
  assert.equal(chooseSpecialtyMarqueeMode({ x: 192, y: 350 }, bounds, { width: 384, height: 600 }).mode, "hidden");
});

test("nested artwork is measured even after many decorative children", (t) => {
  mockStyles(t);
  const children = Array.from({ length: 25 }, () => element(0, 0, 0, 0));
  children.push(element(120, 140, 90, 60));
  const bounds = getRenderedLeafletMarkerBounds(mapFor([element(0, 0, 0, 0, { children })]));
  assert.deepEqual(bounds, [{ left: 120, top: 140, right: 210, bottom: 200 }]);
});

test("cluster-hidden pins are skipped and measured again when they reappear", (t) => {
  mockStyles(t);
  const pin = element(180, 280, 30, 40, { style: { display: "none" } });
  const map = mapFor([pin]);
  assert.deepEqual(getRenderedLeafletMarkerBounds(map), []);
  pin.style.display = "block";
  assert.equal(getRenderedLeafletMarkerBounds(map).length, 1);
});