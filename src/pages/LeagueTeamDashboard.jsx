import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import VendorBusinessPage from "@/components/vendor/VendorBusinessPage";
import BusinessHero from "@/components/vendor/BusinessHero";
import MobileVendorHeader from "@/components/vendor/MobileVendorHeader";
import VendorBillingTab from "@/components/vendor/VendorBillingTab";
import VendorUsersTab from "@/components/vendor/VendorUsersTab";
import VendorPinHistoryTab from "@/components/vendor/VendorPinHistoryTab";
import VendorEventsTab from "@/components/vendor/events/VendorEventsTab";
import { getUserVendorAccounts, isLeagueTeamAccount, isVendorDashboardAccount } from "@/lib/getUserVendorAccounts";
import BusinessSelectorBar from "@/components/vendor/BusinessSelectorBar";
import LeagueAccessDenied from "@/components/league/LeagueAccessDenied";
import LeagueTeamsTab from "@/components/league/LeagueTeamsTab";
import LeagueGamesTab from "@/components/league/LeagueGamesTab";

export default function LeagueTeamDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const requestedTab = new URLSearchParams(window.location.search).get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(requestedTab);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [defaultAccountId, setDefaultAccountId] = useState(null);

  const { data: user, isLoading: loadingUser } = useQuery({ queryKey: ["leagueDashboardUser"], queryFn: () => base44.auth.me() });
  const { data: organizerAccounts = [], isLoading: loadingAccounts } = useQuery({ queryKey: ["leagueDashboardAccounts", user?.id, user?.email], queryFn: () => getUserVendorAccounts(user), enabled: !!user?.id || !!user?.email });
  const accounts = useMemo(() => organizerAccounts.filter(isLeagueTeamAccount), [organizerAccounts]);

  const storageKey = user?.id || user?.email ? `yardit_default_league_account_id:${user.id || user.email}` : "yardit_default_league_account_id";

  useEffect(() => {
    setDefaultAccountId(localStorage.getItem(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (loadingAccounts) return;
    const paramId = new URLSearchParams(window.location.search).get("account");
    const requestedAccount = organizerAccounts.find((item) => item.id === paramId);
    if (requestedAccount && isVendorDashboardAccount(requestedAccount)) {
      navigate(`/VendorDashboard?tab=profile&account=${requestedAccount.id}`, { replace: true });
      return;
    }
    if (!accounts.length) return setActiveAccountId(null);
    const savedLastOrganizerId = localStorage.getItem("yardit_last_organizer_account_id");
    const savedId = localStorage.getItem(storageKey);
    if (paramId && accounts.find((item) => item.id === paramId)) setActiveAccountId(paramId);
    else if (savedId && accounts.find((item) => item.id === savedId)) setActiveAccountId(savedId);
    else if (savedLastOrganizerId && accounts.find((item) => item.id === savedLastOrganizerId)) setActiveAccountId(savedLastOrganizerId);
    else setActiveAccountId(accounts[0].id);
  }, [accounts, organizerAccounts, loadingAccounts, storageKey, navigate]);

  useEffect(() => setActiveTab(requestedTab), [requestedTab]);

  const account = accounts.find((item) => item.id === activeAccountId) || accounts[0] || null;
  const isOwner = !!account && (account.owner_user_id === user?.id || account.owner_user_id === user?.email || account.owner_email === user?.email);

  const { data: users = [] } = useQuery({ queryKey: ["leagueDashboardUsers", account?.id], queryFn: () => base44.entities.VendorAuthorizedUser.filter({ vendor_account_id: account.id }, "-created_date"), enabled: !!account?.id });
  const { data: updates = [] } = useQuery({ queryKey: ["leagueDashboardUpdates", account?.id], queryFn: () => base44.entities.VendorUpdate.filter({ vendor_account_id: account.id }, "-created_date"), enabled: !!account?.id });
  const { data: games = [] } = useQuery({ queryKey: ["leagueDashboardGames", account?.id], queryFn: () => base44.entities.LeagueGame.filter({ vendor_account_id: account.id }, "sort_order"), enabled: !!account?.id });

  const refreshDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ["leagueDashboardAccounts"] });
    queryClient.invalidateQueries({ queryKey: ["leagueDashboardUsers"] });
    queryClient.invalidateQueries({ queryKey: ["leagueDashboardUpdates"] });
    queryClient.invalidateQueries({ queryKey: ["leagueDashboardGames"] });
  };

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", nextTab);
    navigate(`/LeagueTeamDashboard?${params.toString()}`, { replace: true });
  };

  const handleSelectAccount = (nextAccount) => {
    setActiveAccountId(nextAccount.id);
    localStorage.setItem("yardit_last_organizer_account_id", nextAccount.id);
    navigate(`/LeagueTeamDashboard?tab=${activeTab}&account=${nextAccount.id}`, { replace: true });
  };

  const handleSetDefaultAccount = (nextAccount) => {
    if (!nextAccount?.id) return;
    if (isVendorDashboardAccount(nextAccount)) {
      const userKey = user?.id || user?.email;
      localStorage.setItem(userKey ? `yardit_default_vendor_account_id:${userKey}` : "yardit_default_vendor_account_id", nextAccount.id);
      return;
    }
    localStorage.setItem(storageKey, nextAccount.id);
    setDefaultAccountId(nextAccount.id);
  };

  if (loadingUser || loadingAccounts) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#5DADA5]" /></div>;
  if (!account) return <LeagueAccessDenied />;

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

  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-slate-50">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-0 min-w-0">
        <div className="bg-gradient-to-br from-[#2C4F4E] to-[#3d6b6a] text-white shadow-lg">
          <div className="max-w-7xl mx-auto w-full px-0 sm:px-5 lg:px-6 pt-0 sm:pt-6">
            <MobileVendorHeader account={account} accounts={organizerAccounts} onSelectBusiness={handleSelectAccount} onSetDefaultAccount={handleSetDefaultAccount} defaultAccountId={defaultAccountId} dashboardType="league_team" currentTab={activeTab} />
            <div className="hidden sm:block">
              <BusinessSelectorBar accounts={organizerAccounts} activeAccount={account} onSelectSameDashboard={handleSelectAccount} onSetDefaultAccount={handleSetDefaultAccount} defaultAccountId={defaultAccountId} dashboardType="league_team" currentTab={activeTab} />
              <BusinessHero profile={heroProfile} onRefresh={refreshDashboard} asHeader />
            </div>

            <div className="mt-0 sm:mt-5 overflow-x-auto">
              <TabsList className="flex w-max min-w-full bg-transparent p-0 h-auto justify-start rounded-none gap-0.5 sm:gap-1">
                {[{ value: "profile", label: "My Page" }, { value: "events", label: "Events" }, { value: "teams", label: "Teams" }, { value: "games", label: "Games" }, { value: "history", label: "History" }, { value: "tier", label: "Plan & Billing" }, { value: "users", label: "Staff" }].map((tab) => <TabsTrigger key={tab.value} value={tab.value} className="min-w-fit px-3 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-sm font-semibold rounded-none sm:rounded-t-xl text-white/70 hover:text-white hover:bg-white/10 transition-all data-[state=active]:bg-slate-50 data-[state=active]:text-[#2C4F4E] data-[state=active]:shadow-none data-[state=active]:font-bold">{tab.label}</TabsTrigger>)}
              </TabsList>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full min-w-0 p-2 pb-24 sm:p-5 sm:pb-24 lg:p-6 lg:pb-24 space-y-3 sm:space-y-6">
          <TabsContent value="profile" className="mt-0 min-w-0"><VendorBusinessPage account={account} pins={[]} checkIns={[]} updates={updates} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="events" className="mt-0 min-w-0"><VendorEventsTab account={account} user={user} /></TabsContent>
          <TabsContent value="teams" className="mt-0 min-w-0"><LeagueTeamsTab account={account} /></TabsContent>
          <TabsContent value="games" className="mt-0 min-w-0"><LeagueGamesTab account={account} games={games} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="history" className="mt-0 min-w-0"><VendorPinHistoryTab pins={[]} checkIns={[]} /></TabsContent>
          <TabsContent value="tier" className="mt-0 min-w-0"><VendorBillingTab account={account} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="users" className="mt-0 min-w-0"><VendorUsersTab account={account} users={users} user={user} pins={[]} isOwner={isOwner} onRefresh={refreshDashboard} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}