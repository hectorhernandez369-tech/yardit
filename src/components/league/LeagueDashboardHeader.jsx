import React from "react";
import { ChevronDown, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function LeagueDashboardHeader({ account, accounts, onSelect }) {
  const hasMultiple = accounts.length > 1;
  return (
    <div className="bg-gradient-to-br from-[#2C4F4E] to-[#3d6b6a] text-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-white/70">League / Team Dashboard</p>
            <h1 className="truncate text-2xl font-black">{account?.business_name || "Organizer Account"}</h1>
            <p className="truncate text-sm text-white/75">{account?.business_category || "League or team organization"}</p>
          </div>
          {hasMultiple && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button className="shrink-0 bg-white/10 text-white hover:bg-white/20">Switch <ChevronDown className="ml-1 h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {accounts.map((item) => <DropdownMenuItem key={item.id} onClick={() => onSelect(item)} className={item.id === account?.id ? "bg-[#5DADA5]/10 font-semibold text-[#2C4F4E]" : ""}><Trophy className="mr-2 h-4 w-4 text-[#F4A849]" />{item.business_name}</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}