import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ExternalLink } from "lucide-react";
import CompactVendorHeader from "@/components/vendor/CompactVendorHeader";
import MyTrucksSection from "@/components/vendor/MyTrucksSection";
import VendorBillingTab from "@/components/vendor/VendorBillingTab";
import VendorUsersTab from "@/components/vendor/VendorUsersTab";
import VendorBusinessPage from "@/components/vendor/VendorBusinessPage";
import VendorPinHistoryTab from "@/components/vendor/VendorPinHistoryTab";
import VendorSetupProgress from "@/components/vendor/VendorSetupProgress";
import VendorEventsTab from "@/components/vendor/events/VendorEventsTab";
import VendorAccessDenied from "@/components/vendor/VendorAccessDenied";
import { getVendorSetupProgress, getVendorSetupStepUrl } from "@/lib/vendorSetup";
import { getUserVendorAccounts } from "@/lib/getUserVendorAccounts";

export default function VendorDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const requestedTab = urlParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(requestedTab);
  const [showSetupReminder, setShowSetupReminder] = useState(true);
  // Multi-business: which account is currently active
  const [activeAccountId, setActiveAccountId] = useState(null);

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ["vendorDashboardUser"],
    queryFn: () => base44.auth.me(),
  });

  // Use shared helper for consistent account detection
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["vendorDashboardAccounts", user?.id, user?.email],
    queryFn: () => getUserVendorAccounts(user),
    enabled: !!user?.id || !!user?.email,
  });

  // Set active account: prefer URL param, then previously selected, then first
  // Also clears stale selection if account is no longer accessible
  useEffect(() => {
    if (loadingAccounts) return;
    if (!accounts.length) {
      setActiveAccountId(null);
      return;
    }
    const paramId = new URLSearchParams(window.location.search).get("account");
    if (paramId && accounts.find((a) => a.id === paramId)) {
      setActiveAccountId(paramId);
    } else if (activeAccountId && accounts.find((a) => a.id === activeAccountId)) {
      // keep current selection — still valid
    } else {
      // stale or unset — fall back to first accessible account
      setActiveAccountId(accounts[0].id);
    }
  }, [accounts, loadingAccounts]);

  const account = accounts.find((a) => a.id === activeAccountId) || accounts[0] || null;

  const isOwner = !!account && (
    account.owner_user_id === user?.id ||
    account.owner_user_id === user?.email ||
    account.owner_email === user?.email
  );

  const { data: pins = [] } = useQuery({
    queryKey: ["vendorDashboardPins", account?.id],
    queryFn: () => base44.entities.VendorPin.filter({ vendor_account_id: account.id }, "-created_date"),
    enabled: !!account?.id,
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ["vendorDashboardCheckIns", account?.id],
    queryFn: () => base44.entities.VendorPinCheckIn.filter({ vendor_account_id: account.id }, "-created_date"),
    enabled: !!account?.id,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["vendorDashboardUsers", account?.id],
    queryFn: () => base44.entities.VendorAuthorizedUser.filter({ vendor_account_id: account.id }, "-created_date"),
    enabled: !!account?.id,
  });

  const { data: updates = [] } = useQuery({
    queryKey: ["vendorDashboardUpdates", account?.id],
    queryFn: () => base44.entities.VendorUpdate.filter({ vendor_account_id: account.id }, "-created_date"),
    enabled: !!account?.id,
  });

  const refreshDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardAccounts"] });
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardPins"] });
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardCheckIns"] });
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardUsers"] });
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardUpdates"] });
  };

  const setupProgress = getVendorSetupProgress(account, pins);

  useEffect(() => {
    setActiveTab(requestedTab);
  }, [requestedTab]);

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", nextTab);
    navigate(`/VendorDashboard?${params.toString()}`, { replace: true });
  };

  const handleSelectBusiness = (acc) => {
    setActiveAccountId(acc.id);
    navigate(`/VendorDashboard?tab=${activeTab}&account=${acc.id}`, { replace: true });
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardPins", acc.id] });
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardCheckIns", acc.id] });
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardUsers", acc.id] });
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardUpdates", acc.id] });
  };

  // Mark dashboard as entered for setup tracking
  useEffect(() => {
    if (!account?.id || account.setup_dashboard_entered === true) return;
    base44.entities.VendorAccount.update(account.id, {
      setup_dashboard_entered: true,
      vendor_setup_status: setupProgress.isComplete ? "complete" : "in_progress",
    }).then(refreshDashboard);
  }, [account?.id]);

  useEffect(() => {
    if (!account?.id || account.vendor_setup_status === "complete" || !setupProgress.isComplete) return;
    base44.entities.VendorAccount.update(account.id, { vendor_setup_status: "complete" }).then(refreshDashboard);
  }, [account?.id, setupProgress.isComplete]);

  if (loadingUser || loadingAccounts) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A1628]">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4A849]" />
      </div>
    );
  }

  // No vendor access — either no accounts at all, or selected account is no longer accessible
  if (!loadingAccounts && !account) {
    // Clear stale startup preference if user has lost all vendor access
    if (!accounts.length) {
      localStorage.removeItem("yardit_startup_page");
    }
    return <VendorAccessDenied />;
  }

  const activeCheckIn = checkIns.find((item) => item.status === "live" && new Date(item.checkin_end_time) > new Date());
  const activePin = activeCheckIn ? pins.find((pin) => pin.id === activeCheckIn.vendor_pin_id) : null;

  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-[#0A1628]">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="min-w-0">
        {/* Dark professional header */}
        <CompactVendorHeader
          accounts={accounts}
          activeAccount={account}
          activeCheckIn={activeCheckIn}
          activePin={activePin}
          onSwitch={handleSelectBusiness}
        />

        {/* Tabs — dark nav bar */}
        <div className="bg-[#0D1A33] border-b border-[#1A2F4D] sticky top-0 z-30">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            <div className="overflow-x-auto">
              <TabsList className="flex w-max min-w-full bg-transparent p-0 h-auto justify-start rounded-none">
                <TabsTrigger value="profile"  className="min-w-[5.75rem] sm:min-w-[7rem] flex-1 rounded-none px-3 sm:px-4 py-3 text-[11px] sm:text-sm font-medium text-slate-400 hover:text-slate-200 data-[state=active]:text-[#D4A849] data-[state=active]:font-bold data-[state=active]:border-b-2 data-[state=active]:border-[#D4A849] transition-colors">My Page</TabsTrigger>
                <TabsTrigger value="pins"     className="min-w-[7.25rem] sm:min-w-[8.5rem] flex-1 rounded-none px-3 sm:px-4 py-3 text-[11px] sm:text-sm font-medium text-slate-400 hover:text-slate-200 data-[state=active]:text-[#D4A849] data-[state=active]:font-bold data-[state=active]:border-b-2 data-[state=active]:border-[#D4A849] transition-colors">Trucks / Pins</TabsTrigger>
                <TabsTrigger value="events"   className="min-w-[5.25rem] sm:min-w-[7rem] flex-1 rounded-none px-3 sm:px-4 py-3 text-[11px] sm:text-sm font-medium text-slate-400 hover:text-slate-200 data-[state=active]:text-[#D4A849] data-[state=active]:font-bold data-[state=active]:border-b-2 data-[state=active]:border-[#D4A849] transition-colors">Events</TabsTrigger>
                <TabsTrigger value="history"  className="min-w-[5.75rem] sm:min-w-[7rem] flex-1 rounded-none px-3 sm:px-4 py-3 text-[11px] sm:text-sm font-medium text-slate-400 hover:text-slate-200 data-[state=active]:text-[#D4A849] data-[state=active]:font-bold data-[state=active]:border-b-2 data-[state=active]:border-[#D4A849] transition-colors">History</TabsTrigger>
                <TabsTrigger value="tier"     className="min-w-[4.5rem] sm:min-w-[6rem] flex-1 rounded-none px-3 sm:px-4 py-3 text-[11px] sm:text-sm font-medium text-slate-400 hover:text-slate-200 data-[state=active]:text-[#D4A849] data-[state=active]:font-bold data-[state=active]:border-b-2 data-[state=active]:border-[#D4A849] transition-colors">Tier</TabsTrigger>
                <TabsTrigger value="users"    className="min-w-[6.75rem] sm:min-w-[8rem] flex-1 rounded-none px-3 sm:px-4 py-3 text-[11px] sm:text-sm font-medium text-slate-400 hover:text-slate-200 data-[state=active]:text-[#D4A849] data-[state=active]:font-bold data-[state=active]:border-b-2 data-[state=active]:border-[#D4A849] transition-colors">Users</TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="max-w-7xl mx-auto w-full min-w-0 p-3 pb-24 sm:p-5 sm:pb-24 lg:p-8 lg:pb-24 space-y-4 sm:space-y-6">
          {showSetupReminder && !setupProgress.isComplete && (
            <VendorSetupProgress
              account={account}
              pins={pins}
              showDismiss
              onDismiss={() => setShowSetupReminder(false)}
              onContinue={() => {
                const nextStep = setupProgress.remainingSteps[0];
                window.location.href = nextStep ? getVendorSetupStepUrl(nextStep.key) : "/VendorSetup";
              }}
            />
          )}

          {/* Utility row */}
          <div className="flex justify-end">
            <button
              onClick={() => window.open("/events", "_blank")}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#D4A849] transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Events Page (Dev)
            </button>
          </div>

          <TabsContent value="profile" className="mt-0 min-w-0"><VendorBusinessPage account={account} pins={pins} checkIns={checkIns} updates={updates} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="pins" className="mt-0 min-w-0"><MyTrucksSection vendorAccount={account} currentUser={user} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="users" className="mt-0 min-w-0"><VendorUsersTab account={account} users={users} user={user} pins={pins} isOwner={isOwner} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="tier" className="mt-0 min-w-0"><VendorBillingTab account={account} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="events" className="mt-0 min-w-0"><VendorEventsTab account={account} user={user} /></TabsContent>
          <TabsContent value="history" className="mt-0 min-w-0"><VendorPinHistoryTab pins={pins} checkIns={checkIns} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}