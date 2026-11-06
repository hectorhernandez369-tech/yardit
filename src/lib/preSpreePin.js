// Same footprint and anchors as the existing Featured pin (25 × 33px).
export function buildPreSpreePinSvg(size = 25) {
  const height = Math.round(size * 1.33);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 25 33"><path d="M12.5 1.5C6.4 1.5 2 5.6 2 11.2c0 7 10.5 19.8 10.5 19.8S23 18.2 23 11.2C23 5.6 18.6 1.5 12.5 1.5Z" fill="#111827" stroke="#F4A849" stroke-width="2"/><path d="M7 9h11l1 11H6L7 9Z" fill="#F4A849"/><path d="M10 9V7a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="#F4A849" stroke-width="1.5"/><text x="12.5" y="17.4" text-anchor="middle" font-family="Arial,sans-serif" font-size="7.7" font-weight="900" fill="#111827">PS</text></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
