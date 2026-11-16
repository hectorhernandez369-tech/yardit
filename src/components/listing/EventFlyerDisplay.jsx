import React from "react";

export default function EventFlyerDisplay({ flyerUrl, title, format }) {
  if (!flyerUrl) return null;

  return (
    <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Event Flyer</p>
      {format === 'pdf' ? <a className="block rounded-xl border border-slate-200 bg-slate-50 p-4 text-center font-semibold text-teal-800 underline" href={flyerUrl} target="_blank" rel="noopener noreferrer">Open event flyer (PDF)</a> : <div className="overflow-hidden rounded-2xl bg-slate-100">
        <img
          src={flyerUrl}
          alt={`${title || "Event"} flyer`}
          className="max-h-[520px] w-full object-contain"
        />
      </div>}
    </div>
  );
}