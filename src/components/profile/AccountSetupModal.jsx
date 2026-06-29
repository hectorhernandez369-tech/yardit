import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { COMMUNITY_GUIDELINES_VERSION, PRIVACY_VERSION, TERMS_VERSION, hasConfirmedAddress, isAccountSetupComplete } from "@/lib/accountSetup";
import { createPageUrl } from "@/utils";
import SetupAddressVerification from "@/components/profile/SetupAddressVerification";

export default function AccountSetupModal({ user, setUser }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    terms_accepted: false,
    privacy_accepted: false,
    community_guidelines_accepted: false,
    address_verified: false,
    address_payload: {},
  });

  useEffect(() => {
    if (!user?.id) {
      setOpen(false);
      return;
    }

    if (!isAccountSetupComplete(user)) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
        terms_accepted: user.terms_accepted === true && user.terms_version === TERMS_VERSION,
        privacy_accepted: user.privacy_accepted === true && user.privacy_version === PRIVACY_VERSION,
        community_guidelines_accepted: user.community_guidelines_accepted === true && user.community_guidelines_version === COMMUNITY_GUIDELINES_VERSION,
        address_verified: hasConfirmedAddress(user),
        address_payload: {},
      });
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [user]);

  const requirementsMet = Boolean(
    formData.first_name.trim() &&
    formData.last_name.trim() &&
    formData.terms_accepted &&
    formData.privacy_accepted &&
    formData.community_guidelines_accepted &&
    formData.address_verified
  );

  const saveSetup = async (includePhone, redirectToProfile = false) => {
    if (!requirementsMet) return;

    setSaving(true);
    const now = new Date().toISOString();
    const payload = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      terms_accepted: true,
      terms_accepted_at: now,
      terms_version: TERMS_VERSION,
      privacy_accepted: true,
      privacy_accepted_at: now,
      privacy_version: PRIVACY_VERSION,
      community_guidelines_accepted: true,
      community_guidelines_accepted_at: now,
      community_guidelines_version: COMMUNITY_GUIDELINES_VERSION,
      ...formData.address_payload,
    };

    if (includePhone && formData.phone.trim()) {
      payload.phone = formData.phone.trim();
      payload.phone_number = formData.phone.trim();
    }

    const updatedUser = await base44.auth.updateMe(payload);
    setUser?.(updatedUser);
    setOpen(false);
    setSaving(false);
    toast.success("Profile completed successfully.");
    if (redirectToProfile) {
      navigate(createPageUrl("Profile"));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-hidden border border-slate-200/80 bg-white p-0 shadow-2xl shadow-slate-950/20 [&>button]:hidden flex flex-col">
          <div className="bg-gradient-to-br from-[#2C4F4E] via-[#36706C] to-[#5DADA5] px-6 py-5 text-white">
            <div className="mb-4 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
              Step 1 complete: Sign-in verified
            </div>
            <DialogHeader>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                <img 
                  src="https://media.base44.com/images/public/690f554506edf795e5d84121/e68545fc5_file_00000000f5dc71f5a5c8b2e79fd116b0.png" 
                  alt="Yardit Logo" 
                  className="h-10 w-10 object-contain"
                />
              </div>
              <DialogTitle className="text-center text-2xl font-semibold tracking-tight text-white">Step 2: Finish Your Yardit Profile</DialogTitle>
              <DialogDescription className="text-center text-slate-200">
                You’re already signed in. This quick profile step helps keep Yardit trusted and safe.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-6 py-6 flex-1 min-h-0 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="setup_first_name">First Name *</Label>
                <Input
                  id="setup_first_name"
                  value={formData.first_name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, first_name: event.target.value }))}
                  placeholder="First name"
                  className="h-11 border-slate-200 bg-slate-50/70 focus-visible:ring-[#2C4F4E]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setup_last_name">Last Name *</Label>
                <Input
                  id="setup_last_name"
                  value={formData.last_name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, last_name: event.target.value }))}
                  placeholder="Last name"
                  className="h-11 border-slate-200 bg-slate-50/70 focus-visible:ring-[#2C4F4E]"
                />
              </div>
            </div>

            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
              Add the profile details Yardit needs after sign-in so buyers, sellers, vendors, and event organizers can trust each other.
            </p>

            <SetupAddressVerification
              user={user}
              isVerified={formData.address_verified}
              onVerified={(addressPayload) => setFormData((prev) => ({ ...prev, address_verified: true, address_payload: addressPayload }))}
            />

            <div className="space-y-1.5">
              <Label htmlFor="setup_phone">Phone Number <span className="font-normal text-slate-500">(optional)</span></Label>
              <Input
                id="setup_phone"
                type="tel"
                value={formData.phone}
                onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="(555) 123-4567"
                className="bg-white"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3 shadow-inner shadow-slate-200/40">
              <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
                <Checkbox
                  checked={formData.terms_accepted}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, terms_accepted: checked === true }))}
                  className="mt-0.5"
                />
                <span>I agree to the Terms of Service</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
                <Checkbox
                  checked={formData.privacy_accepted}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, privacy_accepted: checked === true }))}
                  className="mt-0.5"
                />
                <span>I acknowledge the Privacy Policy</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
                <Checkbox
                  checked={formData.community_guidelines_accepted}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, community_guidelines_accepted: checked === true }))}
                  className="mt-0.5"
                />
                <span>I agree to the Community Guidelines</span>
              </label>
              <div className="flex flex-wrap gap-3 text-xs">
                <Link to="/terms" target="_blank" className="font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4 hover:text-[#2C4F4E]">View Terms of Service</Link>
                <Link to="/privacy" target="_blank" className="font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4 hover:text-[#2C4F4E]">View Privacy Policy</Link>
                <Link to="/community-guidelines" target="_blank" className="font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4 hover:text-[#2C4F4E]">View Community Guidelines</Link>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={() => saveSetup(true, true)}
                disabled={!requirementsMet || saving}
                className="h-11 w-full rounded-xl bg-slate-950 font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Finish Step 2
              </Button>
              <Button
                onClick={() => saveSetup(false)}
                disabled={!requirementsMet || saving}
                variant="outline"
                className="h-11 w-full rounded-xl border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Finish Step 2 — Add Phone Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}