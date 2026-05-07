import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { getVendorTierConfig } from "@/lib/vendorTiers";

export default function VendorProfileHeader({ account, onEditClick }) {
  const tier = getVendorTierConfig(account?.vendor_tier);

  return (
    <div className="rounded-3xl border-2 border-[#2C4F4E]/20 bg-white overflow-hidden shadow-sm">
      <div className="h-24 bg-gradient-to-r from-[#5DADA5] via-[#6FC3BA] to-[#F4A849]" />
      <div className="p-5 sm:p-6 -mt-12 flex flex-col sm:flex-row gap-4 sm:items-end sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="h-24 w-24 rounded-2xl border-4 border-white bg-[#E7D7B8] shadow flex items-center justify-center overflow-hidden">
            {account.business_logo ? (
              <img src={account.business_logo} alt={account.business_name} className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-9 w-9 text-[#2C4F4E]/50" />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#2C4F4E]">{account.business_name}</h2>
              <Badge className="bg-[#F4A849] text-[#2C4F4E] border border-[#2C4F4E]/20">{tier.label}</Badge>
            </div>
            <p className="text-sm font-semibold text-[#5DADA5]">{account.business_category || "Vendor"}</p>
            <p className="max-w-2xl text-sm text-slate-600">{account.description || "Add a short description so customers know what makes your business special."}</p>
          </div>
        </div>
        <Button onClick={onEditClick} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white">Edit Profile</Button>
      </div>
    </div>
  );
}