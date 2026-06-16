import React from "react";

export default function MobileLayoutModeToggle({ mode, onToggle, disabled }) {
  const isPreview = mode !== "publish";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="rounded-full border border-white/70 bg-white/95 px-3 py-2 text-xs font-bold text-[#006168] shadow-md backdrop-blur-xl disabled:opacity-60"
      title="Switch mobile spacing for Base44 preview or published app"
    >
      {isPreview ? "Preview spacing" : "Publish spacing"}
    </button>
  );
}