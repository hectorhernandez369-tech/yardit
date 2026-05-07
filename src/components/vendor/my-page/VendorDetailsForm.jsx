import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const fields = [
  ["business_name", "Business Name"],
  ["business_logo", "Business Logo URL"],
  ["business_category", "Business Category"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["website", "Website"],
  ["facebook_url", "Facebook Link"],
  ["instagram_url", "Instagram Link"],
  ["tiktok_url", "TikTok Link"],
];

export default function VendorDetailsForm({ account, onRefresh }) {
  const [form, setForm] = useState({ ...account });
  const [saving, setSaving] = useState(false);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const saveProfile = async () => {
    setSaving(true);
    const payload = {
      business_name: form.business_name,
      business_logo: form.business_logo,
      business_category: form.business_category,
      description: form.description,
      phone: form.phone,
      email: form.email,
      website: form.website,
      facebook_url: form.facebook_url,
      instagram_url: form.instagram_url,
      tiktok_url: form.tiktok_url,
    };
    await base44.entities.VendorAccount.update(account.id, payload);
    toast.success("Vendor page updated");
    await onRefresh();
    setSaving(false);
  };

  return (
    <Card id="vendor-profile-editor" className="border-[#2C4F4E]/15">
      <CardHeader>
        <CardTitle className="text-[#2C4F4E]">Business Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {fields.map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input value={form[key] || ""} onChange={(e) => updateField(key, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label>Short Bio / Description</Label>
          <Textarea value={form.description || ""} onChange={(e) => updateField("description", e.target.value)} className="min-h-28" />
        </div>
        <Button onClick={saveProfile} disabled={saving} className="bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E]">
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </CardContent>
    </Card>
  );
}