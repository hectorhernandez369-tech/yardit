import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { logUserActivity, logUserActivityOncePerSession } from "@/lib/logUserActivity";

export default function GuestEntryModal({ open, onLogin, onGuestEnter }) {
  const [tosChecked, setTosChecked] = useState(false);
  const [showTosError, setShowTosError] = useState(false);
  const [showTosModal, setShowTosModal] = useState(false);

  useEffect(() => {
    if (!open) {
      setTosChecked(false);
      setShowTosError(false);
      return;
    }

    logUserActivityOncePerSession(`yardit_guest_entry_started_${window.location.pathname}`, {
      event_type: "guest_entry_started",
      event_label: "Guest Entry Started",
      target_type: "guest_session",
      source_page: window.location.pathname,
    }).catch(() => null);
  }, [open]);

  useEffect(() => {
    if (!showTosModal) return;

    logUserActivity({
      event_type: "terms_viewed",
      event_label: "Terms Viewed",
      target_type: "terms",
      source_page: window.location.pathname,
      details_json: { context: "guest_entry" },
    }).catch(() => null);
  }, [showTosModal]);

  const handleGuestContinue = () => {
    if (!tosChecked) {
      setShowTosError(true);
      return;
    }

    logUserActivity({
      event_type: "guest_terms_accepted",
      event_label: "Guest Terms Accepted",
      target_type: "terms",
      source_page: window.location.pathname,
      details_json: { context: "guest_entry" },
    }).catch(() => null);

    onGuestEnter?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle>Welcome to Yardit</DialogTitle>
            <DialogDescription>
              Log in or sign up for the full experience, or continue as a guest to browse public listings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button onClick={onLogin} className="w-full">
              Log In / Sign Up
            </Button>

            <div className="rounded-lg border border-slate-200 p-4 space-y-3 bg-slate-50">
              <label className="flex items-start gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tosChecked}
                  onChange={(e) => {
                    setTosChecked(e.target.checked);
                    if (e.target.checked) setShowTosError(false);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setShowTosModal(true)}
                    className="underline"
                  >
                    Terms of Service
                  </button>
                </span>
              </label>

              {showTosError && (
                <p className="text-xs text-red-600">You must agree to the Terms of Service to continue as a guest.</p>
              )}

              <Button onClick={handleGuestContinue} variant="outline" className="w-full text-slate-700">
                Continue as Guest
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTosModal} onOpenChange={setShowTosModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Terms of Service placeholder — full text coming soon.</p>
        </DialogContent>
      </Dialog>
    </>
  );
}