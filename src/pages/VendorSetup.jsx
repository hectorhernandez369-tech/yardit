import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import VendorSetupProgress from "@/components/vendor/VendorSetupProgress";
import { VENDOR_SETUP_STEPS, getFirstIncompleteSetupIndex, getVendorSetupProgress, getVendorSetupDashboardStepUrl } from "@/lib/vendorSetup";

export default function VendorSetup() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const requestedStep = urlParams.get("step");
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ["vendorSetupUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: accounts = [], isLoading: loadingAccount } = useQuery({
    queryKey: ["vendorSetupAccount", user?.id, user?.email],
    queryFn: async () => {
      const byId = await base44.entities.VendorAccount.filter({ owner_user_id: user.id });
      if (byId.length) return byId;
      return base44.entities.VendorAccount.filter({ owner_user_id: user.email });
    },
    enabled: !!user?.id,
  });

  const account = accounts.find((item) => item.is_active !== false) || accounts[0];

  const { data: pins = [], isLoading: loadingPins } = useQuery({
    queryKey: ["vendorSetupPins", account?.id],
    queryFn: () => base44.entities.VendorPin.filter({ vendor_account_id: account.id }, "-created_date"),
    enabled: !!account?.id,
  });

  const progress = useMemo(() => getVendorSetupProgress(account, pins), [account, pins]);

  useEffect(() => {
    if (!account?.id) return;
    const requestedIndex = VENDOR_SETUP_STEPS.findIndex((step) => step.key === requestedStep);
    setActiveIndex(requestedIndex >= 0 ? requestedIndex : getFirstIncompleteSetupIndex(account, pins));
  }, [account?.id, pins.length, requestedStep]);

  const activeStep = VENDOR_SETUP_STEPS[activeIndex] || VENDOR_SETUP_STEPS[0];
  const loading = loadingUser || loadingAccount || loadingPins;

  const openActiveStep = () => {
    navigate(getVendorSetupDashboardStepUrl(activeStep.key));
  };

  const goNext = () => {
    setActiveIndex((index) => Math.min(index + 1, VENDOR_SETUP_STEPS.length - 1));
  };

  const goBack = () => {
    setActiveIndex((index) => Math.max(index - 1, 0));
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#5DADA5]" /></div>;
  }

  if (!account) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <Card className="rounded-3xl"><CardContent className="p-8 text-center"><p className="font-bold text-[#2C4F4E]">No vendor account found.</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F3E6CF] px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl space-y-4 sm:space-y-5">
        <div>
          <h1 className="text-2xl font-black text-[#2C4F4E] sm:text-3xl">Vendor Setup</h1>
          <p className="mt-1 text-sm text-slate-700">Follow the checklist now, or finish later from your dashboard.</p>
        </div>

        <VendorSetupProgress account={account} pins={pins} onContinue={openActiveStep} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {VENDOR_SETUP_STEPS.map((step, index) => {
            const complete = progress.completed[step.key];
            const selected = index === activeIndex;
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`rounded-2xl border bg-white p-3 text-left shadow-sm transition hover:border-[#5DADA5] ${selected ? "border-[#5DADA5] ring-2 ring-[#5DADA5]/20" : "border-[#2C4F4E]/15"}`}
              >
                <div className="flex items-start gap-2">
                  {complete ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#2C4F4E]">{index + 1}. {step.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{complete ? "Complete" : step.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Card className="rounded-3xl border-[#2C4F4E]/15 bg-white shadow-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-[#2C4F4E]">{activeStep.title}</CardTitle>
            <p className="text-sm text-slate-600">{activeStep.description}</p>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
            <Button onClick={openActiveStep} className="w-full rounded-xl bg-[#5DADA5] hover:bg-[#4A9B93] sm:w-auto">Open this step</Button>
            <div className="grid gap-2 sm:flex sm:justify-between">
              <Button onClick={goBack} disabled={activeIndex === 0} variant="outline" className="w-full rounded-xl sm:w-auto">Back</Button>
              <div className="grid gap-2 sm:flex">
                <Button onClick={() => navigate("/VendorDashboard")} variant="outline" className="w-full rounded-xl sm:w-auto">Finish Later</Button>
                <Button onClick={goNext} disabled={activeIndex === VENDOR_SETUP_STEPS.length - 1} className="w-full rounded-xl bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635] sm:w-auto">Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}