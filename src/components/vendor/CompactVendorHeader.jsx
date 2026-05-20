import { useState } from "react";
import { ChevronDown, Store } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getVendorTierConfig } from "@/lib/vendorTiers";
import { format } from "date-fns";

/**
 * Compact business header with integrated switcher for multi-business users.
 * Replaces separate BusinessSelectorBar + BusinessHero + MobileVendorHeader.
 */
export default function CompactVendorHeader({ accounts, activeAccount, activeCheckIn, activePin, onSwitch }) {
  const tier = getVendorTierConfig(activeAccount?.vendor_tier);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  if (!activeAccount) return null;

  return (
    <div className="bg-white border-b border-[#2C4F4E]/10 min-w-0">
      {/* Main header row */}
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-5 lg:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3 min-w-0">
          {/* Left: Logo + Business Name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-lg sm:rounded-xl border border-[#2C4F4E]/15 bg-[#F3E6CF] flex items-center justify-center">
              {activeAccount.business_logo ? (
                <img src={activeAccount.business_logo} alt={activeAccount.business_name} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-5 w-5 sm:h-6 sm:w-6 text-[#5DADA5]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <h1 className="truncate text-base sm:text-lg font-bold text-[#2C4F4E] leading-tight">
                  {activeAccount.business_name}
                </h1>
                <Badge className="shrink-0 rounded-full bg-[#F4A849] px-2 py-0 text-[10px] sm:text-xs text-[#2C4F4E] font-semibold">
                  {tier.label}
                </Badge>
              </div>
              <p className="truncate text-[11px] sm:text-xs text-slate-600 mt-0.5">
                {activeAccount.business_category || "Vendor"}
              </p>
            </div>
          </div>

          {/* Right: Business Switcher (only if multiple accounts) */}
          {accounts.length > 1 && (
            <DropdownMenu open={switcherOpen} onOpenChange={setSwitcherOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 sm:h-9 px-2 sm:px-3 border-[#2C4F4E]/20 hover:bg-[#F3E6CF] gap-1.5"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-[#2C4F4E]" />
                  <span className="hidden sm:inline text-xs font-semibold text-[#2C4F4E]">Switch</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {accounts.map((acc) => (
                  <DropdownMenuItem
                    key={acc.id}
                    onClick={() => {
                      onSwitch(acc);
                      setSwitcherOpen(false);
                    }}
                    className={`gap-2 ${acc.id === activeAccount?.id ? "bg-[#5DADA5]/10 text-[#2C4F4E] font-semibold" : ""}`}
                  >
                    {acc.business_logo ? (
                      <img src={acc.business_logo} alt="" className="w-5 h-5 rounded object-cover" />
                    ) : (
                      <Store className="w-4 h-4 text-[#5DADA5]" />
                    )}
                    <span className="truncate">{acc.business_name}</span>
                    {acc.id === activeAccount?.id && (
                      <span className="ml-auto text-[10px] text-[#5DADA5] font-medium">Active</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Status bar (mobile + desktop) */}
        <div className="mt-2 sm:mt-3 border-t border-[#2C4F4E]/10 pt-2 sm:pt-3">
          {activeCheckIn ? (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[#2C4F4E]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500 animate-pulse" />
              <span className="font-bold">Live Now</span>
              <span className="text-slate-400">·</span>
              <span className="truncate">{activePin?.pin_name || "Vendor Pin"}</span>
              <span className="hidden sm:inline text-slate-500">· Ends {format(new Date(activeCheckIn.checkin_end_time), "h:mm a")}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-400" />
              <span className="font-medium">Offline</span>
              <span className="text-slate-400">· No active pin</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}