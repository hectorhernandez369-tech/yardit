import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Gift, CheckCircle2, Clock, ShieldAlert, XCircle, TrendingUp, Tag, DollarSign, Percent } from "lucide-react";

const TEAL = "#5DADA5";
const GOLD = "#F4A849";
const RED = "#EF4444";
const AMBER = "#F59E0B";
const SLATE = "#94A3B8";

export default function VoucherAnalyticsTab() {
  const { data: vouchers = [] } = useQuery({
    queryKey: ["allUserVouchers"],
    queryFn: () => base44.entities.UserVoucher.list("-created_at", 500),
    initialData: [],
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ["voucherCampaigns"],
    queryFn: () => base44.entities.VoucherCampaign.list("-created_at"),
    initialData: [],
  });
  const { data: redemptions = [] } = useQuery({
    queryKey: ["voucherRedemptions"],
    queryFn: () => base44.entities.VoucherRedemption.list("-redeemed_at", 500),
    initialData: [],
  });
  const { data: residentialPromoCodes = [] } = useQuery({
    queryKey: ["residentialPromoCodesAnalytics"],
    queryFn: () => base44.entities.ResidentialPromoCode.list("-created_at", 500),
    initialData: [],
  });
  const { data: residentialPromoRedemptions = [] } = useQuery({
    queryKey: ["residentialPromoRedemptionsAnalytics"],
    queryFn: () => base44.entities.ResidentialPromoRedemption.list("-redeemed_at", 500),
    initialData: [],
  });
  const { data: vendorPromoCodes = [] } = useQuery({
    queryKey: ["vendorPromoCodesAnalytics"],
    queryFn: () => base44.entities.VendorPromoCode.list("-created_at", 500),
    initialData: [],
  });
  const { data: vendorPromoRedemptions = [] } = useQuery({
    queryKey: ["vendorPromoRedemptionsAnalytics"],
    queryFn: () => base44.entities.VendorPromoRedemption.list("-redeemed_at", 500),
    initialData: [],
  });

  const total = vouchers.length;
  const byStatus = (s) => vouchers.filter(v => v.status === s).length;
  const redeemed = byStatus("redeemed");
  const active = byStatus("active");
  const pending = byStatus("pending");
  const onHold = byStatus("on_hold");
  const revoked = byStatus("revoked");
  const expired = byStatus("expired");
  const pct = total > 0 ? Math.round((redeemed / total) * 100) : 0;

  const campaignStats = campaigns.map(c => ({
    name: c.campaign_name.length > 18 ? c.campaign_name.substring(0, 18) + "…" : c.campaign_name,
    issued: c.issued_count || 0,
    redeemed: vouchers.filter(v => v.campaign_id === c.id && v.status === "redeemed").length,
  })).filter(c => c.issued > 0).slice(0, 8);

  const totalPromoCodes = residentialPromoCodes.length + vendorPromoCodes.length;
  const activePromoCodes = residentialPromoCodes.filter(p => p.status === "active").length + vendorPromoCodes.filter(p => p.active).length;
  const completedResidentialPromos = residentialPromoRedemptions.filter(r => r.status !== "voided");
  const promoRedemptionTotal = completedResidentialPromos.length + vendorPromoRedemptions.length;
  const promoDiscountTotal = Math.round([
    ...completedResidentialPromos.map(r => r.discount_amount || 0),
    ...vendorPromoRedemptions.map(r => r.discount_applied_dollars || 0),
  ].reduce((sum, value) => sum + value, 0));
  const promoUsesPerCode = totalPromoCodes > 0 ? (promoRedemptionTotal / totalPromoCodes).toFixed(1) : "0.0";
  const promoUseProgress = Math.min(Number(promoUsesPerCode) * 20, 100);

  const actualPromoUses = new Map();
  completedResidentialPromos.forEach(r => {
    const key = r.code || "Unknown";
    actualPromoUses.set(key, (actualPromoUses.get(key) || 0) + 1);
  });
  vendorPromoRedemptions.forEach(r => {
    const key = r.promo_code || "Unknown";
    actualPromoUses.set(key, (actualPromoUses.get(key) || 0) + 1);
  });

  const promoUsageMap = new Map();
  residentialPromoCodes.forEach(p => promoUsageMap.set(p.code, {
    name: p.code,
    uses: Math.max(p.total_used_count || 0, actualPromoUses.get(p.code) || 0),
  }));
  vendorPromoCodes.forEach(p => promoUsageMap.set(p.code, {
    name: p.code,
    uses: Math.max(p.redemptions_used || p.current_redemptions || 0, actualPromoUses.get(p.code) || 0),
  }));
  actualPromoUses.forEach((uses, code) => {
    if (!promoUsageMap.has(code)) promoUsageMap.set(code, { name: code, uses });
  });
  const promoStats = Array.from(promoUsageMap.values()).filter(p => p.uses > 0).sort((a, b) => b.uses - a.uses).slice(0, 8);

  const statCards = [
    { label: "Total Issued", value: total, IconComp: Gift, color: TEAL },
    { label: "Redeemed", value: redeemed, IconComp: CheckCircle2, color: "#16A34A" },
    { label: "Active", value: active, IconComp: TrendingUp, color: GOLD },
    { label: "Pending", value: pending, IconComp: Clock, color: "#6366F1" },
    { label: "On Hold", value: onHold, IconComp: ShieldAlert, color: AMBER },
    { label: "Revoked", value: revoked, IconComp: XCircle, color: RED },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#2C4F4E] flex items-center gap-2"><TrendingUp className="w-5 h-5 text-[#F4A849]" />Reward Analytics</h2>
        <p className="text-sm text-slate-500">Overview of voucher and promo code performance.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(({ label, value, IconComp, color }) => (
          <Card key={label} className="border border-slate-200 shadow-sm">
            <CardContent className="p-3 text-center">
              <IconComp className="w-5 h-5 mx-auto mb-1" style={{ color }} />
              <p className="text-2xl font-bold text-[#2C4F4E]">{value}</p>
              <p className="text-xs text-slate-500 leading-tight">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Redemption Rate */}
      <Card className="border border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-[#2C4F4E]">Overall Redemption Rate</p>
            <span className="text-2xl font-bold text-[#5DADA5]">{pct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div className="h-3 rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${TEAL}, ${GOLD})` }} />
          </div>
          <p className="text-xs text-slate-400 mt-2">{redeemed} of {total} issued vouchers redeemed</p>
        </CardContent>
      </Card>

      {/* Promo Code Statistics */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-[#2C4F4E] flex items-center gap-2"><Tag className="w-4 h-4 text-[#F4A849]" />Promo Code Statistics</h3>
          <p className="text-xs text-slate-500">Residential and vendor promo code usage.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Promo Codes", value: totalPromoCodes, IconComp: Tag, color: TEAL },
            { label: "Active Codes", value: activePromoCodes, IconComp: CheckCircle2, color: "#16A34A" },
            { label: "Total Uses", value: promoRedemptionTotal, IconComp: Percent, color: GOLD },
            { label: "Discount Given", value: `$${promoDiscountTotal}`, IconComp: DollarSign, color: "#6366F1" },
          ].map(({ label, value, IconComp, color }) => (
            <Card key={label} className="border border-slate-200 shadow-sm">
              <CardContent className="p-3 text-center">
                <IconComp className="w-5 h-5 mx-auto mb-1" style={{ color }} />
                <p className="text-2xl font-bold text-[#2C4F4E]">{value}</p>
                <p className="text-xs text-slate-500 leading-tight">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-[#2C4F4E]">Average Uses per Promo Code</p>
              <span className="text-2xl font-bold text-[#5DADA5]">{promoUsesPerCode}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div className="h-3 rounded-full transition-all" style={{ width: `${promoUseProgress}%`, background: `linear-gradient(90deg, ${TEAL}, ${GOLD})` }} />
            </div>
            <p className="text-xs text-slate-400 mt-2">{promoRedemptionTotal} recorded uses across {totalPromoCodes} promo codes</p>
          </CardContent>
        </Card>
        {promoStats.length > 0 && (
          <Card className="border border-slate-200">
            <CardContent className="p-4">
              <p className="font-semibold text-[#2C4F4E] mb-4">Top Promo Codes by Uses</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={promoStats} margin={{ left: -10 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="uses" fill={TEAL} radius={[3,3,0,0]} name="Uses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Campaign Bar Chart */}
      {campaignStats.length > 0 && (
        <Card className="border border-slate-200">
          <CardContent className="p-4">
            <p className="font-semibold text-[#2C4F4E] mb-4">Issued vs Redeemed by Campaign</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={campaignStats} barGap={4} margin={{ left: -10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="issued" fill={TEAL} radius={[3,3,0,0]} name="Issued" />
                <Bar dataKey="redeemed" fill={GOLD} radius={[3,3,0,0]} name="Redeemed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Status breakdown pie-style */}
      <Card className="border border-slate-200">
        <CardContent className="p-4">
          <p className="font-semibold text-[#2C4F4E] mb-4">Voucher Status Breakdown</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[
              { name: "Active", value: active, fill: GOLD },
              { name: "Pending", value: pending, fill: "#6366F1" },
              { name: "Redeemed", value: redeemed, fill: "#16A34A" },
              { name: "On Hold", value: onHold, fill: AMBER },
              { name: "Revoked", value: revoked, fill: RED },
              { name: "Expired", value: expired, fill: SLATE },
            ]} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={65} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" radius={[0,3,3,0]}>
                {[GOLD,"#6366F1","#16A34A",AMBER,RED,SLATE].map((c, i) => <Cell key={i} fill={c} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}