import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PRIVACY_VERSION, TERMS_VERSION, isAccountSetupComplete } from "@/lib/accountSetup";
import { createPageUrl } from "@/utils";

export default function AccountSetupModal({ user, setUser }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    terms_accepted: false,
    privacy_accepted: false,
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
    formData.privacy_accepted
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
            <DialogHeader>
              <img 
                src="https://media.base44.com/images/public/690f554506edf795e5d84121/e68545fc5_file_00000000f5dc71f5a5c8b2e79fd116b0.png" 
                alt="Yardit Logo" 
                className="mx-auto mb-3 h-14 w-14 object-contain"
              />
              <DialogTitle className="text-center text-2xl font-semibold tracking-tight text-white">Secure Account Setup</DialogTitle>
              <DialogDescription className="text-center text-slate-300">
                Confirm your identity details to protect the Yardit marketplace.
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
              Your name helps build trust between buyers, sellers, vendors, and event organizers on Yardit.
            </p>

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
              <div className="flex flex-wrap gap-3 text-xs">
                <button type="button" onClick={() => setShowTerms((prev) => !prev)} className="font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4 hover:text-[#2C4F4E]">View Terms of Service</button>
                <button type="button" onClick={() => setShowPrivacy((prev) => !prev)} className="font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4 hover:text-[#2C4F4E]">View Privacy Policy</button>
              </div>
              {showTerms && (
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 shadow-sm">
                  Terms of Service content will appear here when finalized.
                </div>
              )}
              {showPrivacy && (
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 shadow-sm">
                  Privacy Policy content will appear here when finalized.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={() => saveSetup(true, true)}
                disabled={!requirementsMet || saving}
                className="h-11 w-full rounded-xl bg-slate-950 font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Complete Profile Now
              </Button>
              <Button
                onClick={() => saveSetup(false)}
                disabled={!requirementsMet || saving}
                variant="outline"
                className="h-11 w-full rounded-xl border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Complete Profile Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}