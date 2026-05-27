import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Pause, Play, Trash2, Gift, Users, Store, Building2, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import VoucherCampaignModal from "./VoucherCampaignModal";

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800 border-green-300",
  paused: "bg-yellow-100 text-yellow-800 border-yellow-300",
  draft: "bg-blue-100 text-blue-800 border-blue-300",
  ended: "bg-slate-100 text-slate-500 border-slate-300",
};

export default function VoucherCampaignsTab({ adminUser }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [filter, setFilter] = useState("all");

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["voucherCampaigns"],
    queryFn: () => base44.entities.VoucherCampaign.list("-created_at"),
    initialData: [],
  });

  const { data: allRedemptions = [] } = useQuery({
    queryKey: ["allVoucherRedemptions"],
    queryFn: () => base44.entities.UserVoucher.filter({ status: "redeemed" }),
    initialData: [],
  });

  const redemptionCountByCampaign = allRedemptions.reduce((acc, v) => {
    acc[v.campaign_id] = (acc[v.campaign_id] || 0) + 1;
    return acc;
  }, {});

  const getLinkedBusinessName = (c) => {
    if (c.business_link_type === "yardit_vendor") return c.vendor_business_name || "—";
    if (c.business_link_type === "external_business") return c.external_business_name || "—";
    return c.business_name || "—";
  };

  const filtered = filter === "all" ? campaigns : campaigns.filter(c => c.status === filter);

  const handleToggle = async (c) => {
    const newStatus = c.status === "active" ? "paused" : "active";
    await base44.entities.VoucherCampaign.update(c.id, { status: newStatus });
    toast.success(`Campaign ${newStatus}`);
    queryClient.invalidateQueries({ queryKey: ["voucherCampaigns"] });
  };

  const handleDelete = async (c) => {
    if ((c.issued_count || 0) > 0) { toast.error("Cannot delete a campaign with issued vouchers."); return; }
    if (!window.confirm(`Delete campaign "${c.campaign_name}"?`)) return;
    await base44.entities.VoucherCampaign.delete(c.id);
    toast.success("Deleted.");
    queryClient.invalidateQueries({ queryKey: ["voucherCampaigns"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#2C4F4E] flex items-center gap-2"><Gift className="w-5 h-5 text-[#F4A849]" />QR Voucher Campaigns</h2>
          <p className="text-sm text-slate-500">Create reward campaigns triggered by lister and hunter actions.</p>
        </div>
        <Button onClick={() => { setEditRecord(null); setShowModal(true); }} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white border border-[#2C4F4E] gap-2">
          <Plus className="w-4 h-4" /> New Campaign
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {["all","active","paused","draft","ended"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${filter === f ? "bg-[#2C4F4E] text-white border-[#2C4F4E]" : "bg-white text-slate-600 border-slate-300 hover:border-[#2C4F4E]"}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && <span className="ml-1 text-xs opacity-70">({campaigns.filter(c => c.status === f).length})</span>}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-slate-400 text-sm py-8 text-center">Loading campaigns...</p>}

      {/* Desktop */}
      {!isLoading && filtered.length > 0 && (
        <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {["Campaign","Reward","Linked Business","Type","Vendor?","Issued","Redeemed","Status","Actions"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-slate-600 font-semibold text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <p className="font-semibold text-[#2C4F4E]">{c.campaign_name}</p>
                    <p className="text-xs text-slate-400">{c.promo_prefix}-XXXXXX</p>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{c.reward_title}</p>
                    <p className="text-xs text-slate-400">{c.reward_value}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700 max-w-[120px] truncate">{getLinkedBusinessName(c)}</td>
                  <td className="px-3 py-2">
                   {c.business_link_type === "yardit_vendor" && (
                     <span className="inline-flex items-center gap-1 text-[10px] bg-[#5DADA5]/10 text-[#2C4F4E] px-2 py-0.5 rounded-full font-medium">
                       <Store className="w-3 h-3" /> Yardit
                     </span>
                   )}
                   {c.business_link_type === "external_business" && (
                     <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                       <Building2 className="w-3 h-3" /> External
                     </span>
                   )}
                   {!c.business_link_type && <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                   {c.business_link_type === "yardit_vendor"
                     ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                     : <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                   }
                  </td>
                  <td className="px-3 py-2">
                   <div className="flex items-center gap-1 text-xs">
                     <Users className="w-3 h-3 text-slate-400" />
                     {c.issued_count || 0}{c.distribution_limit ? `/${c.distribution_limit}` : ""}
                   </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 font-medium">{redemptionCountByCampaign[c.id] || 0}</td>
                  <td className="px-3 py-2"><Badge className={`text-xs ${STATUS_COLORS[c.status] || ""}`}>{c.status}</Badge></td>
                  <td className="px-3 py-2 hidden">{/* dates removed for space */}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditRecord(c); setShowModal(true); }} className="p-1 text-slate-400 hover:text-[#2C4F4E]"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleToggle(c)} className="p-1 text-slate-400 hover:text-amber-500">
                        {c.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => handleDelete(c)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
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
          {filtered.map(c => (
            <Card key={c.id} className="border border-slate-200">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-[#2C4F4E]">{c.campaign_name}</p>
                    <p className="text-sm text-slate-600">{c.reward_title}</p>
                    <p className="text-xs text-slate-400">{getLinkedBusinessName(c)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={`text-xs ${STATUS_COLORS[c.status] || ""}`}>{c.status}</Badge>
                    {c.business_link_type === "yardit_vendor" && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-[#5DADA5]/10 text-[#2C4F4E] px-2 py-0.5 rounded-full"><Store className="w-3 h-3" /> Yardit</span>
                    )}
                    {c.business_link_type === "external_business" && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full"><Building2 className="w-3 h-3" /> External</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <p>Issued: {c.issued_count || 0}{c.distribution_limit ? `/${c.distribution_limit}` : ""} · Redeemed: {redemptionCountByCampaign[c.id] || 0}</p>
                  <p>Prefix: {c.promo_prefix}-XXXXXX</p>
                  {c.end_date && <p>Expires: {format(new Date(c.end_date), "MMM d, yyyy")}</p>}
                </div>
                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <Button size="sm" variant="outline" onClick={() => { setEditRecord(c); setShowModal(true); }} className="gap-1 text-xs h-7"><Edit className="w-3 h-3" />Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => handleToggle(c)} className="gap-1 text-xs h-7">
                    {c.status === "active" ? <><Pause className="w-3 h-3" />Pause</> : <><Play className="w-3 h-3" />Activate</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No campaigns found.</p>
          <p className="text-sm">Create your first voucher campaign to reward listers and hunters.</p>
        </div>
      )}

      <VoucherCampaignModal open={showModal} onClose={(saved) => { setShowModal(false); if (saved) queryClient.invalidateQueries({ queryKey: ["voucherCampaigns"] }); }} editRecord={editRecord} adminUser={adminUser} />
    </div>
  );
}