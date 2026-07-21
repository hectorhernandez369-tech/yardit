import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Link } from "react-router-dom";
import { MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

export default function YarditWelcomeOverlay() {
  const { isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoadingAuth) return;
    setOpen(!isAuthenticated);
  }, [isAuthenticated, isLoadingAuth]);

  const dismissForPageView = () => {
    setOpen(false);
  };

  const continueWithGoogle = () => {
    navigateToLogin?.(window.location.href);
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) dismissForPageView();
        else setOpen(true);
      }}
      modal
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[5000] bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          aria-labelledby="yardit-welcome-title"
          aria-describedby="yardit-welcome-description yardit-google-signin-description"
          className="fixed left-1/2 top-1/2 z-[5001] w-[calc(100vw-1.5rem)] max-w-2xl max-h-[calc(100dvh-var(--yardit-safe-area-top)-var(--yardit-safe-area-bottom)-1rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[2rem] border border-white/55 bg-white/90 p-5 pb-[calc(1.25rem+var(--yardit-safe-area-bottom))] text-slate-900 shadow-[0_28px_90px_rgba(15,23,42,0.35)] outline-none backdrop-blur-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 sm:p-8 sm:pb-8"
        >
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#F4A849]/40 bg-gradient-to-br from-[#2C4F4E] to-[#5DADA5] shadow-lg shadow-[#2C4F4E]/20">
              <img
                src="https://media.base44.com/images/public/690f554506edf795e5d84121/e68545fc5_file_00000000f5dc71f5a5c8b2e79fd116b0.png"
                alt="Yardit"
                className="h-12 w-12 object-contain"
              />
            </div>

            <DialogPrimitive.Title id="yardit-welcome-title" className="text-4xl font-black tracking-tight text-[#2C4F4E] sm:text-5xl">
              Yardit
            </DialogPrimitive.Title>
            <p className="mt-3 text-xl font-black leading-tight text-slate-950 sm:text-2xl">
              Find Yard Sales.<br />
              Discover Local Events.<br />
              Join the Hunt.
            </p>
            <DialogPrimitive.Description id="yardit-welcome-description" className="mt-4 text-sm leading-6 text-slate-700 sm:text-base">
              Yardit helps people discover and promote yard sales, neighborhood sales, estate sales, vendor events, and community events through an interactive local map.
            </DialogPrimitive.Description>
          </div>

          <div className="mt-6 rounded-3xl border border-[#5DADA5]/25 bg-white/78 p-4 text-left shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F4A849]/18 text-[#2C4F4E]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-3">
                <h2 className="text-base font-black text-[#2C4F4E]">Google Sign-In</h2>
                <p id="yardit-google-signin-description" className="text-sm leading-6 text-slate-700">
                  Sign in with Google to securely create your Yardit account, manage listings, save favorites, participate in community events, and personalize your experience.
                </p>
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 sm:text-sm">
                  Yardit only accesses the basic Google account information required to identify your account: name, email address, and profile picture. Yardit does NOT access Gmail, Google Drive, Contacts, Calendar, or other Google services.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              onClick={continueWithGoogle}
              className="h-12 rounded-2xl bg-[#2C4F4E] text-base font-black text-white shadow-lg shadow-[#2C4F4E]/20 hover:bg-[#244140]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-black text-[#2C4F4E]">G</span>
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={dismissForPageView}
              className="h-12 rounded-2xl border-[#5DADA5]/45 bg-white/70 text-base font-black text-[#2C4F4E] hover:bg-[#5DADA5]/10"
            >
              <MapPin className="h-4 w-4" />
              Explore as Guest
            </Button>
          </div>

          <div className="mt-5 flex flex-col items-center gap-3 text-center">
            <button
              type="button"
              onClick={dismissForPageView}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-500 underline-offset-4 hover:text-[#2C4F4E] hover:underline focus:outline-none focus:ring-2 focus:ring-[#5DADA5] focus:ring-offset-2"
            >
              Maybe Later
            </button>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
              <Link to="/privacy" className="hover:text-[#2C4F4E] hover:underline">Privacy Policy</Link>
              <span aria-hidden="true">•</span>
              <Link to="/terms" className="hover:text-[#2C4F4E] hover:underline">Terms of Service</Link>
            </div>
          </div>

          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#F4A849]/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-[#5DADA5]/20 blur-2xl" />
          <Sparkles className="pointer-events-none absolute right-6 top-6 h-5 w-5 text-[#F4A849]" aria-hidden="true" />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}