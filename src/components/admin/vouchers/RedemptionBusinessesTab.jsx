import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Building2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_BIZ = { business_name: "", address: "", contact_name: "", contact_email: "", redemption_radius_feet: 500, verified: false, active: true };

export default function RedemptionBusinessesTab({ adminUser }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editBiz, setEditBiz] = useState(null);
  const [form, setForm] = useState(DEFAULT_BIZ);
  const [saving, setSaving] = useState(false);

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ["redemptionBusinesses"],
    queryFn: () => base44.entities.RedemptionBusiness.list("-created_at"),
    initialData: [],
  });

  const openEdit = (biz) => { setEditBiz(biz); setForm({ ...DEFAULT_BIZ, ...biz }); setShowModal(true); };
  const openCreate = () => { setEditBiz(null); setForm(DEFAULT_BIZ); setShowModal(true); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.business_name) { toast.error("Business name required."); return; }
    setSaving(true);
    try {
      const payload = { ...form, created_at: editBiz?.created_at || new Date().toISOString() };
      if (editBiz) {
        await base44.entities.RedemptionBusiness.update(editBiz.id, payload);
        toast.success("Updated.");
      } else {
        await base44.entities.RedemptionBusiness.create(payload);
        toast.success("Business added.");
      }
      queryClient.invalidateQueries({ queryKey: ["redemptionBusinesses"] });
      setShowModal(false);
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  const toggleVerified = async (biz) => {
    await base44.entities.RedemptionBusiness.update(biz.id, { verified: !biz.verified });
    queryClient.invalidateQueries({ queryKey: ["redemptionBusinesses"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#2C4F4E] flex items-center gap-2"><Building2 className="w-5 h-5 text-[#F4A849]" />Redemption Businesses</h2>
          <p className="text-sm text-slate-500">Businesses that can redeem Yardit vouchers on behalf of users.</p>
        </div>
        <Button onClick={openCreate} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white border border-[#2C4F4E] gap-2">
          <Plus className="w-4 h-4" /> Add Business
        </Button>
      </div>

      {isLoading && <p className="text-center text-slate-400 text-sm py-8">Loading...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {businesses.map(biz => (
          <Card key={biz.id} className={`border ${biz.verified ? "border-green-200" : "border-slate-200"}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  {biz.logo ? (
                    <img src={biz.logo} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#5DADA5]/20 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-[#5DADA5]" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-[#2C4F4E]">{biz.business_name}</p>
                    {biz.address && <p className="text-xs text-slate-400 leading-tight">{biz.address}</p>}
                  </div>
                </div>
                {biz.verified
                  ? <Badge className="text-xs bg-green-100 text-green-700 border-green-300 gap-1"><CheckCircle2 className="w-3 h-3" />Verified</Badge>
                  : <Badge className="text-xs bg-slate-100 text-slate-500">Unverified</Badge>
                }
              </div>
              {biz.contact_email && <p className="text-xs text-slate-500">{biz.contact_name} · {biz.contact_email}</p>}
              <p className="text-xs text-slate-400">Radius: {biz.redemption_radius_feet || 500} ft</p>
              <div className="flex gap-2 pt-1 border-t border-slate-100">
                <Button size="sm" variant="outline" onClick={() => openEdit(biz)} className="text-xs h-7 gap-1"><Edit className="w-3 h-3" />Edit</Button>
                <Button size="sm" variant="outline" onClick={() => toggleVerified(biz)}
                  className={`text-xs h-7 gap-1 ${biz.verified ? "text-slate-500" : "text-green-600 border-green-300"}`}>
                  {biz.verified ? <><XCircle className="w-3 h-3" />Unverify</> : <><CheckCircle2 className="w-3 h-3" />Verify</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && businesses.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No businesses yet.</p>
          <p className="text-sm">Add your first redemption partner business.</p>
        </div>
      )}

      <Dialog open={showModal} onOpenChange={() => setShowModal(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editBiz ? "Edit Business" : "Add Redemption Business"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Business Name *</Label><Input value={form.business_name} onChange={e => set("business_name", e.target.value)} /></div>
            <div className="space-y-1"><Label>Address</Label><Input value={form.address} onChange={e => set("address", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Contact Name</Label><Input value={form.contact_name} onChange={e => set("contact_name", e.target.value)} /></div>
              <div className="space-y-1"><Label>Contact Email</Label><Input value={form.contact_email} onChange={e => set("contact_email", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Redemption Radius (feet)</Label><Input type="number" value={form.redemption_radius_feet} onChange={e => set("redemption_radius_feet", Number(e.target.value))} /></div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2"><Switch checked={!!form.verified} onCheckedChange={v => set("verified", v)} /><Label>Verified</Label></div>
              <div className="flex items-center gap-2"><Switch checked={!!form.active} onCheckedChange={v => set("active", v)} /><Label>Active</Label></div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#5DADA5] text-white border border-[#2C4F4E]">
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}