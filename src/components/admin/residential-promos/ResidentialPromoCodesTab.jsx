import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Pause, Play, Copy, Trash2, BarChart2, MapPin } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ResidentialPromoCodeModal from "./ResidentialPromoCodeModal";
import ResidentialPromoUsageModal from "./ResidentialPromoUsageModal";

const statusColors = {
  active: "bg-green-100 text-green-800 border-green-300",
  paused: "bg-yellow-100 text-yellow-800 border-yellow-300",
  expired: "bg-slate-100 text-slate-500 border-slate-300",
  draft: "bg-blue-100 text-blue-800 border-blue-300",
};

function formatCoverage(promo) {
  // Prefer new geo fields
  if (promo.geographic_limit_enabled) {
    const geoType = promo.geographic_limit_type;
    if (geoType === "city_zip") {
      if (promo.geo_display_label) return promo.geo_display_label;
      const parts = [];
      if (promo.eligible_cities?.length) parts.push(promo.eligible_cities.join(", "));
      if (promo.eligible_zips?.length) parts.push(promo.eligible_zips.join(", "));
      return parts.join(" / ") || "City/ZIP";
    }
    if (geoType === "radius") {
      const label = promo.geo_display_label ? `from ${promo.geo_display_label}` : "";
      return `${promo.geo_radius_miles || "?"}-mi radius ${label}`.trim();
    }
  }
  // Legacy
  const t = promo.coverage_type;
  if (!t || t === "nationwide") return "Nationwide";
  if (t === "state") return promo.coverage_state || "State";
  if (t === "county") return [promo.coverage_county, promo.coverage_state].filter(Boolean).join(", ") || "County";
  if (t === "city" || t === "town") return [promo.coverage_city || promo.coverage_town, promo.coverage_state].filter(Boolean).join(", ") || "City";
  if (t === "zip") return promo.coverage_zip || "ZIP";
  if (t === "custom") return "Custom";
  return t;
}

function GeoChip({ promo }) {
  if (!promo.geographic_limit_enabled) return null;
  const label = formatCoverage(promo);
  if (label === "Nationwide") return null;
  return (
    <Badge className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] gap-1">
      <MapPin className="w-2.5 h-2.5 inline" />{label}
    </Badge>
  );
}

function formatDiscount(promo) {
  if (promo.early_discount_enabled) {
    return `First ${promo.early_discount_limit}: ${promo.early_discount_percent}% / then ${promo.default_discount_percent}%`;
  }
  return `${promo.default_discount_percent}%`;
}

const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Expired", value: "expired" },
  { label: "Draft", value: "draft" },
];

