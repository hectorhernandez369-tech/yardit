// Shared, deliberately limited marquee styling. Never interpolate arbitrary CSS or HTML.
export const SPECIALTY_COLORS = {
  burgundy: { background: "#42172d", border: "#f5cf79" },
  navy: { background: "#172747", border: "#f5cf79" },
  teal: { background: "#164b4a", border: "#f5cf79" },
  purple: { background: "#382052", border: "#f5cf79" },
};
export const SPECIALTY_FONTS = {
  hollywood: 'Georgia, serif',
  bold: 'Arial, sans-serif',
  classic: 'Trebuchet MS, sans-serif',
};
export function specialtyStyle({ color = "burgundy", font = "hollywood", headline = "" } = {}) {
  return {
    color: Object.hasOwn(SPECIALTY_COLORS, color) ? color : "burgundy",
    font: Object.hasOwn(SPECIALTY_FONTS, font) ? font : "hollywood",
    headline: String(headline || "").trim().slice(0, 32),
  };
}
export function escapeSpecialtyText(value) {
  return String(value || "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
