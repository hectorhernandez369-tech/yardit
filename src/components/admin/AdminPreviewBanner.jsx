import React from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminPreviewBanner({ account, onExit }) {
  const organizationName = account?.business_name || account?.vendor_display_name || "this organization";

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">ADMIN MODE</p>
            <p className="mt-1 text-sm font-semibold">
              You are managing {organizationName} as a Yardit administrator.
            </p>
            <p className="text-sm text-amber-900/85">
              Changes made here affect the live organization account.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onExit}
          className="shrink-0 border-amber-500 bg-white text-amber-900 hover:bg-amber-100"
        >
          Exit Admin Mode
        </Button>
      </div>
    </div>
  );
}