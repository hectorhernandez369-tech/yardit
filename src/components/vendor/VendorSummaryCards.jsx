import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getVendorTierConfig, getVendorUserLimit, getVendorPinLimit } from "@/lib/vendorTiers";

export default function VendorSummaryCards({ account, pins, users, liveCheckIns }) {
  const tier = getVendorTierConfig(account?.vendor_tier);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-[#2C4F4E]/20">
        <CardContent className="p-4">
          <p className="text-sm text-slate-500">Business</p>
          <p className="text-xl font-bold text-[#2C4F4E] truncate">{account?.business_name || "Vendor"}</p>
          <Badge className="mt-2 bg-[#F4A849] text-[#2C4F4E]">{tier.label}</Badge>
        </CardContent>
      </Card>
      <Card className="border-[#2C4F4E]/20"><CardContent className="p-4"><p className="text-sm text-slate-500">Truck Pins</p><p className="text-2xl font-bold">{pins.length}/{getVendorPinLimit(account)}</p></CardContent></Card>
      <Card className="border-[#2C4F4E]/20"><CardContent className="p-4"><p className="text-sm text-slate-500">Authorized Users</p><p className="text-2xl font-bold">{users.length}/{getVendorUserLimit(account)}</p></CardContent></Card>
      <Card className="border-[#2C4F4E]/20"><CardContent className="p-4"><p className="text-sm text-slate-500">Live Check-ins</p><p className="text-2xl font-bold">{liveCheckIns.length}</p></CardContent></Card>
    </div>
  );
}