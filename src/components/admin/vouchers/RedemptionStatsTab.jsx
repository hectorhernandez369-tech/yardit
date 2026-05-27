import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, ShieldOff, RotateCcw, Send, Search, ExternalLink, X } from "lucide-react";

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800",
  pending: "bg-blue-100 text-blue-800",
  on_hold: "bg-amber-100 text-amber-800",
  redeemed: "bg-slate-100 text-slate-600",
  revoked: "bg-red-100 text-red-800",
  expired: "bg-slate-100 text-slate-400",
};

const APP_BASE_URL = window.location.origin;

export default function RedemptionStatsTab({ adminUser }) {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ["allUserVouchers"],
    queryFn: () => base44.entities.UserVoucher.list("-created_at", 200),
    initialData: [],
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["voucherCampaigns"],
    queryFn: () => base44.entities.VoucherCampaign.list(),
    initialData: [],
  });

  const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c]));

  const handleLookup = async () => {
    if (!lookupQuery.trim()) return;
    setLookupLoading(true);
    setLookupResults(null);
    try {
      const q = lookupQuery.trim().toLowerCase();
      // Fetch all vouchers (up to 500) and filter client-side across all fields
      const all = await base44.entities.UserVoucher.list("-created_at", 500);
      // Also try to match users by email/name to find their user_id
      let userIds = new Set();
      try {
        const users = await base44.entities.User.list();
        users.forEach(u => {
          if (
            u.email?.toLowerCase().includes(q) ||
            u.full_name?.toLowerCase().includes(q)
          ) {
            userIds.add(u.id);
          }
        });
      } catch (_) {}

      const results = all.filter(v =>
        v.promo_code?.toLowerCase().includes(q) ||
        v.qr_token?.toLowerCase().includes(q) ||
        v.user_id?.toLowerCase().includes(q) ||
        v.reward_title?.toLowerCase().includes(q) ||
        v.business_name?.toLowerCase().includes(q) ||
        userIds.has(v.user_id)
      );
      setLookupResults(results);
    } catch (e) {
      toast.error("Lookup failed: " + e.message);
    }
    setLookupLoading(false);
  };

  const filtered = vouchers
    .filter(v => filter === "all" || v.status === filter)
    .filter(v => {
      if (!search) return true;
      const q = search.toLowerCase();
      return v.promo_code?.toLowerCase().includes(q) || v.user_id?.toLowerCase().includes(q) || v.reward_title?.toLowerCase().includes(q);
    });

  const doAction = async (voucherId, action, reason = "") => {
    setActionLoading(voucherId + action);
    try {
      await base44.functions.invoke("adminVoucherAction", { voucher_id: voucherId, action, reason });
      toast.success(`Action "${action}" completed.`);
      queryClient.invalidateQueries({ queryKey: ["allUserVouchers"] });
    } catch (e) {
      toast.error("Action failed: " + e.message);
    }
    setActionLoading(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#2C4F4E] flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-[#5DADA5]" />Redemption Statistics</h2>
        <p className="text-sm text-slate-500">All issued vouchers with status and admin actions.</p>
      </div>

      {/* Voucher Lookup Panel */}
      <div className="bg-[#F3E6CF] border-2 border-[#5DADA5]/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Search className="w-4 h-4 text-[#5DADA5]" />
          <span className="font-semibold text-sm text-[#2C4F4E]">Voucher Lookup</span>
          <span className="text-xs text-slate-400 ml-1">— search by promo code, token, user ID, email, name, or reward</span>
        </div>
        <div className="flex gap-2">
          <input
            className="border rounded-lg px-3 py-2 text-sm flex-1 bg-white"
            placeholder="e.g. YH-7LLACM, user@email.com, John Smith, QX2GCZLTV6VU..."
            value={lookupQuery}
            onChange={e => setLookupQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLookup()}
          />
          <Button size="sm" onClick={handleLookup} disabled={lookupLoading} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white gap-1 shrink-0">
            {lookupLoading ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Look Up
          </Button>
          {lookupResults !== null && (
            <Button size="sm" variant="ghost" onClick={() => { setLookupResults(null); setLookupQuery(""); }} className="shrink-0">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {lookupResults !== null && (
          <div>
            {lookupResults.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">No vouchers found matching that query.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium">{lookupResults.length} voucher{lookupResults.length !== 1 ? "s" : ""} found</p>
                {lookupResults.map(v => (
                  <div key={v.id} className="bg-white rounded-lg border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-[#2C4F4E] text-sm">{v.promo_code}</span>
                        <Badge className={`text-xs ${STATUS_COLORS[v.status] || ""}`}>{v.status}</Badge>
                      </div>
                      <p className="text-sm font-medium text-slate-700 truncate">{v.reward_title}</p>
                      <p className="text-xs text-slate-400 truncate">{campaignMap[v.campaign_id]?.campaign_name || ""}</p>
                      <p className="text-xs text-slate-400 font-mono">User: {v.user_id}</p>
                      {v.created_at && <p className="text-xs text-slate-400">Issued: {format(new Date(v.created_at), "MMM d, yyyy")}</p>}
                    </div>
                    <a
                      href={`${APP_BASE_URL}/reward/redeem/${v.qr_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5DADA5] hover:bg-[#4A9B93] text-white text-xs font-semibold shrink-0 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Redemption Page
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="border rounded-lg px-3 py-2 text-sm flex-1"
          placeholder="Filter table by promo code, user ID, or reward..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          {["all","active","pending","on_hold","redeemed","revoked","expired"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border ${filter === f ? "bg-[#2C4F4E] text-white border-[#2C4F4E]" : "bg-white border-slate-300 text-slate-600"}`}>
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-slate-400 text-sm py-8 text-center">Loading...</p>}

      {/* Desktop */}
      {!isLoading && filtered.length > 0 && (
        <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {["Promo Code","Campaign","Reward","Status","User","Created","Expires","Actions"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs text-slate-600 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono font-bold text-[#2C4F4E] text-xs">{v.promo_code}</td>
                  <td className="px-3 py-2 text-xs text-slate-600 max-w-[120px] truncate">{campaignMap[v.campaign_id]?.campaign_name || "—"}</td>
                  <td className="px-3 py-2 text-xs max-w-[120px] truncate">{v.reward_title}</td>
                  <td className="px-3 py-2"><Badge className={`text-xs ${STATUS_COLORS[v.status] || ""}`}>{v.status}</Badge></td>
                  <td className="px-3 py-2 text-xs text-slate-400 max-w-[100px] truncate">{v.user_id}</td>
                  <td className="px-3 py-2 text-xs text-slate-400 whitespace-nowrap">{v.created_at ? format(new Date(v.created_at), "MMM d") : "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-400 whitespace-nowrap">{v.expiration_date ? format(new Date(v.expiration_date), "MMM d, yy") : "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {v.status === "pending" && (
                        <button title="Activate" onClick={() => doAction(v.id, "activate")} disabled={!!actionLoading} className="p-1 text-slate-400 hover:text-green-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {v.status === "on_hold" && (
                        <button title="Clear Hold" onClick={() => doAction(v.id, "clear_hold")} disabled={!!actionLoading} className="p-1 text-slate-400 hover:text-teal-600">
                          <ShieldOff className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {["active","pending","on_hold"].includes(v.status) && (
                        <button title="Revoke" onClick={() => doAction(v.id, "revoke", "Admin manual revoke")} disabled={!!actionLoading} className="p-1 text-slate-300 hover:text-red-500">
                          <ShieldOff className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button title="Regenerate QR" onClick={() => doAction(v.id, "regenerate_qr")} disabled={!!actionLoading} className="p-1 text-slate-400 hover:text-blue-500">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile */}
      {!isLoading && filtered.length > 0 && (
        <div className="md:hidden space-y-3">
          {filtered.map(v => (
            <Card key={v.id} className="border border-slate-200">
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <p className="font-mono font-bold text-[#2C4F4E] text-sm">{v.promo_code}</p>
                  <Badge className={`text-xs ${STATUS_COLORS[v.status] || ""}`}>{v.status}</Badge>
                </div>
                <p className="text-sm font-medium">{v.reward_title}</p>
                <p className="text-xs text-slate-400">{campaignMap[v.campaign_id]?.campaign_name}</p>
                {v.expiration_date && <p className="text-xs text-slate-400">Expires: {format(new Date(v.expiration_date), "MMM d, yyyy")}</p>}
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                  {v.status === "pending" && <Button size="sm" variant="outline" onClick={() => doAction(v.id, "activate")} className="text-xs h-7 gap-1"><CheckCircle2 className="w-3 h-3" />Activate</Button>}
                  {v.status === "on_hold" && <Button size="sm" variant="outline" onClick={() => doAction(v.id, "clear_hold")} className="text-xs h-7 gap-1"><ShieldOff className="w-3 h-3" />Clear Hold</Button>}
                  {["active","pending","on_hold"].includes(v.status) && <Button size="sm" variant="outline" onClick={() => doAction(v.id, "revoke", "Admin")} className="text-xs h-7 text-red-500">Revoke</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="text-center py-8 text-slate-400 text-sm">No vouchers found.</p>
      )}
    </div>
  );
}