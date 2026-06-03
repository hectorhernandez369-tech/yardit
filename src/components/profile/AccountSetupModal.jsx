import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PRIVACY_VERSION, TERMS_VERSION, isAccountSetupComplete } from "@/lib/accountSetup";

export default function AccountSetupModal({ user, setUser }) {
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

  const saveSetup = async (includePhone) => {
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
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-lg bg-[#F3E6CF] border-2 border-[#2C4F4E] [&>button]:hidden">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#5DADA5] text-white shadow-md">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-2xl font-bold text-[#2C4F4E]">Welcome to Yardit</DialogTitle>
            <DialogDescription className="text-center text-slate-700">
              Help us personalize your experience and keep our marketplace safe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="setup_first_name">First Name *</Label>
                <Input
                  id="setup_first_name"
                  value={formData.first_name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, first_name: event.target.value }))}
                  placeholder="First name"
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setup_last_name">Last Name *</Label>
                <Input
                  id="setup_last_name"
                  value={formData.last_name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, last_name: event.target.value }))}
                  placeholder="Last name"
                  className="bg-white"
                />
              </div>
            </div>

            <p className="text-xs text-slate-600">
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

            <div className="rounded-xl border border-[#2C4F4E]/20 bg-white/70 p-4 space-y-3">
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
                <button type="button" onClick={() => setShowTerms((prev) => !prev)} className="text-[#2C4F4E] underline font-medium">View Terms of Service</button>
                <button type="button" onClick={() => setShowPrivacy((prev) => !prev)} className="text-[#2C4F4E] underline font-medium">View Privacy Policy</button>
              </div>
              {showTerms && (
                <div className="rounded-lg bg-[#F3E6CF] border border-[#2C4F4E]/20 p-3 text-xs text-slate-700">
                  Terms of Service content will appear here when finalized.
                </div>
              )}
              {showPrivacy && (
                <div className="rounded-lg bg-[#F3E6CF] border border-[#2C4F4E]/20 p-3 text-xs text-slate-700">
                  Privacy Policy content will appear here when finalized.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={() => saveSetup(true)}
                disabled={!requirementsMet || saving}
                className="w-full bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-semibold disabled:opacity-50"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Complete Profile Now
              </Button>
              <Button
                onClick={() => saveSetup(false)}
                disabled={!requirementsMet || saving}
                variant="outline"
                className="w-full border-[#2C4F4E] text-[#2C4F4E] hover:bg-[#E7D7B8] disabled:opacity-50"
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