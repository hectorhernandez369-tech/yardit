import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import BusinessHero from "@/components/vendor/BusinessHero";
import MobileVendorHeader from "@/components/vendor/MobileVendorHeader";
import MyTrucksSection from "@/components/vendor/MyTrucksSection";
import VendorBillingTab from "@/components/vendor/VendorBillingTab";
import VendorUsersTab from "@/components/vendor/VendorUsersTab";
import VendorPinStatusBar from "@/components/vendor/VendorPinStatusBar";
import VendorBusinessPage from "@/components/vendor/VendorBusinessPage";
import VendorPinHistoryTab from "@/components/vendor/VendorPinHistoryTab";
import VendorSetupProgress from "@/components/vendor/VendorSetupProgress";
import BusinessSelectorBar from "@/components/vendor/BusinessSelectorBar";
import VendorEventsTab from "@/components/vendor/events/VendorEventsTab";
import VendorAccessDenied from "@/components/vendor/VendorAccessDenied";
import { getVendorSetupProgress, getVendorSetupStepUrl } from "@/lib/vendorSetup";
import { getUserVendorAccounts, isLeagueTeamAccount, isVendorDashboardAccount } from "@/lib/getUserVendorAccounts";
import { canAdminPreviewOrganization } from "@/lib/canAdminPreviewOrganization";
import AdminPreviewBanner from "@/components/admin/AdminPreviewBanner";
import { ADMIN_PREVIEW_ENTRY_ACTION, ADMIN_PREVIEW_EXIT_ACTION, createAdminPreviewAuditLog } from "@/lib/adminPreviewAudit";
import { toast } from "sonner";

