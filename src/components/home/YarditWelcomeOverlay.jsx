import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Link } from "react-router-dom";
import { CheckCircle2, MapPin, ShieldCheck, Sparkles } from "lucide-react";
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

  const handleContinue = () => {
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
          aria-describedby="yardit-welcome-description"
          className="fixed left-1/2 top-1/2 z-[5001] w-[calc(100vw-1rem)] max-w-xl max-h-[calc(100dvh-var(--yardit-safe-area-top)-var(--yardit-safe-area-bottom)-0.75rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[1.5rem] border border-white/55 bg-white/90 p-3 pb-[calc(0.75rem+var(--yardit-safe-area-bottom))] text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.32)] outline-none backdrop-blur-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 sm:p-5 sm:pb-5"
        >
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#F4A849]/40 bg-gradient-to-br from-[#2C4F4E] to-[#5DADA5] shadow-md shadow-[#2C4F4E]/20 sm:h-14 sm:w-14">
              <img
                src="https://media.base44.com/images/public/690f554506edf795e5d84121/e68545fc5_file_00000000f5dc71f5a5c8b2e79fd116b0.png"
                alt="Yardit"
                className="h-9 w-9 object-contain sm:h-10 sm:w-10"
              />
            </div>

            <DialogPrimitive.Title id="yardit-welcome-title" className="text-3xl font-black tracking-tight text-[#2C4F4E] sm:text-4xl">
              Welcome to Yardit
            </DialogPrimitive.Title>
            <p className="mt-1 text-sm font-bold leading-snug text-slate-950 sm:text-base">
              Find sales. Host events. Discover hidden treasures in your community.
            </p>
            <DialogPrimitive.Description id="yardit-welcome-description" className="mt-2 text-xs leading-5 text-slate-700 sm:text-sm">
              Whether you're holding a yard sale, organizing a neighborhood sale, hosting a residential event, or searching for great local deals, Yardit makes it easy to connect with your community.
            </DialogPrimitive.Description>
          </div>

          <div className="mt-3 rounded-2xl border border-[#5DADA5]/25 bg-white/78 p-3 text-left shadow-sm sm:mt-4 sm:p-4">
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {[
                "Create Yard Sales",
                "Join Neighborhood Sales",
                "Host Residential Events",
                "Discover Local Sales",
                "Save Favorites and Receive Notifications",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-xs font-semibold leading-5 text-slate-700 sm:text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5DADA5]" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#F4A849]/30 bg-[#F4A849]/8 p-2.5 sm:gap-3 sm:p-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F4A849]/18 text-[#2C4F4E]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <p className="text-[11px] leading-4 text-slate-700 sm:text-xs sm:leading-5">
                Your account information is used only to create and secure your Yardit account. Your information is never sold or shared with third parties.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[11px] font-semibold text-slate-500 sm:mt-4 sm:text-xs">
            <Link to="/privacy" className="hover:text-[#2C4F4E] hover:underline">Privacy Policy</Link>
            <span aria-hidden="true">•</span>
            <Link to="/terms" className="hover:text-[#2C4F4E] hover:underline">Terms of Service</Link>
            <span aria-hidden="true">•</span>
            <button
              type="button"
              onClick={dismissForPageView}
              className="font-semibold underline-offset-4 hover:text-[#2C4F4E] hover:underline focus:outline-none focus:ring-2 focus:ring-[#5DADA5] focus:ring-offset-2"
            >
              Maybe Later
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              onClick={handleContinue}
              className="h-10 rounded-xl bg-[#2C4F4E] text-sm font-black text-white shadow-md shadow-[#2C4F4E]/20 hover:bg-[#244140] sm:h-11 sm:text-base"
            >
              Continue
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={dismissForPageView}
              className="h-10 rounded-xl border-[#5DADA5]/45 bg-white/70 text-sm font-black text-[#2C4F4E] hover:bg-[#5DADA5]/10 sm:h-11 sm:text-base"
            >
              <MapPin className="h-4 w-4" />
              Explore as Guest
            </Button>
          </div>

          <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-full bg-[#F4A849]/15 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-20 rounded-full bg-[#5DADA5]/15 blur-2xl" />
          <Sparkles className="pointer-events-none absolute right-4 top-4 h-4 w-4 text-[#F4A849]" aria-hidden="true" />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}