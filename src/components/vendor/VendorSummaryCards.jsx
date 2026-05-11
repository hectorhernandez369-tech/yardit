import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle2 } from "lucide-react";
import { getVendorTierConfig } from "@/lib/vendorTiers";

export default function VendorSummaryCards({ account }) {
  const tier = getVendorTierConfig(account?.vendor_tier);

  return (
    <Card className="overflow-hidden border-2 border-[#2C4F4E]/20 bg-white shadow-sm">
      <div className="h-28 bg-gradient-to-r from-[#5DADA5] via-[#6FC3BA] to-[#F4A849]" />
      <CardContent className="p-5 sm:p-6 -mt-14 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="h-28 w-28 rounded-3xl border-4 border-white bg-[#E7D7B8] shadow-md flex items-center justify-center overflow-hidden">
          {account?.business_logo ? (
            <img src={account.business_logo} alt={account.business_name} className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-10 w-10 text-[#2C4F4E]/50" />
          )}
        </div>
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-3xl font-bold text-[#2C4F4E]">{account?.vendor_display_name || account?.business_name || "Vendor Business"}</h2>
            <Badge className="bg-[#F4A849] text-[#2C4F4E] border border-[#2C4F4E]/20">{tier.label}</Badge>
            {account?.is_verified_vendor && <Badge className="bg-blue-100 text-blue-800 border border-blue-200"><CheckCircle2 className="h-3 w-3" /> Verified Vendor</Badge>}
          </div>
          <p className="text-sm font-semibold text-[#5DADA5]">{account?.business_category || "Vendor"}</p>
          <p className="max-w-3xl text-sm text-slate-600">{account?.description || "Manage your public Yardit vendor presence, check-ins, photos, and customer updates."}</p>
        </div>
      </CardContent>
    </Card>
  );
}