export default function VendorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(location.search);
  const requestedTab = urlParams.get("tab") || "profile";
  const adminPreviewAccountId = urlParams.get("adminPreview") === "1" ? urlParams.get("account") : null;
  const [activeTab, setActiveTab] = useState(requestedTab);
  const [showSetupReminder, setShowSetupReminder] = useState(true);
  // Multi-business: which account is currently active
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [defaultAccountId, setDefaultAccountId] = useState(null);
  const loggedAdminPreviewEntriesRef = useRef(new Set());

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ["vendorDashboardUser"],
    queryFn: () => base44.auth.me(),
  });
  const canAdminPreview = !!adminPreviewAccountId && canAdminPreviewOrganization(user);

  // Use shared helper for consistent account detection
  const { data: organizerAccounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["vendorDashboardAccounts", user?.id, user?.email, adminPreviewAccountId, canAdminPreview],
    queryFn: () => canAdminPreview
      ? base44.entities.VendorAccount.filter({ id: adminPreviewAccountId })
      : getUserVendorAccounts(user),
    enabled: !!user?.id || !!user?.email,
  });

  const accounts = useMemo(
    () => canAdminPreview ? organizerAccounts : organizerAccounts.filter(isVendorDashboardAccount),
    [canAdminPreview, organizerAccounts]
  );

  const defaultAccountStorageKey = user?.id || user?.email
    ? `yardit_default_vendor_account_id:${user.id || user.email}`
    : "yardit_default_vendor_account_id";

  useEffect(() => {
    setDefaultAccountId(localStorage.getItem(defaultAccountStorageKey));
  }, [defaultAccountStorageKey]);

  useEffect(() => {
    if (loadingAccounts) return;

    const params = new URLSearchParams(location.search);
    const paramId = params.get("account");
    const pendingExplicitAccountId = sessionStorage.getItem("yardit_explicit_organizer_account_id");
    const isExplicitAccountParam = !!paramId && (pendingExplicitAccountId === paramId || activeAccountId === paramId);

    if (adminPreviewAccountId && !canAdminPreview) {
      const nextParams = new URLSearchParams();
      if (activeTab) {
        nextParams.set("tab", activeTab);
      }
      navigate(`/VendorDashboard?${nextParams.toString()}`, { replace: true });
      return;
    }

    const requestedAccount = organizerAccounts.find(
      (item) => item.id === paramId
    );

    if (
      requestedAccount &&
      isLeagueTeamAccount(requestedAccount) &&
      !adminPreviewAccountId &&
      isExplicitAccountParam
    ) {
      navigate(
        `/LeagueTeamDashboard?tab=profile&account=${requestedAccount.id}`,
        { replace: true }
      );
      return;
    }

    if (!accounts.length) {
      setActiveAccountId(null);
      return;
    }

    const savedDefaultId = localStorage.getItem(defaultAccountStorageKey);
    const hasAccount = (id) => !!id && accounts.some((item) => item.id === id);
    const nextAccountId = hasAccount(adminPreviewAccountId)
      ? adminPreviewAccountId
      : isExplicitAccountParam && hasAccount(paramId)
        ? paramId
        : hasAccount(savedDefaultId)
          ? savedDefaultId
          : accounts[0].id;

    if (activeAccountId !== nextAccountId) {
      setActiveAccountId(nextAccountId);
    }

    if (pendingExplicitAccountId === paramId) {
      sessionStorage.removeItem("yardit_explicit_organizer_account_id");
    }

    if (!adminPreviewAccountId && paramId !== nextAccountId) {
      const nextParams = new URLSearchParams();
      if (activeTab) {
        nextParams.set("tab", activeTab);
      }
      nextParams.set("account", nextAccountId);

      navigate(
        `/VendorDashboard?${nextParams.toString()}`,
        { replace: true }
      );
    }
  }, [
    accounts,
    organizerAccounts,
    loadingAccounts,
    defaultAccountStorageKey,
    adminPreviewAccountId,
    canAdminPreview,
    activeTab,
    activeAccountId,
    navigate,
    location.search,
  ]);

  const account = accounts.find((a) => a.id === activeAccountId) || accounts[0] || null;
  const adminPreviewSessionKey = canAdminPreview && account?.id === adminPreviewAccountId
    ? `${user?.id || user?.email}:${account.id}:${adminPreviewAccountId}:vendor`
    : null;

  const isOwner = canAdminPreview || !!account && (
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

  const handleExitAdminMode = async () => {
    try {
      await createAdminPreviewAuditLog({
        actionType: ADMIN_PREVIEW_EXIT_ACTION,
        user,
        account,
        dashboardType: "vendor",
        occurredAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Admin preview exit audit failed:", error);
    } finally {
      navigate("/AdminLite?section=operations&liteTab=vendors", { replace: true });
    }
  };

  useEffect(() => {
    if (!adminPreviewSessionKey || !canAdminPreview || account?.id !== adminPreviewAccountId) return;
    if (loggedAdminPreviewEntriesRef.current.has(adminPreviewSessionKey)) return;

    loggedAdminPreviewEntriesRef.current.add(adminPreviewSessionKey);
    createAdminPreviewAuditLog({
      actionType: ADMIN_PREVIEW_ENTRY_ACTION,
      user,
      account,
      dashboardType: "vendor",
      occurredAt: new Date().toISOString(),
    }).catch((error) => {
      console.error("Admin preview entry audit failed:", error);
    });
  }, [adminPreviewSessionKey, canAdminPreview, account?.id, adminPreviewAccountId, user?.id, user?.email]);

  const setupProgress = getVendorSetupProgress(account, pins);

  useEffect(() => {
    setActiveTab(requestedTab);
  }, [requestedTab]);

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    const params = new URLSearchParams(location.search);
    params.set("tab", nextTab);
    navigate(`/VendorDashboard?${params.toString()}`, { replace: true });
  };

  const handleSelectBusiness = (acc) => {
    if (!acc?.id) return;

    if (!canAdminPreview && isLeagueTeamAccount(acc)) {
      const params = new URLSearchParams();
      if (activeTab) {
        params.set("tab", "profile");
      }
      params.set("account", acc.id);
      navigate(`/LeagueTeamDashboard?${params.toString()}`);
      return;
    }

    setActiveAccountId(acc.id);

    const params = new URLSearchParams();

    if (activeTab) {
      params.set("tab", activeTab);
    }
    params.set("account", acc.id);

    navigate(`/VendorDashboard?${params.toString()}`);

    queryClient.invalidateQueries({
      queryKey: ["vendorDashboardPins", acc.id],
    });

    queryClient.invalidateQueries({
      queryKey: ["vendorDashboardCheckIns", acc.id],
    });

    queryClient.invalidateQueries({
      queryKey: ["vendorDashboardUsers", acc.id],
    });

    queryClient.invalidateQueries({
      queryKey: ["vendorDashboardUpdates", acc.id],
    });
  };

  const handleMakeDefaultPage = () => {
    if (!account?.id || canAdminPreview || !isOwner) return;

    localStorage.setItem(defaultAccountStorageKey, account.id);
    setDefaultAccountId(account.id);
    toast.success("This account is now your Vendor Dashboard homepage.");
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#5DADA5]" />
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

  const heroProfile = {
    id: account.id,
    business_name: account.business_name,
    logo_url: account.business_logo,
    tier: account.vendor_tier,
    category: account.business_category,
    description: account.description,
    phone: account.phone,
    location: account.location || account.service_area || account.city || account.address,
    hero_background_color: account.hero_background_color,
    vendor_account_number: account.vendor_account_number || account.account_number,
    owner_email: account.owner_email,
  };

  const activeCheckIn = checkIns.find((item) => item.status === "live" && new Date(item.checkin_end_time) > new Date());
  const activePin = activeCheckIn ? pins.find((pin) => pin.id === activeCheckIn.vendor_pin_id) : null;
  const canManageDefaultPage = !canAdminPreview && isOwner;
  const isDefaultPage = account?.id === defaultAccountId;

  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-slate-50">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-0 min-w-0">
        {/* Dashboard header */}
        <div className="bg-gradient-to-br from-[#2C4F4E] to-[#3d6b6a] text-white shadow-lg">
          <div className="max-w-7xl mx-auto w-full px-0 sm:px-5 lg:px-6 pt-0 sm:pt-6">
            <MobileVendorHeader account={account} activeCheckIn={activeCheckIn} activePin={activePin} accounts={organizerAccounts} onSelectBusiness={handleSelectBusiness} defaultAccountId={defaultAccountId} dashboardType="vendor_event" currentTab={activeTab} adminPreview={!!canAdminPreview} canManageDefaultPage={canManageDefaultPage} isDefaultPage={isDefaultPage} onMakeDefaultPage={handleMakeDefaultPage} />
            <div className="hidden sm:block">
              <BusinessSelectorBar accounts={organizerAccounts} activeAccount={account} onSelectSameDashboard={handleSelectBusiness} defaultAccountId={defaultAccountId} dashboardType="vendor_event" currentTab={activeTab} adminPreview={!!canAdminPreview} canManageDefaultPage={canManageDefaultPage} isDefaultPage={isDefaultPage} onMakeDefaultPage={handleMakeDefaultPage} />
              <BusinessHero profile={heroProfile} activeCheckIn={activeCheckIn} onRefresh={refreshDashboard} asHeader />
            </div>

            {/* Tab navigation */}
            <div className="mt-0 sm:mt-5 overflow-x-auto">
              <TabsList className="flex w-max min-w-full bg-transparent p-0 h-auto justify-start rounded-none gap-0.5 sm:gap-1">
                {[
                  { value: "profile", label: "My Page" },
                  { value: "pins", label: "Trucks & Pins" },
                  { value: "events", label: "Events" },
                  { value: "history", label: "History" },
                  { value: "tier", label: "Plan & Billing" },
                  { value: "users", label: "Team" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="min-w-fit px-3 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-sm font-semibold rounded-none sm:rounded-t-xl text-white/70 hover:text-white hover:bg-white/10 transition-all data-[state=active]:bg-slate-50 data-[state=active]:text-[#2C4F4E] data-[state=active]:shadow-none data-[state=active]:font-bold"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full min-w-0 p-2 pb-24 sm:p-5 sm:pb-24 lg:p-6 lg:pb-24 space-y-3 sm:space-y-6">
          {canAdminPreview && <AdminPreviewBanner account={account} onExit={handleExitAdminMode} />}
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

          <div className="hidden sm:block">
            <VendorPinStatusBar pins={pins} checkIns={checkIns} />
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