export default function ResidentialPromoCodesTab({ adminUser }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [usagePromo, setUsagePromo] = useState(null);

  const isMaster = ["master", "super_master", "supervisor"].includes(adminUser?.role);

  const { data: promoCodes = [], isLoading } = useQuery({
    queryKey: ["residentialPromoCodes"],
    queryFn: () => base44.entities.ResidentialPromoCode.list("-created_at"),
    initialData: [],
  });

  const filtered = filter === "all" ? promoCodes : promoCodes.filter((p) => p.status === filter);

  const handleCreate = () => { setEditRecord(null); setShowModal(true); };
  const handleEdit = (promo) => { setEditRecord(promo); setShowModal(true); };

  const handleModalClose = (saved) => {
    setShowModal(false);
    setEditRecord(null);
    if (saved) queryClient.invalidateQueries({ queryKey: ["residentialPromoCodes"] });
  };

  const handleTogglePause = async (promo) => {
    const newStatus = promo.status === "active" ? "paused" : "active";
    try {
      await base44.entities.ResidentialPromoCode.update(promo.id, { status: newStatus, updated_at: new Date().toISOString() });
      toast.success(`Promo code ${newStatus === "active" ? "activated" : "paused"}.`);
      queryClient.invalidateQueries({ queryKey: ["residentialPromoCodes"] });
    } catch { toast.error("Failed to update status."); }
  };

  const handleDuplicate = async (promo) => {
    const { id, created_date, updated_date, total_used_count, early_discount_used_count, ...rest } = promo;
    const now = new Date().toISOString();
    try {
      await base44.entities.ResidentialPromoCode.create({
        ...rest,
        code: promo.code + "_COPY",
        status: "draft",
        total_used_count: 0,
        early_discount_used_count: 0,
        created_at: now,
        updated_at: now,
        created_by_admin_id: adminUser?.id || "",
        created_by_admin_email: adminUser?.email || "",
      });
      toast.success("Promo code duplicated as draft.");
      queryClient.invalidateQueries({ queryKey: ["residentialPromoCodes"] });
    } catch { toast.error("Duplicate failed."); }
  };

  const handleDelete = async (promo) => {
    if ((promo.total_used_count || 0) > 0) {
      toast.error("Cannot delete a promo code that has been used. Pause it instead.");
      return;
    }
    if (!window.confirm(`Delete promo code "${promo.code}"? This cannot be undone.`)) return;
    try {
      await base44.entities.ResidentialPromoCode.delete(promo.id);
      toast.success("Promo code deleted.");
      queryClient.invalidateQueries({ queryKey: ["residentialPromoCodes"] });
    } catch { toast.error("Delete failed."); }
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#2C4F4E]">Residential Promo Codes</h2>
          <p className="text-sm text-slate-500">Manage discount codes for residential listings.</p>
        </div>
        <Button onClick={handleCreate} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white border-2 border-[#2C4F4E] gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Create Promo Code
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              filter === f.value
                ? "bg-[#2C4F4E] text-white border-[#2C4F4E]"
                : "bg-white text-slate-600 border-slate-300 hover:border-[#2C4F4E]"
            }`}
          >
            {f.label}
            {f.value !== "all" && (
              <span className="ml-1 text-xs opacity-70">
                ({promoCodes.filter((p) => p.status === f.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-slate-400 text-sm py-4">Loading promo codes...</p>}

      {/* Desktop Table */}
      {!isLoading && filtered.length > 0 && (
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Code", "Title", "Status", "Discount", "Early Offer", "Coverage", "Uses", "Starts", "Expires", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-slate-600 font-semibold whitespace-nowrap text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((promo) => (
                <tr key={promo.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono font-bold text-[#2C4F4E]">{promo.code}</td>
                  <td className="px-3 py-2 max-w-[140px] truncate">{promo.title}</td>
                  <td className="px-3 py-2">
                    <Badge className={`text-xs ${statusColors[promo.status]}`}>{promo.status}</Badge>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDiscount(promo)}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {promo.early_discount_enabled ? `${promo.early_discount_used_count || 0}/${promo.early_discount_limit}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                   <div className="flex items-center gap-1 flex-wrap">
                     <span>{formatCoverage(promo)}</span>
                     {promo.geographic_limit_enabled && <MapPin className="w-3 h-3 text-teal-600" />}
                   </div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {promo.total_used_count || 0}{promo.max_total_uses ? `/${promo.max_total_uses}` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                    {promo.starts_at ? format(new Date(promo.starts_at), "MMM d, yy") : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                    {promo.expires_at ? format(new Date(promo.expires_at), "MMM d, yy") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button title="Edit" onClick={() => handleEdit(promo)} className="p-1 text-slate-500 hover:text-[#2C4F4E]"><Edit className="w-3.5 h-3.5" /></button>
                      <button title={promo.status === "active" ? "Pause" : "Activate"} onClick={() => handleTogglePause(promo)} className="p-1 text-slate-500 hover:text-amber-600">
                        {promo.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button title="Duplicate" onClick={() => handleDuplicate(promo)} className="p-1 text-slate-500 hover:text-blue-600"><Copy className="w-3.5 h-3.5" /></button>
                      <button title="View Usage" onClick={() => setUsagePromo(promo)} className="p-1 text-slate-500 hover:text-[#5DADA5]"><BarChart2 className="w-3.5 h-3.5" /></button>
                      {isMaster && (
                        <button title="Delete (if unused)" onClick={() => handleDelete(promo)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="md:hidden space-y-3">
          {filtered.map((promo) => (
            <Card key={promo.id} className="border border-slate-200">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono font-bold text-[#2C4F4E] text-base">{promo.code}</p>
                    <p className="text-sm text-slate-700">{promo.title}</p>
                  </div>
                  <Badge className={`text-xs shrink-0 ${statusColors[promo.status]}`}>{promo.status}</Badge>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                 <p>Discount: <span className="font-medium">{formatDiscount(promo)}</span></p>
                 {promo.early_discount_enabled && <p>Early: {promo.early_discount_used_count || 0}/{promo.early_discount_limit} used</p>}
                 <p className="flex items-center gap-1">Coverage: {formatCoverage(promo)} <GeoChip promo={promo} /></p>
                  <p>Uses: {promo.total_used_count || 0}{promo.max_total_uses ? `/${promo.max_total_uses}` : " (unlimited)"}</p>
                  {promo.expires_at && <p>Expires: {format(new Date(promo.expires_at), "MMM d, yyyy")}</p>}
                </div>
                <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(promo)} className="gap-1 text-xs h-7"><Edit className="w-3 h-3" />Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => handleTogglePause(promo)} className="gap-1 text-xs h-7">
                    {promo.status === "active" ? <><Pause className="w-3 h-3" />Pause</> : <><Play className="w-3 h-3" />Activate</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDuplicate(promo)} className="gap-1 text-xs h-7"><Copy className="w-3 h-3" />Duplicate</Button>
                  <Button size="sm" variant="outline" onClick={() => setUsagePromo(promo)} className="gap-1 text-xs h-7"><BarChart2 className="w-3 h-3" />Usage</Button>
                  {isMaster && (
                    <Button size="sm" variant="outline" onClick={() => handleDelete(promo)} className="gap-1 text-xs h-7 text-red-500 border-red-200 hover:bg-red-50"><Trash2 className="w-3 h-3" />Delete</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg">No promo codes found.</p>
          <p className="text-sm mt-1">Create your first promo code to get started.</p>
        </div>
      )}

      <ResidentialPromoCodeModal
        open={showModal}
        onClose={handleModalClose}
        existingPromo={editRecord}
        adminUser={adminUser}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["residentialPromoCodes"] })}
      />

      <ResidentialPromoUsageModal
        open={!!usagePromo}
        onClose={() => setUsagePromo(null)}
        promoCode={usagePromo}
      />
    </div>
  );
}