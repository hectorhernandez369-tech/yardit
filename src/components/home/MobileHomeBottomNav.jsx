import React from "react";
import { MapPin, List, Plus, Store, User } from "lucide-react";

function NavButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition ${
        active ? "text-[#006168]" : "text-slate-500"
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? "stroke-[2.8]" : ""}`} />
      <span className="truncate leading-none">{label}</span>
    </button>
  );
}

export default function MobileHomeBottomNav({ view, onViewChange, onCreate, onVendor, onProfile }) {
  return (
    <nav className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[1200] sm:hidden rounded-3xl border border-slate-200/80 bg-white/95 px-2 py-2 shadow-[0_10px_35px_rgba(15,23,42,0.22)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
        <NavButton active={view === "map"} icon={MapPin} label="Map" onClick={() => onViewChange("map")} />
        <NavButton active={view === "list"} icon={List} label="Listings" onClick={() => onViewChange("list")} />
        <button
          type="button"
          onClick={onCreate}
          className="-mt-6 flex flex-col items-center justify-center gap-1 text-[#2C4F4E]"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-[#F4A849] shadow-xl active:scale-95 transition">
            <Plus className="h-7 w-7 stroke-[3]" />
          </span>
          <span className="text-[10px] font-bold leading-none">Create</span>
        </button>
        <NavButton active={false} icon={Store} label="Vendor" onClick={onVendor} />
        <NavButton active={false} icon={User} label="Profile" onClick={onProfile} />
      </div>
    </nav>
  );
}