import { useState } from "react";
import { ChevronDown, Store, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { getVendorTierConfig } from "@/lib/vendorTiers";

/**
 * Dark, professional vendor dashboard header matching the Events landing page aesthetic.
 * Deep navy background, gold accents, bold typography.
 */
export default function CompactVendorHeader({ accounts, activeAccount, activeCheckIn, activePin, onSwitch }) {
  const tier = getVendorTierConfig(activeAccount?.vendor_tier);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  if (!activeAccount) return null;

  const tierColors = {
    free:              "bg-slate-600/80 text-slate-200 border-slate-500",
    starter:           "bg-[#1A2F4D] text-[#D4A849] border-[#D4A849]/40",
    pro:               "bg-gradient-to-r from-[#D4A849] to-[#C99635] text-[#0A1628] border-transparent",
    growth:            "bg-gradient-to-r from-[#D4A849] to-[#C99635] text-[#0A1628] border-transparent",
    event_organizer:   "bg-gradient-to-r from-[#D4A849] to-[#C99635] text-[#0A1628] border-transparent",
  };
  const tierBadge = tierColors[activeAccount?.vendor_tier] || tierColors.free;

  return (
    <div className="bg-gradient-to-r from-[#0A1628] via-[#0D1A33] to-[#0F1F3D] border-b border-[#1A2F4D] min-w-0 relative overflow-hidden">
      {/* Subtle radial accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_50%,rgba(212,168,73,0.07),transparent_60%)]" />
      </div>

      <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex items-center justify-between gap-4 min-w-0">

          {/* Left: Logo + Identity */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="h-11 w-11 sm:h-13 sm:w-13 shrink-0 overflow-hidden rounded-xl border border-[#D4A849]/25 bg-[#0F1F3D] flex items-center justify-center shadow-lg shadow-black/30">
              {activeAccount.business_logo ? (
                <img src={activeAccount.business_logo} alt={activeAccount.business_name} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-5 w-5 sm:h-6 sm:w-6 text-[#D4A849]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <h1 className="truncate text-base sm:text-lg font-bold text-white leading-tight tracking-tight">
                  {activeAccount.business_name}
                </h1>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide border ${tierBadge}`}>
                  {tier.label}
                </span>
              </div>
              <p className="truncate text-[11px] sm:text-xs text-slate-400 mt-0.5">
                {activeAccount.business_category || "Vendor"} · {activeAccount.vendor_account_number || activeAccount.account_number || ""}
              </p>
            </div>
          </div>

          {/* Right: Live status pill + optional switcher */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live status */}
            {activeCheckIn ? (
              <div className="hidden sm:flex items-center gap-1.5 bg-green-900/40 border border-green-500/30 rounded-full px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                <span className="text-xs font-semibold text-green-300">LIVE</span>
                <span className="text-xs text-green-400/70 hidden md:inline">· {activePin?.pin_name || "Pin"} · ends {format(new Date(activeCheckIn.checkin_end_time), "h:mm a")}</span>
              </div>
            ) : null}

            {/* Business switcher */}
            {accounts.length > 1 && (
              <DropdownMenu open={switcherOpen} onOpenChange={setSwitcherOpen}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 bg-[#1A2F4D] hover:bg-[#243D5F] border border-[#2A3F5D] hover:border-[#D4A849]/40 rounded-lg px-3 py-2 transition-all">
                    <ChevronDown className="w-3.5 h-3.5 text-[#D4A849]" />
                    <span className="hidden sm:inline text-xs font-semibold text-slate-300">Switch</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-[#0D1A33] border-[#1A2F4D] shadow-2xl">
                  <div className="px-3 py-2 border-b border-[#1A2F4D]">
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Your Businesses</p>
                  </div>
                  {accounts.map((acc) => {
                    const isActive = acc.id === activeAccount?.id;
                    return (
                      <DropdownMenuItem
                        key={acc.id}
                        onClick={() => { onSwitch(acc); setSwitcherOpen(false); }}
                        className={`gap-2.5 py-2.5 cursor-pointer ${isActive ? "bg-[#D4A849]/10 text-[#D4A849]" : "text-slate-300 hover:bg-[#1A2F4D]"}`}
                      >
                        {acc.business_logo ? (
                          <img src={acc.business_logo} alt="" className="w-6 h-6 rounded-md object-cover shrink-0" />
                        ) : (
                          <Store className="w-4 h-4 text-[#D4A849] shrink-0" />
                        )}
                        <span className="truncate text-sm font-medium">{acc.business_name}</span>
                        {isActive && <span className="ml-auto text-[10px] text-[#D4A849] font-bold shrink-0">● Active</span>}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Mobile live status strip */}
        {activeCheckIn && (
          <div className="sm:hidden mt-3 flex items-center gap-2 bg-green-900/40 border border-green-500/25 rounded-lg px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span className="text-xs font-semibold text-green-300">LIVE NOW</span>
            <span className="text-xs text-green-400/70 truncate">· {activePin?.pin_name || "Vendor Pin"} · ends {format(new Date(activeCheckIn.checkin_end_time), "h:mm a")}</span>
          </div>
        )}
      </div>
    </div>
  );
}