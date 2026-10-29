import test from "node:test";
import assert from "node:assert/strict";
import {
  YARDITS_UNIFIED_SIZES,
  chooseYarditsUnifiedMode,
  yarditsUnifiedBounds,
} from "../yarditsUnifiedMarqueeLayout.js";

const point = { x: 400, y: 350 };
const viewport = { width: 800, height: 650 };

test("one full Hollywood marquee at close zoom", () => {
  assert.equal(chooseYarditsUnifiedMode(point, [], viewport, 16), "full");
});

test("medium zoom shows compact branded marquee, not an unrelated icon", () => {
  assert.equal(chooseYarditsUnifiedMode(point, [], viewport, 13), "compact");
  assert.equal(chooseYarditsUnifiedMode(point, [], viewport, 15), "compact");
});

test("far zoom uses small marquee anchored at the exact event location", () => {
  assert.equal(chooseYarditsUnifiedMode(point, [], viewport, 8), "mini");
  assert.equal(chooseYarditsUnifiedMode(point, [], viewport, 12), "mini");
});

test("full sign shrinks when a cluster touches only its upper area", () => {
  const cluster = { left: 320, top: 220, right: 475, bottom: 252 };
  assert.equal(chooseYarditsUnifiedMode(point, [cluster], viewport, 16), "compact");
});

test("compact sign shrinks to small marquee to protect real icons", () => {
  const cluster = { left: 330, top: 270, right: 470, bottom: 285 };
  assert.equal(chooseYarditsUnifiedMode(point, [cluster], viewport, 15), "mini");
});

test("miniature marquee persists under a crowded Halloween cluster", () => {
  const cluster = { left: 355, top: 307, right: 449, bottom: 358 };
  assert.equal(chooseYarditsUnifiedMode(point, [cluster], viewport, 17), "mini");
  assert.equal(chooseYarditsUnifiedMode(point, [cluster], viewport, 12), "mini");
  assert.equal(chooseYarditsUnifiedMode(point, [cluster], viewport, 9), "mini");
});

test("actual cluster around the same coordinate must not hide the event too early", () => {
  const tightCluster = { left: point.x - 26, top: point.y - 26,
    right: point.x + 26, bottom: point.y + 26 };
  for (const zoom of [8, 9, 10, 11, 12, 13]) {
    assert.equal(chooseYarditsUnifiedMode(point, [tightCluster], viewport, zoom), "mini");
  }
});

test("marquee still yields to screen edges, not relocating its event coordinates", () => {
  assert.equal(chooseYarditsUnifiedMode({ x: 20, y: 50 },
    [{ left: 0, top: 0, right: 800, bottom: 650 }], viewport, 9), "hidden");
});

test("do not clip a marquee against the edge of a small mobile viewport", () => {
  assert.equal(chooseYarditsUnifiedMode({ x: 12, y: 18 }, [], viewport, 17), "hidden");
});

test("every size stays attached to the same exact event coordinates", () => {
  for (const mode of ["full", "compact", "mini"]) {
    const rect = yarditsUnifiedBounds(point, mode);
    const { anchorX, anchorY } = YARDITS_UNIFIED_SIZES[mode];
    assert.equal(rect.left + anchorX, point.x);
    assert.equal(rect.top + anchorY, point.y);
    assert.ok(Math.abs(rect.bottom - point.y) <= 3);
  }
});

test("extra space is required when expanding so the marquee does not flicker", () => {
  const full = yarditsUnifiedBounds(point, "full");
  const obstacle = { left: full.right + 14, top: full.top, right: full.right + 52, bottom: full.bottom };
  assert.equal(chooseYarditsUnifiedMode(point, [obstacle], viewport, 17, "full"), "full");
  assert.equal(chooseYarditsUnifiedMode(point, [obstacle], viewport, 17, "compact"), "compact");
});

test("invalid coordinates do not create floating artwork", () => {
  assert.equal(chooseYarditsUnifiedMode({ x: NaN, y: 15 }, [], viewport, 16), "hidden");
});
