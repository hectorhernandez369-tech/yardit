import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Store, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { getVendorTierConfig } from "@/lib/vendorTiers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MobileVendorHeader({ account, activeCheckIn, activePin, accounts = [], onSelectBusiness }) {
  const tier = getVendorTierConfig(account?.vendor_tier);
  const hasMultiple = accounts.length > 1;

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
                  <span className="truncate text-base font-black leading-tight text-[#2C4F4E]">{account?.business_name || "Vendor Business"}</span>
                  <Badge className="shrink-0 rounded-full bg-[#F4A849] px-2 py-0 text-[10px] text-[#2C4F4E]">{tier.label}</Badge>
                  <ChevronDown className="w-3 h-3 shrink-0 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                {accounts.map((acc) => (
                  <DropdownMenuItem
                    key={acc.id}
                    onClick={() => onSelectBusiness?.(acc)}
                    className={`gap-2 ${acc.id === account?.id ? "bg-[#5DADA5]/10 text-[#2C4F4E] font-semibold" : ""}`}
                  >
                    {acc.business_logo ? (
                      <img src={acc.business_logo} alt="" className="w-5 h-5 rounded object-cover" />
                    ) : (
                      <Store className="w-4 h-4 text-[#5DADA5]" />
                    )}
                    <span className="truncate">{acc.business_name}</span>
                    {acc.id === account?.id && <span className="ml-auto text-[10px] text-[#5DADA5]">Active</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="truncate text-base font-black leading-tight">{account?.business_name || "Vendor Business"}</h1>
              <Badge className="shrink-0 rounded-full bg-[#F4A849] px-2 py-0 text-[10px] text-[#2C4F4E]">{tier.label}</Badge>
            </div>
          )}
          <p className="truncate text-[11px] text-slate-600">{account?.business_category || "Vendor"}</p>
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