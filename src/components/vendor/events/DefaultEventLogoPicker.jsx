import React from "react";

const DEFAULT_EVENT_LOGOS = [
  { label: "Market", icon: "🎪", bg: "#5DADA5", accent: "#F4A849" },
  { label: "Sports", icon: "🏆", bg: "#2C4F4E", accent: "#F4A849" },
  { label: "Food", icon: "🍔", bg: "#F4A849", accent: "#2C4F4E" },
  { label: "Music", icon: "🎵", bg: "#7C3AED", accent: "#FDE68A" },
  { label: "Community", icon: "⭐", bg: "#0F766E", accent: "#A7F3D0" },
  { label: "Holiday", icon: "✨", bg: "#BE123C", accent: "#FDE68A" },
];

const makeDefaultLogoUrl = (logo) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${logo.bg}"/><circle cx="256" cy="256" r="156" fill="${logo.accent}" opacity="0.18"/><circle cx="256" cy="256" r="118" fill="white" opacity="0.16"/><text x="256" y="292" text-anchor="middle" font-size="142" font-family="Arial, sans-serif">${logo.icon}</text><text x="256" y="410" text-anchor="middle" font-size="34" font-weight="800" fill="white" font-family="Arial, sans-serif">YARDIT</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export default function DefaultEventLogoPicker({ value, onChange }) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Default Logos</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {DEFAULT_EVENT_LOGOS.map((logo) => {
          const logoUrl = makeDefaultLogoUrl(logo);
          const selected = value === logoUrl;
          return (
            <button
              key={logo.label}
              type="button"
              onClick={() => onChange(logoUrl)}
              className={`rounded-xl border bg-white p-2 text-center transition hover:border-[#5DADA5] ${selected ? "border-[#2C4F4E] ring-2 ring-[#F4A849]" : "border-slate-200"}`}
            >
              <img src={logoUrl} alt={`${logo.label} default logo`} className="mx-auto h-12 w-12 rounded-lg object-contain" />
              <span className="mt-1 block text-[11px] font-semibold text-slate-600">{logo.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}