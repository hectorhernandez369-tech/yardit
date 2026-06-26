import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle2, Clock, DollarSign, Gift, Search, Tag, TrendingUp, Users } from "lucide-react";

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800 border-green-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  redeemed: "bg-green-100 text-green-800 border-green-300",
  pending: "bg-blue-100 text-blue-800 border-blue-300",
  on_hold: "bg-amber-100 text-amber-800 border-amber-300",
  expired: "bg-slate-100 text-slate-600 border-slate-300",
  revoked: "bg-red-100 text-red-800 border-red-300",
  voided: "bg-red-100 text-red-800 border-red-300",
  removed: "bg-slate-100 text-slate-600 border-slate-300",
  canceled: "bg-red-100 text-red-800 border-red-300",
  forfeited: "bg-red-100 text-red-800 border-red-300",
};

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "MMM d, yyyy h:mm a");
}

function money(value) {
  return `$${Math.round(value || 0).toLocaleString()}`;
}

export default function VoucherAnalyticsTab() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: vouchers = [] } = useQuery({
    queryKey: ["allUserVouchers"],
    queryFn: () => base44.entities.UserVoucher.list("-created_at", 500),
    initialData: [],
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ["voucherCampaigns"],
    queryFn: () => base44.entities.VoucherCampaign.list("-created_at", 500),
    initialData: [],
  });
  const { data: users = [] } = useQuery({
    queryKey: ["rewardAnalyticsUsers"],
    queryFn: async () => {
      try { return await base44.entities.User.list(); } catch { return []; }
    },
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

  const rows = useMemo(() => {
    const campaignMap = new Map(campaigns.map(c => [c.id, c]));
    const userMap = new Map(users.map(u => [u.id, u]));
    const residentialCodeMap = new Map(residentialPromoCodes.map(p => [p.id, p]));
    const vendorCodeMap = new Map(vendorPromoCodes.map(p => [p.id, p]));

    const voucherRows = vouchers.map(v => {
      const user = userMap.get(v.user_id);
      const campaign = campaignMap.get(v.campaign_id);
      return {
        id: `voucher-${v.id}`,
        type: "voucher",
        typeLabel: "QR Voucher",
        code: v.promo_code || v.qr_token || "—",
        title: v.reward_title || campaign?.campaign_name || "Voucher reward",
        account: user?.full_name || user?.email || v.user_id || "Unknown account",
        accountDetail: user?.email || v.user_id || "",
        status: v.status || "unknown",
        usedAt: v.redeemed_at || "",
        issuedAt: v.created_at || "",
        amount: "—",
        details: v.business_name || campaign?.campaign_name || "—",
        used: v.status === "redeemed" || !!v.redeemed_at,
        sortDate: v.redeemed_at || v.created_at || v.updated_date,
      };
    });

    const residentialRows = residentialPromoRedemptions.map(r => {
      const promo = residentialCodeMap.get(r.promo_code_id);
      return {
        id: `residential-${r.id}`,
        type: "residential",
        typeLabel: "Residential Promo",
        code: r.code || promo?.code || "—",
        title: promo?.title || "Residential promo code",
        account: r.user_email || r.user_id || "Unknown account",
        accountDetail: r.user_id || "",
        status: r.status || "completed",
        usedAt: r.redeemed_at || r.created_date || "",
        issuedAt: promo?.created_at || promo?.created_date || "",
        amount: money(r.discount_amount),
        details: `${r.discount_percent_applied || 0}% off${r.listing_id ? ` · Listing ${r.listing_id}` : ""}`,
        used: r.status !== "voided",
        sortDate: r.redeemed_at || r.created_date,
      };
    });

    const vendorRows = vendorPromoRedemptions.map(r => {
      const promo = vendorCodeMap.get(r.promo_code_id);
      return {
        id: `vendor-${r.id}`,
        type: "vendor",
        typeLabel: "Vendor Promo",
        code: r.promo_code || promo?.code || "—",
        title: promo?.promo_name || "Vendor promo code",
        account: r.vendor_business_name || r.user_email || r.user_id || "Unknown account",
        accountDetail: r.user_email || r.vendor_account_id || "",
        status: r.redemption_status || "active",
        usedAt: r.redeemed_at || r.created_date || "",
        issuedAt: promo?.created_at || promo?.created_date || "",
        amount: money(r.discount_applied_dollars),
        details: `${r.tier_selected || "Vendor tier"}${r.discount_value ? ` · ${r.discount_value}${r.discount_type === "percentage" ? "%" : ""}` : ""}`,
        used: true,
        sortDate: r.redeemed_at || r.created_date,
      };
    });

    return [...voucherRows, ...residentialRows, ...vendorRows]
      .sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0));
  }, [campaigns, users, residentialPromoCodes, vendorPromoCodes, vouchers, residentialPromoRedemptions, vendorPromoRedemptions]);

  const filteredRows = rows.filter(row => {
    if (typeFilter !== "all" && row.type !== typeFilter) return false;
    if (statusFilter === "used" && !row.used) return false;
    if (statusFilter === "not_used" && row.used) return false;
    if (!["all", "used", "not_used"].includes(statusFilter) && row.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [row.code, row.title, row.account, row.accountDetail, row.status, row.typeLabel, row.details]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(q));
  });

  const totalPromoCodes = residentialPromoCodes.length + vendorPromoCodes.length;
  const promoUses = residentialPromoRedemptions.filter(r => r.status !== "voided").length + vendorPromoRedemptions.length;
  const voucherRedeemed = vouchers.filter(v => v.status === "redeemed" || v.redeemed_at).length;
  const totalDiscount = residentialPromoRedemptions.reduce((sum, r) => sum + (r.status === "voided" ? 0 : r.discount_amount || 0), 0)
    + vendorPromoRedemptions.reduce((sum, r) => sum + (r.discount_applied_dollars || 0), 0);

  const summaryCards = [
    { label: "Voucher Redemptions", value: voucherRedeemed, IconComp: Gift, color: "#5DADA5" },
    { label: "Promo Codes", value: totalPromoCodes, IconComp: Tag, color: "#F4A849" },
    { label: "Promo Uses", value: promoUses, IconComp: CheckCircle2, color: "#16A34A" },
    { label: "Discount Given", value: money(totalDiscount), IconComp: DollarSign, color: "#6366F1" },
  ];

  const typeOptions = [
    { label: "All", value: "all" },
    { label: "QR Vouchers", value: "voucher" },
    { label: "Residential Promos", value: "residential" },
    { label: "Vendor Promos", value: "vendor" },
  ];
  const statusOptions = [
    { label: "All", value: "all" },
    { label: "Used", value: "used" },
    { label: "Not Used", value: "not_used" },
    { label: "Active", value: "active" },
    { label: "Pending", value: "pending" },
    { label: "Redeemed", value: "redeemed" },
    { label: "Voided", value: "voided" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[#2C4F4E] flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#F4A849]" />Reward Analytics
        </h2>
        <p className="text-sm text-slate-500">Filtered voucher and promo code redemption activity with account and usage timing.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map(({ label, value, IconComp, color }) => (
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
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div>
              <h3 className="font-semibold text-[#2C4F4E] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#5DADA5]" />Redemption Activity
              </h3>
              <p className="text-xs text-slate-500">Showing {filteredRows.length} of {rows.length} records.</p>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search code, account, status..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {typeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setTypeFilter(option.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${typeFilter === option.value ? "bg-[#2C4F4E] text-white border-[#2C4F4E]" : "bg-white border-slate-300 text-slate-600"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${statusFilter === option.value ? "bg-[#5DADA5] text-white border-[#2C4F4E]" : "bg-white border-slate-300 text-slate-600"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Type", "Code", "Reward / Promo", "Account Used", "Used When", "Status", "Value", "Details"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs text-slate-600 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{row.typeLabel}</td>
                    <td className="px-3 py-2 font-mono font-bold text-[#2C4F4E] text-xs whitespace-nowrap">{row.code}</td>
                    <td className="px-3 py-2 text-xs max-w-[160px] truncate">{row.title}</td>
                    <td className="px-3 py-2 text-xs max-w-[180px]">
                      <p className="font-medium text-slate-700 truncate">{row.account}</p>
                      {row.accountDetail && <p className="text-slate-400 truncate">{row.accountDetail}</p>}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{row.used ? formatDateTime(row.usedAt) : "Not used yet"}</td>
                    <td className="px-3 py-2"><Badge className={`text-xs ${STATUS_COLORS[row.status] || "bg-slate-100 text-slate-600 border-slate-300"}`}>{row.status}</Badge></td>
                    <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{row.amount}</td>
                    <td className="px-3 py-2 text-xs text-slate-500 max-w-[180px] truncate">{row.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {filteredRows.map(row => (
              <Card key={row.id} className="border border-slate-200">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-500">{row.typeLabel}</p>
                      <p className="font-mono font-bold text-[#2C4F4E] text-sm">{row.code}</p>
                    </div>
                    <Badge className={`text-xs ${STATUS_COLORS[row.status] || "bg-slate-100 text-slate-600 border-slate-300"}`}>{row.status}</Badge>
                  </div>
                  <p className="text-sm font-medium text-slate-800">{row.title}</p>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p><span className="font-semibold text-slate-700">Account:</span> {row.account}</p>
                    {row.accountDetail && <p className="truncate">{row.accountDetail}</p>}
                    <p><span className="font-semibold text-slate-700">Used:</span> {row.used ? formatDateTime(row.usedAt) : "Not used yet"}</p>
                    <p><span className="font-semibold text-slate-700">Value:</span> {row.amount}</p>
                    <p>{row.details}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRows.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No redemption records match these filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}