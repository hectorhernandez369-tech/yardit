import test from "node:test";
import assert from "node:assert/strict";
import { chooseYarditsOnLayout, getYarditsOnBounds } from "../yarditsOnMarqueeLayout.js";

const point = { x: 400, y: 340 };
const viewport = { width: 800, height: 650 };

test("full marquee stays visible in clear space", () => {
  const result = chooseYarditsOnLayout(point, [], viewport);
  assert.equal(result.key, "full-above");
  assert.ok(result.rect.bottom < point.y - 17);
});

test("marquee gets compact instead of becoming a generic event pin", () => {
  const obstacles = [{ left: 320, right: 480, top: 120, bottom: 175 }];
  assert.equal(chooseYarditsOnLayout(point, obstacles, viewport).key, "compact-above");
});

test("marquee can move to the right without moving its event anchor", () => {
  const obstacles = [{ left: 320, right: 480, top: 120, bottom: 278 }];
  const result = chooseYarditsOnLayout(point, obstacles, viewport);
  assert.equal(result.key, "compact-right");
  assert.ok(result.rect.left > point.x);
});

test("marquee can move to left or bottom if right side is crowded", () => {
  const obstacles = [
    { left: 320, right: 480, top: 120, bottom: 278 },
    { left: 420, right: 800, top: 250, bottom: 450 },
  ];
  const result = chooseYarditsOnLayout(point, obstacles, viewport);
  assert.ok(["compact-left", "compact-below"].includes(result.key));
});

test("fully occupied viewport hides only the decoration", () => {
  const obstacles = [{ left: 0, right: 800, top: 0, bottom: 650 }];
  assert.equal(chooseYarditsOnLayout(point, obstacles, viewport).mode, "hidden");
});

test("all chosen rectangles use the same anchored map point", () => {
  const layout = chooseYarditsOnLayout(point, [], viewport);
  assert.deepEqual(layout.rect, getYarditsOnBounds(point, layout));
});
