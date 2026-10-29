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

test("hide decoration rather than cover a cluster if even mini cannot fit", () => {
  const cluster = { left: 355, top: 307, right: 449, bottom: 358 };
  assert.equal(chooseYarditsUnifiedMode(point, [cluster], viewport, 17), "hidden");
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
