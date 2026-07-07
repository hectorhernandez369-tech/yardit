import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Store, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrganizerAccountCreateMenu, OrganizerAccountMenuItems, getOrganizerAccountName, getOrganizerTypeLabel, useOrganizerAccountSelect } from "@/components/organizer/OrganizerAccountSwitcher";

export default function MobileVendorHeader({ account, activeCheckIn, activePin, accounts = [], onSelectBusiness, defaultAccountId, dashboardType = "vendor_event", currentTab }) {
  const hasMultiple = accounts.length > 0;
  const handleSelectAccount = useOrganizerAccountSelect({ dashboardType, currentTab, onSelectSameDashboard: onSelectBusiness });

  const handlePreview = () => {
    document.getElementById("vendor-public-preview-button")?.click();
  };

  return (
    <div className="sm:hidden bg-white text-[#2C4F4E]">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#2C4F4E]/15 bg-[#F3E6CF] flex items-center justify-center">
          {account?.business_logo ? (
            <img src={account.business_logo} alt={account.business_name} className="h-full w-full object-cover" />
          ) : (
            <Store className="h-5 w-5 text-[#5DADA5]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {hasMultiple ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 min-w-0 max-w-full text-left">
                  <span className="truncate text-base font-black leading-tight text-[#2C4F4E]">{getOrganizerAccountName(account)}</span>
                  <Badge className="shrink-0 rounded-full bg-[#F4A849] px-2 py-0 text-[10px] text-[#2C4F4E]">{getOrganizerTypeLabel(account)}</Badge>
                  <ChevronDown className="w-3 h-3 shrink-0 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <OrganizerAccountMenuItems accounts={accounts} activeAccount={account} defaultAccountId={defaultAccountId} onSelect={handleSelectAccount} />
                <OrganizerAccountCreateMenu />
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="truncate text-base font-black leading-tight">{getOrganizerAccountName(account)}</h1>
              <Badge className="shrink-0 rounded-full bg-[#F4A849] px-2 py-0 text-[10px] text-[#2C4F4E]">{getOrganizerTypeLabel(account)}</Badge>
            </div>
          )}
          <p className="truncate text-[11px] text-slate-600">{account?.business_category || getOrganizerTypeLabel(account)}</p>
        </div>
        <Button onClick={handlePreview} size="sm" className="h-8 shrink-0 rounded-full bg-[#5DADA5] px-3 text-xs text-white hover:bg-[#4A9B93]">
          Preview
        </Button>
      </div>

      <div className="border-y border-[#2C4F4E]/10 px-3 py-2 text-xs">
        {activeCheckIn ? (
          <div className="flex items-center gap-1.5 min-w-0 text-green-800">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
            <span className="shrink-0 font-bold">Live Now</span>
            <span className="text-slate-400">·</span>
            <span className="truncate">{activePin?.pin_name || "Vendor Pin"}</span>
            <span className="shrink-0 text-slate-500">· Ends {format(new Date(activeCheckIn.checkin_end_time), "h:mm a")}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            <span className="font-semibold">Offline</span>
            <span>· No active pin right now</span>
          </div>
        )}
      </div>
    </div>
  );
}