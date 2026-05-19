import { useState } from "react";
import { ChevronDown, Store } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

/**
 * Shows a business switcher when the user has multiple vendor accounts.
 */
export default function BusinessSelectorBar({ accounts, activeAccount, onSelect }) {
  if (!accounts || accounts.length <= 1) return null;

  return (
    <div className="bg-[#2C4F4E] text-white px-4 py-2 flex items-center gap-2 text-sm">
      <Store className="w-4 h-4 shrink-0 opacity-70" />
      <span className="opacity-70 text-xs mr-1">Viewing:</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-white hover:bg-white/10 font-semibold gap-1"
          >
            {activeAccount?.business_name || "Select Business"}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          {accounts.map((acc) => (
            <DropdownMenuItem
              key={acc.id}
              onClick={() => onSelect(acc)}
              className={`gap-2 ${acc.id === activeAccount?.id ? "bg-[#5DADA5]/10 text-[#2C4F4E] font-semibold" : ""}`}
            >
              {acc.business_logo ? (
                <img src={acc.business_logo} alt="" className="w-5 h-5 rounded object-cover" />
              ) : (
                <Store className="w-4 h-4 text-[#5DADA5]" />
              )}
              <span className="truncate">{acc.business_name}</span>
              {acc.id === activeAccount?.id && <span className="ml-auto text-[10px] text-[#5DADA5]">Active</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}