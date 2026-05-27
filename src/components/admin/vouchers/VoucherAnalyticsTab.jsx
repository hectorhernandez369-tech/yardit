import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Gift, CheckCircle2, Clock, ShieldAlert, XCircle, TrendingUp } from "lucide-react";

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
        <p className="text-sm text-slate-500">Overview of voucher performance across all campaigns.</p>
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