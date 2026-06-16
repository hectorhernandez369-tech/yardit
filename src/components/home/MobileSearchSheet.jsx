import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function MobileSearchSheet({ open, onOpenChange, searchQuery, onSearchChange }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    document.activeElement?.blur?.();
    onOpenChange(false);
    window.scrollTo(0, 0);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="z-[1400] sm:hidden rounded-t-3xl border-0 bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <SheetHeader className="text-left">
          <SheetTitle>Search Yardit</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              autoFocus
              placeholder="Address, city, ZIP, title..."
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-12 rounded-2xl border-slate-200 pl-10 pr-10 text-base"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 p-1 text-slate-500"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="submit" className="h-12 w-full rounded-2xl bg-[#006168] text-white hover:bg-[#004d52]">
            Show Results
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}