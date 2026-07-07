import React from "react";

export default function LeagueDashboardHeader({ account }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest text-white/70">League / Team Dashboard</p>
        <h1 className="truncate text-2xl font-black">{account?.business_name || "Organizer Account"}</h1>
        <p className="truncate text-sm text-white/75">{account?.business_category || "League or team organization"}</p>
      </div>
    </div>
  );
}