import React, { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DeleteAccountDialog({ open, onOpenChange, onDeleted }) {
  const [step, setStep] = useState("warning");
  const [password, setPassword] = useState("");
  const [understandsPermanent, setUnderstandsPermanent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setStep("warning");
    setPassword("");
    setUnderstandsPermanent(false);
    setSaving(false);
    setError("");
  };

  const close = (value) => {
    onOpenChange(value);
    if (!value) reset();
  };

  const handleDelete = async () => {
    setSaving(true);
    setError("");
    const response = await base44.functions.invoke("deleteAccount", {
      passwordConfirmed: password.trim().length > 0,
      understandsPermanent,
    });
    if (!response?.data?.success) {
      setError(response?.data?.error || "Account deletion could not be completed.");
      setSaving(false);
      return;
    }
    onDeleted?.();
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            {step === "warning" ? "Delete Account" : "Are you absolutely sure?"}
          </DialogTitle>
          <DialogDescription>
            {step === "warning"
              ? "Review what account deletion affects before continuing."
              : "Confirm that you understand this deletion may be permanent."}
          </DialogDescription>
        </DialogHeader>

        {step === "warning" ? (
          <div className="space-y-4 text-sm text-slate-700">
            <p>Deleting your account may remove or disable profile information, saved listings, notification preferences, push subscriptions, active sessions, and access to owned listings, events, or vendor tools where applicable.</p>
            <p>Some records may still be retained when required for payment records, fraud prevention, safety reports, support history, legal compliance, dispute resolution, or audit logs.</p>
            <div className="space-y-2">
              <Label htmlFor="delete-password">Enter your password to continue</Label>
              <Input
                id="delete-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
              />
              <p className="text-xs text-slate-500">Your active Yardit session authorizes the request; the password is not stored.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
              <Button className="bg-red-600 text-white hover:bg-red-700" disabled={!password.trim()} onClick={() => setStep("final")}>Continue</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm text-slate-700">
            <p>This will safely deactivate your Yardit account, hide eligible public content, disable push subscriptions, and log you out.</p>
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
              <Checkbox id="understand-delete" checked={understandsPermanent} onCheckedChange={(checked) => setUnderstandsPermanent(checked === true)} />
              <Label htmlFor="understand-delete" className="leading-5 text-red-900">I understand account deletion may be permanent and some records may be retained for compliance, safety, payment, support, legal, dispute, fraud prevention, or audit purposes.</Label>
            </div>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("warning")} disabled={saving}>Back</Button>
              <Button className="bg-red-600 text-white hover:bg-red-700" disabled={!understandsPermanent || saving} onClick={handleDelete}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete Account
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}