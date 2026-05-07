import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Store } from "lucide-react";
import BusinessHero from "@/components/vendor/BusinessHero";
import MobileVendorHeader from "@/components/vendor/MobileVendorHeader";
import MyTrucksSection from "@/components/vendor/MyTrucksSection";
import VendorBillingTab from "@/components/vendor/VendorBillingTab";
import VendorUsersTab from "@/components/vendor/VendorUsersTab";
import VendorPinStatusBar from "@/components/vendor/VendorPinStatusBar";
import VendorBusinessPage from "@/components/vendor/VendorBusinessPage";
import VendorPinHistoryTab from "@/components/vendor/VendorPinHistoryTab";
import VendorPortalGate from "@/components/vendor/VendorPortalGate";
import VendorSetupProgress from "@/components/vendor/VendorSetupProgress";
import { getVendorSetupProgress, getVendorSetupStepUrl } from "@/lib/vendorSetup";
import { hasValidVendorPortalSession } from "@/lib/vendorPasscode";

export default function VendorDashboard() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const requestedTab = urlParams.get("tab") || "profile";
  const [portalUnlocked, setPortalUnlocked] = useState(false);
  const [showSetupReminder, setShowSetupReminder] = useState(true);

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ["vendorDashboardUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: accounts = [], isLoading: loadingAccount } = useQuery({
    queryKey: ["vendorDashboardAccount", user?.id, user?.email],
    queryFn: async () => {
      const byId = await base44.entities.VendorAccount.filter({ owner_user_id: user.id });
      if (byId.length) return byId;
      const byEmail = await base44.entities.VendorAccount.filter({ owner_user_id: user.email });
      if (byEmail.length) return byEmail;
      const authorizedRecords = await base44.entities.VendorAuthorizedUser.filter({ authorized_email: user.email, status: "active" });
      if (!authorizedRecords.length) return [];
      const allAccounts = await base44.entities.VendorAccount.list();
      return allAccounts.filter((vendorAccount) => authorizedRecords.some((record) => record.vendor_account_id === vendorAccount.id));
    },
    enabled: !!user?.id,
  });

  const account = accounts.find((item) => item.is_active !== false) || accounts[0];
  const isOwner = !!account && (account.owner_user_id === user?.id || account.owner_user_id === user?.email);

  const { data: authorizedAccessRecords = [] } = useQuery({
    queryKey: ["vendorDashboardAuthorizedAccess", account?.id, user?.email],
    queryFn: () => base44.entities.VendorAuthorizedUser.filter({ vendor_account_id: account.id, authorized_email: user.email, status: "active" }),
    enabled: !!account?.id && !!user?.email && !isOwner,
  });

  const authorizedAccessRecord = authorizedAccessRecords[0];

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
    queryFn: () => base44.entities.VendorAuthorizedUser.filter({ vendor_account_id: account.id, status: "active" }, "-created_date"),
    enabled: !!account?.id,
  });

  const { data: updates = [] } = useQuery({
    queryKey: ["vendorDashboardUpdates", account?.id],
    queryFn: () => base44.entities.VendorUpdate.filter({ vendor_account_id: account.id }, "-created_date"),
    enabled: !!account?.id,
  });

  const refreshDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardAccount"] });
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardPins"] });
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardCheckIns"] });
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardUsers"] });
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardUpdates"] });
  };

  const setupProgress = getVendorSetupProgress(account, pins);

  useEffect(() => {
    if (isOwner || (account?.id && user?.email && hasValidVendorPortalSession(account.id, user.email))) {
      setPortalUnlocked(true);
    } else {
      setPortalUnlocked(false);
    }
  }, [account?.id, user?.email, isOwner]);

  useEffect(() => {
    if (!account?.id || !portalUnlocked || account.setup_dashboard_entered === true) return;
    base44.entities.VendorAccount.update(account.id, { setup_dashboard_entered: true, vendor_setup_status: setupProgress.isComplete ? "complete" : "in_progress" }).then(refreshDashboard);
  }, [account?.id, portalUnlocked]);

  useEffect(() => {
    if (!account?.id || account.vendor_setup_status === "complete" || !setupProgress.isComplete) return;
    base44.entities.VendorAccount.update(account.id, { vendor_setup_status: "complete" }).then(refreshDashboard);
  }, [account?.id, setupProgress.isComplete]);

  if (loadingUser || loadingAccount) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#5DADA5]" /></div>;
  }

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6">
        <Card className="rounded-3xl">
          <CardContent className="p-8 text-center space-y-3">
            <Store className="h-10 w-10 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold text-[#2C4F4E]">No vendor account found</h1>
            <p className="text-sm text-muted-foreground">Once your vendor account is created, your dashboard tabs will appear here.</p>
          </CardContent>
        </Card>
      </div>
    );
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
  };
  const activeCheckIn = checkIns.find((item) => item.status === "live" && new Date(item.checkin_end_time) > new Date());
  const activePin = activeCheckIn ? pins.find((pin) => pin.id === activeCheckIn.vendor_pin_id) : null;

  if (!portalUnlocked) {
    return <VendorPortalGate account={account} authorizedUser={authorizedAccessRecord} user={user} onUnlock={() => setPortalUnlocked(true)} />;
  }

  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-[#FBFAF7]">
      <Tabs defaultValue={requestedTab} className="space-y-0 min-w-0">
        <div className="bg-[#5DADA5] text-white">
          <div className="max-w-7xl mx-auto w-full px-0 sm:px-5 lg:px-6 pt-0 sm:pt-5">
            <MobileVendorHeader account={account} activeCheckIn={activeCheckIn} activePin={activePin} />
            <div className="hidden sm:block">
              <BusinessHero profile={heroProfile} activeCheckIn={activeCheckIn} onRefresh={refreshDashboard} asHeader />
            </div>

            <div className="mt-0 sm:mt-6 sm:mx-0 overflow-x-auto">
              <TabsList className="flex w-max min-w-full bg-transparent p-0 h-auto justify-start rounded-none">
                <TabsTrigger value="profile" className="min-w-[5.75rem] sm:min-w-[7.5rem] flex-1 rounded-none sm:rounded-t-2xl px-2 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-sm text-white/80 data-[state=active]:bg-[#FBFAF7] data-[state=active]:text-[#5DADA5] data-[state=active]:shadow-none">My Page</TabsTrigger>
                <TabsTrigger value="pins" className="min-w-[7.25rem] sm:min-w-[9rem] flex-1 rounded-none sm:rounded-t-2xl px-2 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-sm text-white/80 data-[state=active]:bg-[#FBFAF7] data-[state=active]:text-[#5DADA5] data-[state=active]:shadow-none">Trucks / Pins</TabsTrigger>
                <TabsTrigger value="events" className="min-w-[5.25rem] sm:min-w-[7.5rem] flex-1 rounded-none sm:rounded-t-2xl px-2 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-sm text-white/80 data-[state=active]:bg-[#FBFAF7] data-[state=active]:text-[#5DADA5] data-[state=active]:shadow-none">Events</TabsTrigger>
                <TabsTrigger value="history" className="min-w-[5.75rem] sm:min-w-[7.5rem] flex-1 rounded-none sm:rounded-t-2xl px-2 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-sm text-white/80 data-[state=active]:bg-[#FBFAF7] data-[state=active]:text-[#5DADA5] data-[state=active]:shadow-none">History</TabsTrigger>
                <TabsTrigger value="tier" className="min-w-[4.5rem] sm:min-w-[7rem] flex-1 rounded-none sm:rounded-t-2xl px-2 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-sm text-white/80 data-[state=active]:bg-[#FBFAF7] data-[state=active]:text-[#5DADA5] data-[state=active]:shadow-none">Tier</TabsTrigger>
                <TabsTrigger value="users" className="min-w-[6.75rem] sm:min-w-[11rem] flex-1 rounded-none sm:rounded-t-2xl px-2 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-sm text-white/80 data-[state=active]:bg-[#FBFAF7] data-[state=active]:text-[#5DADA5] data-[state=active]:shadow-none">Users</TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full min-w-0 p-2 pb-24 sm:p-5 sm:pb-24 lg:p-6 lg:pb-24 space-y-2 sm:space-y-6">
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
          <TabsContent value="events" className="mt-0 min-w-0">
            <Card className="rounded-3xl border-[#2C4F4E]/15 bg-white shadow-sm">
              <CardContent className="p-8 text-center space-y-3">
                <h2 className="text-2xl font-black text-[#2C4F4E]">Events Coming Soon</h2>
                <p className="text-sm text-slate-600">You’ll be able to create and manage vendor events here soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="history" className="mt-0 min-w-0"><VendorPinHistoryTab pins={pins} checkIns={checkIns} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}