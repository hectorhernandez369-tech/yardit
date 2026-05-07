import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function CheckInProfileEditor({ profile, onUpdate }) {
  const [form, setForm] = useState({
    category: profile?.category || "",
    description: profile?.description || "",
    logo_url: profile?.logo_url || "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const updated = await base44.entities.VendorProfile.update(profile.id, form);
    onUpdate?.(updated);
    toast.success("Profile updated");
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl" />
      <Input placeholder="Logo image URL" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} className="rounded-xl" />
      <Textarea placeholder="Business description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl min-h-24" />
      <Button onClick={save} disabled={saving} className="rounded-xl">Save Public Profile</Button>
    </div>
  );
}