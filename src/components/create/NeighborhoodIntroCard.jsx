import React from "react";

export default function NeighborhoodIntroCard({ icon: Icon, emoji, title, children }) {
  return (
    <section className="rounded-2xl border border-[#5DADA5]/20 bg-white/90 p-3.5 shadow-sm">
      <div className="mb-2 flex items-center gap-2.5">
        <div className="flex h-10 w-10 max-h-10 max-w-10 shrink-0 items-center justify-center rounded-xl bg-[#5DADA5]/12 text-lg">
          <span aria-hidden="true">{emoji}</span>
        </div>
        <h3 className="text-sm font-bold leading-tight text-[#2C4F4E]">{title}</h3>
      </div>
      <p className="text-[13px] leading-relaxed text-slate-600">{children}</p>
      <Icon className="mt-2 h-4 w-4 text-[#5DADA5]" />
    </section>
  );
}