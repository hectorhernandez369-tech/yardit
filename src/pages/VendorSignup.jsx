import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Building2, CheckCircle2, Loader2, MapPin, Store } from "lucide-react";
import AddressFields from "@/components/shared/AddressFields";
import VendorSetupProgress from "@/components/vendor/VendorSetupProgress";
import { buildVendorAccountIdentityFields } from "@/lib/vendorAccountIdentity";
import { getUserVendorAccounts } from "@/lib/getUserVendorAccounts";
import { toast } from "sonner";
import { EVENTS_EXPERIENCE, getPreferredExperience, setPreferredExperience } from "@/lib/experience";

const MAPBOX_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";
const EIN_PATTERN = /^\d{2}-\d{7}$/;

async function geocodeResidentialAddress(form) {
  const query = `${form.street_address}, ${form.city}, ${form.state}, ${form.zip_code}`;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=1&access_token=${MAPBOX_TOKEN}`;
  const response = await fetch(url);
  const data = await response.json();
  const feature = data?.features?.[0];
  if (!feature?.center) return null;
  const [lng, lat] = feature.center;
  return { lat, lng };
}

export default function VendorSignup() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const organizerType = urlParams.get("organizer") || localStorage.getItem("yardit_organizer_account_type") || "vendor_event";
  const dashboardPath = organizerType === "league_team" ? "/LeagueTeamDashboard" : "/VendorDashboard";
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimableAccounts, setClaimableAccounts] = useState([]);
  const [residentialForm, setResidentialForm] = useState({ street_address: "", city: "", state: "", zip_code: "" });
  const [businessForm, setBusinessForm] = useState({
    business_name: "",
    business_category: "",
    business_tax_id: "",
    business_street_address: "",
    business_city: "",
    business_state: "",
    business_zip_code: "",
    description: "",
    website: "",
    phone: "",
    facebook_url: "",
    instagram_url: "",
    tiktok_url: "",
  });
  const [createdAccount, setCreatedAccount] = useState(null);

  const handleClaimAccount = async (accountToClaim) => {
    setClaiming(true);
    await base44.entities.VendorAccount.update(accountToClaim.id, {
      owner_user_id: user.id,
      owner_email: user.email,
      owner_name: user.full_name || user.email,
    });
    setPreferredExperience(EVENTS_EXPERIENCE);
    toast.success("Account claimed! Redirecting to Yardit Events...");
    navigate(dashboardPath);
  };

  useEffect(() => {
    base44.auth.me().then(async (currentUser) => {
      setUser(currentUser);
      const existing = await getUserVendorAccounts(currentUser, { organizerType });
      if (existing.length > 0) {
        navigate(dashboardPath);
        return;
      }
      // Check for admin-pre-created accounts matching this email
      const byEmail = await base44.entities.VendorAccount.filter({ owner_email: currentUser.email }).catch(() => []);
      const unclaimed = byEmail.filter((a) => a.is_active !== false && (a.vendor_origin === "admin_auto_created" || !a.owner_user_id || a.owner_user_id === a.owner_email));
      if (unclaimed.length > 0) {
        setClaimableAccounts(unclaimed);
      }
      setResidentialForm({
        street_address: currentUser.street_address || "",
        city: currentUser.city || "",
        state: currentUser.state || "",
        zip_code: currentUser.zip_code || "",
      });
      setLoading(false);
    }).catch(() => {
      base44.auth.redirectToLogin(`${window.location.origin}/VendorSignup`);
    });
  }, []);

  const saveResidentialAddress = async () => {
    if (!residentialForm.street_address || !residentialForm.city || !residentialForm.state || !residentialForm.zip_code) {
      toast.error("Residential address is required for Yardit account validation.");
      return;
    }

    setSaving(true);
    const coords = await geocodeResidentialAddress(residentialForm);
    if (!coords) {
      setSaving(false);
      toast.error("Please double-check your residential address.");
      return;
    }

    const address = [residentialForm.street_address, residentialForm.city, residentialForm.state, residentialForm.zip_code].filter(Boolean).join(", ");
    const updatedUser = await base44.auth.updateMe({
      ...residentialForm,
      address,
      address_lat: coords.lat,
      address_lng: coords.lng,
      address_confirmation_status: "confirmed",
    });
    setUser(updatedUser);
    setSaving(false);
    setStep(3);
  };

  const createVendorAccount = async () => {
    if (!businessForm.business_name.trim() || !businessForm.business_category.trim() || !EIN_PATTERN.test(businessForm.business_tax_id.trim())) {
      toast.error("Business name, category, and EIN/Tax ID in 12-3456789 format are required.");
      return;
    }

    setSaving(true);
    try {
      const response = await base44.functions.invoke("createPublicVendorAccount", {
        businessForm,
        organizerType,
      });
      const account = response?.data?.account;
      if (!account) {
        const message = response?.data?.error || "Could not create your Vendor Account right now.";
        toast.error(message);
        setSaving(false);
        return;
      }
      if (getPreferredExperience() !== EVENTS_EXPERIENCE && window.confirm("Make Yardit Events your default experience for organizer tools?")) {
        setPreferredExperience(EVENTS_EXPERIENCE);
      } else if (getPreferredExperience() === EVENTS_EXPERIENCE) {
        setPreferredExperience(EVENTS_EXPERIENCE);
      }
      setCreatedAccount(account);
      setSaving(false);
      setStep(4);
      toast.success("Organizer account created on the Free tier.");
    } catch (error) {
      setSaving(false);
      const message = error?.response?.data?.error || error?.message || "Could not create your Vendor Account right now.";
      toast.error(message);
    }
  };

  if (loading) {
    return <div className="min-h-[70vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#5DADA5]" /></div>;
  }

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F3E6CF] px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <Card className="rounded-3xl border-2 border-[#2C4F4E]/20 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[#5DADA5]/10 p-3"><Building2 className="h-6 w-6 text-[#2C4F4E]" /></div>
              <div>
                <CardTitle className="text-2xl text-[#2C4F4E]">Create Vendor Account</CardTitle>
                <p className="mt-1 text-sm text-slate-600">Vendor accounts are intended for businesses, organizations, event hosts, and active vendors.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-slate-500">
              {["Account", "Residential", "Business", "Setup"].map((label, index) => (
                <div key={label} className={`rounded-full px-2 py-2 text-center ${step >= index + 1 ? "bg-[#5DADA5] text-white" : "bg-slate-100"}`}>{label}</div>
              ))}
            </div>

            {/* Account claim flow for admin-pre-created accounts */}
            {step === 1 && claimableAccounts.length > 0 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#5DADA5]/40 bg-[#5DADA5]/5 p-4">
                  <div className="flex items-start gap-3">
                    <Store className="h-5 w-5 text-[#5DADA5] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-[#2C4F4E]">A vendor account already exists for your email</p>
                      <p className="mt-1 text-sm text-slate-600">An account was pre-created for <strong>{user?.email}</strong>. Claim it to get immediate access to the Vendor Dashboard.</p>
                    </div>
                  </div>
                </div>
                {claimableAccounts.map((acct) => (
                  <div key={acct.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#2C4F4E]">{acct.business_name}</p>
                      <p className="text-xs text-slate-500">{acct.business_category || "Vendor Account"} · {(acct.vendor_tier || "free").replace("_", " ")} tier</p>
                    </div>
                    <Button onClick={() => handleClaimAccount(acct)} disabled={claiming} className="shrink-0 bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635] font-semibold">
                      {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim Account"}
                    </Button>
                  </div>
                ))}
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-500 mb-2">Want to create a different account instead?</p>
                  <Button variant="outline" onClick={() => setStep(2)} className="w-full rounded-xl text-slate-600">Create a New Vendor Account</Button>
                </div>
              </div>
            )}

            {step === 1 && claimableAccounts.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-[#2C4F4E]">Basic account info</p>
                  <p className="mt-1 text-sm text-slate-600">You'll use the same Yardit login for residential listings and vendor features.</p>
                  <p className="mt-3 text-sm text-slate-700"><strong>Email:</strong> {user.email}</p>
                </div>
                <Button onClick={() => setStep(2)} className="w-full rounded-xl bg-[#5DADA5] hover:bg-[#4A9B93]">Continue</Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#F4A849]/40 bg-[#FFF7E8] p-4 text-sm text-[#2C4F4E]">
                  <div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p>Residential Address is used for residential Yard Sales and Neighborhood Sales. Please do not use your business address unless it is also your home address. This address may become locked for residential listing validation.</p></div>
                </div>
                <div className="rounded-2xl border p-4">
                  <div className="mb-4 flex items-center gap-2"><MapPin className="h-4 w-4 text-[#5DADA5]" /><Label className="font-bold text-[#2C4F4E]">Residential Address</Label></div>
                  <div className="space-y-4"><AddressFields formData={residentialForm} setFormData={setResidentialForm} /></div>
                </div>
                <Button onClick={saveResidentialAddress} disabled={saving} className="w-full rounded-xl bg-[#5DADA5] hover:bg-[#4A9B93]">{saving ? "Confirming..." : "Confirm Residential Address"}</Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2"><Label>Business Name *</Label><Input value={businessForm.business_name} onChange={(e) => setBusinessForm({ ...businessForm, business_name: e.target.value })} placeholder="Business or organization name" /></div>
                  <div className="space-y-2"><Label>Business Category *</Label><Input value={businessForm.business_category} onChange={(e) => setBusinessForm({ ...businessForm, business_category: e.target.value })} placeholder="Food truck, nonprofit, event host..." /></div>
                  <div className="space-y-2"><Label>EIN / 501(c)(3) / Tax ID *</Label><Input value={businessForm.business_tax_id} onChange={(e) => setBusinessForm({ ...businessForm, business_tax_id: e.target.value })} placeholder="12-3456789" /></div>
                  <div className="space-y-2 sm:col-span-2"><Label>Business Description</Label><Input value={businessForm.description} onChange={(e) => setBusinessForm({ ...businessForm, description: e.target.value })} placeholder="What do you offer?" /></div>
                  <div className="space-y-2 sm:col-span-2"><Label>Website</Label><Input value={businessForm.website} onChange={(e) => setBusinessForm({ ...businessForm, website: e.target.value })} placeholder="https://example.com" /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={businessForm.phone} onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })} placeholder="Business phone" /></div>
                  <div className="space-y-2"><Label>Instagram</Label><Input value={businessForm.instagram_url} onChange={(e) => setBusinessForm({ ...businessForm, instagram_url: e.target.value })} placeholder="Instagram URL" /></div>
                </div>

                <div className="rounded-2xl border p-4">
                  <Label className="mb-4 block font-bold text-[#2C4F4E]">Business Address</Label>
                  <p className="mb-4 text-xs text-slate-500">This is separate from your residential address and may be different.</p>
                  <div className="space-y-4">
                    <AddressFields
                      required={false}
                      formData={{ street_address: businessForm.business_street_address, city: businessForm.business_city, state: businessForm.business_state, zip_code: businessForm.business_zip_code }}
                      setFormData={(updater) => {
                        const next = typeof updater === "function" ? updater({ street_address: businessForm.business_street_address, city: businessForm.business_city, state: businessForm.business_state, zip_code: businessForm.business_zip_code }) : updater;
                        setBusinessForm({ ...businessForm, business_street_address: next.street_address || "", business_city: next.city || "", business_state: next.state || "", business_zip_code: next.zip_code || "" });
                      }}
                    />
                  </div>
                </div>

                <Button onClick={createVendorAccount} disabled={saving} className="w-full rounded-xl bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">{saving ? "Creating..." : "Create Free Vendor Account"}</Button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800"><CheckCircle2 className="mb-2 h-5 w-5" /><p className="font-bold">Complete Your Vendor Setup</p><p className="text-sm">Your vendor account is ready on the Free tier. Finish setup when you're ready.</p></div>
                <VendorSetupProgress
                  account={createdAccount}
                  pins={[]}
                  onStepClick={(setupStep) => navigate(`${dashboardPath}?setupStep=${setupStep.key}&tab=${setupStep.tab}`)}
                  onContinue={() => navigate(`${dashboardPath}?setupStep=business&tab=profile`)}
                />
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button onClick={() => setStep(3)} variant="outline" className="w-full rounded-xl">Back</Button>
                  <Button onClick={() => navigate(`${dashboardPath}?setupStep=business&tab=profile`)} className="w-full rounded-xl bg-[#5DADA5] hover:bg-[#4A9B93]">Next</Button>
                  <Button onClick={() => navigate(dashboardPath)} variant="outline" className="w-full rounded-xl bg-white">Finish Later</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}