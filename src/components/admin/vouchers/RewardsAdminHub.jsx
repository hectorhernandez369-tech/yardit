import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Gift, BarChart2, CheckCircle2, ShieldAlert, Tag } from "lucide-react";
import ResidentialPromoCodesTab from "../residential-promos/ResidentialPromoCodesTab";
import VoucherCampaignsTab from "./VoucherCampaignsTab";
import VoucherAnalyticsTab from "./VoucherAnalyticsTab";
import RedemptionStatsTab from "./RedemptionStatsTab";
import FraudHoldsTab from "./FraudHoldsTab";

export default function RewardsAdminHub({ adminUser }) {
  const [tab, setTab] = useState("promo_codes");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2C4F4E] to-[#5DADA5] rounded-xl p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-[#F4A849] rounded-full p-2">
            <Gift className="w-5 h-5 text-[#2C4F4E]" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Promotions & Rewards</h1>
            <p className="text-sm text-white/70">Promo codes · QR vouchers · Analytics · Fraud</p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto w-full p-1 bg-slate-100">
          <TabsTrigger value="promo_codes" className="flex items-center gap-1.5 text-xs whitespace-nowrap">
            <Tag className="w-3.5 h-3.5" />Promo Codes
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-1.5 text-xs whitespace-nowrap">
            <Gift className="w-3.5 h-3.5" />QR Voucher Campaigns
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs whitespace-nowrap">
            <BarChart2 className="w-3.5 h-3.5" />Reward Analytics
          </TabsTrigger>
          <TabsTrigger value="redemptions" className="flex items-center gap-1.5 text-xs whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5" />Redemption Statistics
          </TabsTrigger>
          <TabsTrigger value="fraud" className="flex items-center gap-1.5 text-xs whitespace-nowrap">
            <ShieldAlert className="w-3.5 h-3.5" />Fraud Holds
          </TabsTrigger>
        </TabsList>

        <TabsContent value="promo_codes" className="mt-4">
          <ResidentialPromoCodesTab adminUser={adminUser} />
        </TabsContent>
        <TabsContent value="campaigns" className="mt-4">
          <VoucherCampaignsTab adminUser={adminUser} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <VoucherAnalyticsTab />
        </TabsContent>
        <TabsContent value="redemptions" className="mt-4">
          <RedemptionStatsTab adminUser={adminUser} />
        </TabsContent>
        <TabsContent value="fraud" className="mt-4">
          <FraudHoldsTab adminUser={adminUser} />
        </TabsContent>
      </Tabs>
    </div>
  );
}