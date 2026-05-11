import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

export default function VendorProfileTab({ account, onRefresh }) {
  const [form, setForm] = useState({
    vendor_display_name: account?.vendor_display_name || account?.business_name || "",
    legal_business_name: account?.legal_business_name || account?.business_name || "",
    organization_type: account?.organization_type || "vendor",
    business_name: account?.business_name || "",
    business_category: account?.business_category || "",
    description: account?.description || "",
    phone: account?.phone || "",
    email: account?.email || "",
    website: account?.website || "",
    business_logo: account?.business_logo || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const uploadLogo = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    updateField("business_logo", file_url);
    setUploading(false);
  };

  const saveProfile = async () => {
    if (!form.business_name.trim()) return toast.error("Business name is required");
    setSaving(true);
    await base44.entities.VendorAccount.update(account.id, {
      ...form,
      business_phone: form.phone,
    });
    toast.success("Business profile updated");
    setSaving(false);
    onRefresh?.();
  };

  return (
    <Card className="border-[#2C4F4E]/15">
      <CardHeader>
        <CardTitle className="text-[#2C4F4E]">Business Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl bg-muted overflow-hidden flex items-center justify-center border">
            {form.business_logo ? <img src={form.business_logo} alt="Business logo" className="h-full w-full object-cover" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
          </div>
          <div>
            <Input type="file" accept="image/*" onChange={uploadLogo} disabled={uploading} />
            {uploading && <p className="mt-1 text-xs text-muted-foreground">Uploading logo...</p>}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Public display name" value={form.vendor_display_name} onChange={(e) => updateField("vendor_display_name", e.target.value)} />
          <Input placeholder="Legal business name" value={form.legal_business_name} onChange={(e) => updateField("legal_business_name", e.target.value)} />
          <Input placeholder="Business name" value={form.business_name} onChange={(e) => updateField("business_name", e.target.value)} />
          <Input placeholder="Organization type" value={form.organization_type} onChange={(e) => updateField("organization_type", e.target.value)} />
          <Input placeholder="Category" value={form.business_category} onChange={(e) => updateField("business_category", e.target.value)} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
          <Input placeholder="Email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
          <Input placeholder="Website" value={form.website} onChange={(e) => updateField("website", e.target.value)} className="md:col-span-2" />
        </div>
        <Textarea placeholder="Business description" value={form.description} onChange={(e) => updateField("description", e.target.value)} className="min-h-28" />
        <Button onClick={saveProfile} disabled={saving} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Profile
        </Button>
      </CardContent>
    </Card>
  );
}