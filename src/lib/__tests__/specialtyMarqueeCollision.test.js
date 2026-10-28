import test from "node:test";
import assert from "node:assert/strict";
import {
  chooseSpecialtyMarqueeMode,
  getSpecialtyScreenBounds,
  specialtyRectsOverlap,
} from "../specialtyMarqueeCollision.js";

const viewport = { width: 800, height: 600 };
const center = { x: 400, y: 350 };

test("full display leaves the event point clear", () => {
  const result = chooseSpecialtyMarqueeMode(center, [], viewport);
  assert.equal(result.mode, "full");
  assert.equal(result.rect.bottom, center.y - 42);
});

test("nearby cluster forces compact sign without covering cluster", () => {
  const cluster = { left: 325, top: 170, right: 360, bottom: 220 };
  const result = chooseSpecialtyMarqueeMode(center, [cluster], viewport);
  assert.equal(result.mode, "compact");
  assert.equal(specialtyRectsOverlap(result.rect, cluster, 12), false);
});

test("crowded map falls back to readable small event marker", () => {
  const obstacle = { left: 340, top: 185, right: 460, bottom: 250 };
  const result = chooseSpecialtyMarqueeMode(center, [obstacle], viewport);
  assert.equal(result.mode, "marker");
});

test("all artwork is hidden rather than covering a pin", () => {
  const obstacle = { left: 360, top: 150, right: 450, bottom: 340 };
  const result = chooseSpecialtyMarqueeMode(center, [obstacle], viewport);
  assert.equal(result.mode, "hidden");
  assert.equal(result.rect, null);
});

test("marquee avoids screen edges", () => {
  assert.equal(chooseSpecialtyMarqueeMode({ x: 20, y: 45 }, [], viewport).mode, "hidden");
});

test("extra space is required when expanding so resize does not flicker", () => {
  const sign = getSpecialtyScreenBounds(center, "full");
  const obstacle = { left: sign.right + 15, top: sign.top, right: sign.right + 50, bottom: sign.bottom };
  assert.equal(chooseSpecialtyMarqueeMode(center, [obstacle], viewport, "full").mode, "full");
  assert.equal(chooseSpecialtyMarqueeMode(center, [obstacle], viewport, "compact").mode, "compact");
});
