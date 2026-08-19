import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EVENTS_EXPERIENCE, setPreferredExperience } from "@/lib/experience";

const EIN_PATTERN = /^\d{2}-\d{7}$/;

export default function SportsAccountSignup() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const organizerType = params.get("organizer") === "team" ? "team" : "league";
  const isTeam = organizerType === "team";
  const dashboardPath = isTeam ? "/TeamDashboard" : "/LeagueTeamDashboard";
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    business_category: "",
    business_tax_id: "",
    business_city: "",
    business_state: "",
    description: "",
    website: "",
    phone: "",
    instagram_url: "",
  });

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const createAccount = async () => {
    if (!form.business_name.trim() || !form.business_category.trim()) {
      return toast.error("Organization name and sport/category are required.");
    }
    if (form.business_tax_id.trim() && !EIN_PATTERN.test(form.business_tax_id.trim())) {
      return toast.error("If you enter an EIN/Tax ID, use 12-3456789 format.");
    }
    setSaving(true);
    try {
      const response = await base44.functions.invoke("createPublicVendorAccount", { businessForm: form, organizerType });
      const account = response?.data?.account;
      if (!account) throw new Error(response?.data?.error || "Could not create the organizer account.");
      setPreferredExperience(EVENTS_EXPERIENCE);
      sessionStorage.setItem("yardit_explicit_organizer_account_id", account.id);
      toast.success(`${isTeam ? "Team" : "League"} account created.`);
      navigate(`${dashboardPath}?account=${account.id}&tab=profile`);
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || "Could not create the organizer account.");
    } finally {
      setSaving(false);
    }
  };

  const Icon = isTeam ? Users : Trophy;
  return <div className="min-h-[calc(100vh-140px)] bg-[#F3E6CF] px-4 py-8">
    <div className="mx-auto max-w-2xl">
      <Card className="rounded-3xl border-2 border-[#2C4F4E]/20 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl text-[#2C4F4E]"><Icon className="h-6 w-6" /> Create {isTeam ? "Team" : "League"} Account</CardTitle>
          <p className="text-sm text-slate-600">This is a separate organizer account under your existing Yardit login.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-700">
            {isTeam ? "Team accounts manage their own page, My Team Schedule, league connections, events, and scores. They do not control a league Master Schedule or add league teams." : "League accounts manage multiple teams, the league Master Schedule, league-wide events, schedules, and score controls."}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label>Organization Name *</Label><Input value={form.business_name} onChange={(e) => setField("business_name", e.target.value)} placeholder={isTeam ? "Lindsay Youth Football and Cheer" : "League name"} /></div>
            <div className="space-y-2"><Label>Sport / Category *</Label><Input value={form.business_category} onChange={(e) => setField("business_category", e.target.value)} placeholder="Youth football, baseball, soccer..." /></div>
            <div className="space-y-2"><Label>EIN / Tax ID</Label><Input value={form.business_tax_id} onChange={(e) => setField("business_tax_id", e.target.value)} placeholder="12-3456789" /></div>
            <div className="space-y-2"><Label>City</Label><Input value={form.business_city} onChange={(e) => setField("business_city", e.target.value)} /></div>
            <div className="space-y-2"><Label>State</Label><Input value={form.business_state} onChange={(e) => setField("business_state", e.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Tell people about the organization" /></div>
            <div className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={(e) => setField("website", e.target.value)} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} /></div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={createAccount} disabled={saving} className="flex-1 bg-[#5DADA5] text-white hover:bg-[#4A9B93]">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : `Create ${isTeam ? "Team" : "League"} Account`}</Button>
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>;
}