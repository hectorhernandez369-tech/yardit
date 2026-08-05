// Fit a title label inside a shape's pixel bounding box.
// Wraps to multiple lines, shrinks the font, and finally truncates with "…"
// when the shape is too small to hold the full text.

let _canvas = null;
function ctx2d() {
  if (typeof document === "undefined") return null;
  if (!_canvas) _canvas = document.createElement("canvas");
  return _canvas.getContext("2d");
}

const FONT_FAMILY = "Inter, system-ui, -apple-system, sans-serif";

function measure(line, size) {
  const ctx = ctx2d();
  if (!ctx) return line.length * size * 0.62;
  ctx.font = `700 ${size}px ${FONT_FAMILY}`;
  return ctx.measureText(line).width;
}

function wrapWords(words, size, maxW) {
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (measure(test, size) <= maxW || !cur) {
      cur = test;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

const MIN_SIZE = 9;
const MAX_SIZE = 20;
const MAX_LINES = 3;

export function fitLabel(text, maxW, maxH, pad = 6) {
  if (!text || !text.trim()) return null;
  if (maxW <= 0 || maxH <= 0) return null;

  const upper = text.toUpperCase();
  const words = upper.split(/\s+/).filter(Boolean);
  if (!words.length) return null;

  const innerW = Math.max(0, maxW - pad * 2);
  const innerH = Math.max(0, maxH - pad * 2);

  for (let size = MAX_SIZE; size >= MIN_SIZE; size--) {
    const lineHeight = Math.round(size * 1.18);
    const lines = wrapWords(words, size, innerW);
    if (lines.length > MAX_LINES) continue;
    const totalH = lines.length * lineHeight;
    const maxLineW = Math.max(...lines.map((l) => measure(l, size)));
    if (maxLineW <= innerW && totalH <= innerH) {
      return { lines, fontSize: size, lineHeight, truncated: false };
    }
  }

  // Shape is too small: use the minimum size and truncate to a single line.
  const size = MIN_SIZE;
  const lineHeight = Math.round(size * 1.18);
  let line = upper;
  while (line.length > 1 && measure(`${line}…`, size) > innerW) {
    line = line.slice(0, -1);
  }
  return { lines: [`${line}…`], fontSize: size, lineHeight, truncated: true };
}