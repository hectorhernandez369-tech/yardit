import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, Loader2, Upload } from "lucide-react";
import { getVendorAccountNumber, getVendorIdentityWarnings } from "@/lib/vendorAccountIdentity";

const fields = [
  ["vendor_display_name", "Public Display Name"],
  ["business_name", "Business Name"],
  ["legal_business_name", "Legal Business Name"],
  ["organization_type", "Organization Type"],
  ["business_category", "Business Category"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["website", "Website"],
  ["facebook_url", "Facebook Link"],
  ["instagram_url", "Instagram Link"],
  ["tiktok_url", "TikTok Link"],
  ["business_street_address", "Business Street Address"],
  ["business_city", "Business City"],
  ["business_state", "Business State"],
  ["business_zip_code", "Business ZIP Code"],
];

export default function VendorDetailsForm({ account, onRefresh }) {
  const [form, setForm] = useState({ ...account });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const logoInputRef = useRef(null);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const uploadLogo = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    updateField("business_logo", file_url);
    setUploadingLogo(false);
    toast.success("Logo uploaded. Click Save Profile to publish it.");
    event.target.value = "";
  };

  const saveProfile = async () => {
    setSaving(true);
    const businessAddress = [form.business_street_address, form.business_city, form.business_state, form.business_zip_code].filter(Boolean).join(", ");
    const payload = {
      business_name: form.business_name,
      vendor_display_name: form.vendor_display_name || form.business_name,
      legal_business_name: form.legal_business_name || form.business_name,
      organization_type: form.organization_type || "vendor",
      business_logo: form.business_logo,
      business_category: form.business_category,
      description: form.description,
      phone: form.phone,
      business_phone: form.phone,
      email: form.email,
      website: form.website,
      public_contact_visibility: form.public_contact_visibility === "show" ? "show" : "hide",
      facebook_url: form.facebook_url,
      instagram_url: form.instagram_url,
      tiktok_url: form.tiktok_url,
      business_street_address: form.business_street_address,
      business_city: form.business_city,
      business_state: form.business_state,
      business_zip_code: form.business_zip_code,
      business_address: businessAddress,
      location: businessAddress || form.location,
    };
    await base44.entities.VendorAccount.update(account.id, payload);
    toast.success("Vendor page updated");
    await onRefresh();
    setSaving(false);
  };

  return (
    <Card id="vendor-profile-editor" className="border-[#2C4F4E]/15 bg-white shadow-sm overflow-hidden">
      <CardHeader className="p-4 sm:p-6 space-y-3">
        <div className="grid gap-2 rounded-2xl border border-[#2C4F4E]/10 bg-[#FBFAF7] p-3 text-xs text-slate-700 sm:grid-cols-2">
          <p><strong>Vendor Account #:</strong> {getVendorAccountNumber(account) || "Not assigned"}</p>
          <p><strong>Public URL:</strong> {account.vendor_slug ? `/vendor/${account.vendor_slug}` : "Not assigned"}</p>
          <p><strong>Owner Email:</strong> {account.owner_email || "Not assigned"}</p>
          {getVendorIdentityWarnings(account).map((warning) => (
            <p key={warning} className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3 w-3" /> {warning}</p>
          ))}
        </div>
        <button type="button" onClick={() => setExpanded((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left">
          <div>
            <CardTitle className="text-[#2C4F4E]">Business Details</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Tap to edit your public business information.</p>
          </div>
          <ChevronDown className={`h-5 w-5 text-[#2C4F4E] transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="flex flex-col gap-3 rounded-2xl border border-[#2C4F4E]/10 bg-[#FBFAF7] p-3 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-white">
              {form.business_logo ? (
                <img src={form.business_logo} alt="Business logo" className="h-full w-full object-cover" />
              ) : (
                <Upload className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <Label>Business Logo</Label>
              <p className="text-xs text-slate-500">Upload the photo/logo that appears on your vendor page and dashboard header.</p>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
              <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="gap-2">
                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingLogo ? "Uploading..." : "Upload Logo"}
              </Button>
            </div>
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4">
            {fields.map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input value={form[key] || ""} onChange={(e) => updateField(key, e.target.value)} className="min-w-0" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-[#2C4F4E]/10 bg-[#FBFAF7] p-4 space-y-2">
            <h3 className="font-black text-[#2C4F4E]">Public Contact Information</h3>
            <label className="flex items-start gap-3 text-sm font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={form.public_contact_visibility === "show"}
                onChange={(e) => updateField("public_contact_visibility", e.target.checked ? "show" : "hide")}
                className="mt-1 h-4 w-4"
              />
              <span>
                Show my contact information publicly
                <span className="block pt-1 text-xs font-normal text-slate-500">
                  When turned off, your phone number, email address and website will not appear on public business profiles, event pages or map cards.
                </span>
              </span>
            </label>
          </div>
          <div className="space-y-1.5">
            <Label>Short Bio / Description</Label>
            <Textarea value={form.description || ""} onChange={(e) => updateField("description", e.target.value)} className="min-h-28" />
          </div>
          <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-auto bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E]">
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}