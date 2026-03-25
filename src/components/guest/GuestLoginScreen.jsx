import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { setGuestMode } from "@/lib/guestMode";
import { base44 } from "@/api/base44Client";

export default function GuestLoginScreen({ onGuestEnter }) {
  const [tosChecked, setTosChecked] = useState(false);
  const [showTosError, setShowTosError] = useState(false);
  const [showTosModal, setShowTosModal] = useState(false);

  const handleGuestContinue = () => {
    if (!tosChecked) {
      setShowTosError(true);
      return;
    }
    setGuestMode();
    onGuestEnter();
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="w-full max-w-md mx-4 bg-white border border-slate-200 rounded-xl shadow-lg p-8 flex flex-col items-center gap-6">
        {/* Logo / Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-[#5DADA5] rounded-xl flex items-center justify-center shadow-sm">
             <span className="text-2xl font-bold text-white tracking-widest font-[cursive]">Y</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Welcome to Yardit</h1>
          <p className="text-sm text-slate-500 text-center">
            Sign in to create sales, save your hunt, and more.
          </p>
        </div>

        {/* Primary Login/Signup Action */}
        <div className="w-full flex flex-col gap-3">
          <Button
            onClick={handleLogin}
            className="w-full h-11 bg-[#5DADA5] hover:bg-[#4A9B93] text-white font-semibold text-base shadow-sm"
          >
            Log In / Sign Up
          </Button>
        </div>

        {/* Divider */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Guest Action Area */}
        <div className="w-full flex flex-col gap-3">
          <label className="flex items-start gap-2 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={tosChecked}
              onChange={(e) => {
                setTosChecked(e.target.checked);
                if (e.target.checked) setShowTosError(false);
              }}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#5DADA5] focus:ring-[#5DADA5] cursor-pointer"
            />
            <span className="text-sm text-slate-600">
              I agree to the{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowTosModal(true);
                }}
                className="underline text-[#5DADA5] hover:text-[#4A9B93] font-medium"
              >
                Terms of Service
              </button>
            </span>
          </label>

          {showTosError && (
            <p className="text-xs text-red-500 font-medium pl-6">
              You must agree to the Terms of Service to continue.
            </p>
          )}

          <Button
            onClick={handleGuestContinue}
            variant="outline"
            className="w-full h-11 border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
          >
            Continue as Guest
          </Button>
        </div>
      </div>

      {/* ToS Placeholder Modal */}
      <Dialog open={showTosModal} onOpenChange={setShowTosModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <p className="text-slate-600 text-sm">
              Terms of Service placeholder — full text coming soon.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}