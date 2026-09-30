import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgePercent, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getVendorTierConfig } from "@/lib/vendorTiers";

export default function VendorDealsPanel({ account, deals = [], onRefresh }) {
  const tier = getVendorTierConfig(account?.vendor_tier);
  const [form, setForm] = useState({ title: "", description: "", promo_code: "", ends_at: "" });
  const [saving, setSaving] = useState(false);
  const enabled = tier.dealsAndSpecials;

  const save = async () => {
    if (!form.title.trim() || !enabled) return;
    setSaving(true);
    try {
      const response = await base44.functions.invoke("saveVendorDeal", {
        action: "create",
        vendor_account_id: account.id,
        deal: {
          ...form,
          ends_at: form.ends_at ? new Date(form.ends_at + "T23:59:59").toISOString() : null,
        },
      });
      if (response?.data?.error) throw new Error(response.data.error);
      setForm({ title: "", description: "", promo_code: "", ends_at: "" });
      toast.success("Deal published");
      onRefresh?.();
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || "Could not publish deal");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (deal) => {
    await base44.functions.invoke("saveVendorDeal", { action: "deactivate", vendor_account_id: account.id, deal_id: deal.id });
    onRefresh?.();
  };

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader><CardTitle className="flex items-center gap-2 text-[#2C4F4E]"><BadgePercent className="h-5 w-5" /> Deals & Specials</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {!enabled ? (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Deals & specials are available on Pro and Growth.</p>
        ) : (
          <>
            <Input placeholder="Deal title — e.g. $2 off any combo" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Details or redemption instructions" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Optional promo code" value={form.promo_code} onChange={(e) => setForm({ ...form, promo_code: e.target.value })} />
              <Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>
            <Button disabled={saving || !form.title.trim()} onClick={save} className="bg-[#5DADA5] text-white hover:bg-[#4A9B93]">Publish Deal</Button>
          </>
        )}
        {deals.filter((d) => d.status === "active").map((deal) => (
          <div key={deal.id} className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div><p className="font-bold text-[#2C4F4E]">{deal.title}</p>{deal.description && <p className="text-sm text-slate-600">{deal.description}</p>}{deal.promo_code && <p className="mt-1 text-xs font-semibold">Code: {deal.promo_code}</p>}</div>
            <Button size="icon" variant="ghost" onClick={() => deactivate(deal)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}