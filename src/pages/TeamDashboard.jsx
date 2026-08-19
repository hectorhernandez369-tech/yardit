import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import VendorBusinessPage from "@/components/vendor/VendorBusinessPage";
import BusinessHero from "@/components/vendor/BusinessHero";
import MobileVendorHeader from "@/components/vendor/MobileVendorHeader";
import BusinessSelectorBar from "@/components/vendor/BusinessSelectorBar";
import LeagueAccessDenied from "@/components/league/LeagueAccessDenied";
import LeagueEventsTab from "@/components/league/events/LeagueEventsTab";
import LeagueScoreboard from "@/components/league/scoreboard/LeagueScoreboard";
import TeamScheduleManager from "@/components/team/TeamScheduleManager";
import TeamLeagueConnections from "@/components/team/TeamLeagueConnections";
import { getUserVendorAccounts, isTeamAccount, isVendorDashboardAccount } from "@/lib/getUserVendorAccounts";
import { userOwnsLeagueAccount } from "@/lib/leaguePermissions";
import { toast } from "sonner";

export default function TeamDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(location.search);
  const requestedTab = urlParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(requestedTab);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [defaultAccountId, setDefaultAccountId] = useState(null);

  const { data: user, isLoading: loadingUser } = useQuery({ queryKey: ["teamDashboardUser"], queryFn: () => base44.auth.me() });
  const { data: organizerAccounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["teamDashboardAccounts", user?.id, user?.email],
    queryFn: () => getUserVendorAccounts(user),
    enabled: !!user?.id || !!user?.email,
  });
  const accounts = useMemo(() => organizerAccounts.filter(isTeamAccount), [organizerAccounts]);
  const storageKey = user?.id || user?.email ? `yardit_default_team_account_id:${user.id || user.email}` : "yardit_default_team_account_id";

  useEffect(() => setDefaultAccountId(localStorage.getItem(storageKey)), [storageKey]);

  useEffect(() => {
    if (loadingAccounts) return;
    const params = new URLSearchParams(location.search);
    const paramId = params.get("account");
    const pendingExplicitAccountId = sessionStorage.getItem("yardit_explicit_organizer_account_id");
    const hasAccount = (id) => !!id && accounts.some((item) => item.id === id);
    if (!accounts.length) return setActiveAccountId(null);
    const savedId = localStorage.getItem(storageKey);
    const nextId = hasAccount(paramId) ? paramId : hasAccount(savedId) ? savedId : accounts[0].id;
    setActiveAccountId(nextId);
    if (pendingExplicitAccountId === paramId) sessionStorage.removeItem("yardit_explicit_organizer_account_id");
    if (paramId !== nextId) {
      params.set("account", nextId);
      navigate(`/TeamDashboard?${params.toString()}`, { replace: true });
    }
  }, [accounts, loadingAccounts, storageKey, location.search, navigate]);

  useEffect(() => setActiveTab(requestedTab), [requestedTab]);
  const account = accounts.find((item) => item.id === activeAccountId) || accounts[0] || null;
  const isOwner = userOwnsLeagueAccount(account, user);

  useEffect(() => {
    if (!account?.id || !isOwner) return;
    const name = String(account.business_name || account.vendor_display_name || "").trim().toLowerCase();
    if (account.organization_type === "league_team" && name === "lindsay youth football and cheer") {
      base44.entities.VendorAccount.update(account.id, { organization_type: "team" }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["teamDashboardAccounts"] });
      }).catch(() => {});
    }
  }, [account?.id, account?.organization_type, account?.business_name, account?.vendor_display_name, isOwner, queryClient]);

  const { data: updates = [] } = useQuery({ queryKey: ["teamDashboardUpdates", account?.id], queryFn: () => base44.entities.VendorUpdate.filter({ vendor_account_id: account.id }, "-created_date"), enabled: !!account?.id });
  const { data: memberships = [] } = useQuery({ queryKey: ["teamDashboardMemberships", account?.id], queryFn: () => base44.entities.LeagueMembership.filter({ member_account_id: account.id, status: "active" }).catch(() => []), enabled: !!account?.id });
  const leagueIds = useMemo(() => [...new Set(memberships.map((item) => item.league_account_id).filter(Boolean))], [memberships]);
  const { data: leagueGames = [] } = useQuery({ queryKey: ["teamDashboardLeagueGames", leagueIds.join("|")], queryFn: async () => (await Promise.all(leagueIds.map((id) => base44.entities.LeagueGame.filter({ vendor_account_id: id }, "sort_order").catch(() => [])))).flat(), enabled: leagueIds.length > 0 });
  const { data: scheduleLinks = [] } = useQuery({ queryKey: ["teamDashboardScheduleLinks", account?.id], queryFn: () => base44.entities.TeamScheduleGameLink.filter({ team_account_id: account.id, is_active: true }).catch(() => []), enabled: !!account?.id });
  const scheduleIds = useMemo(() => new Set(scheduleLinks.map((item) => item.league_game_id)), [scheduleLinks]);
  const myGames = useMemo(() => leagueGames.filter((game) => scheduleIds.has(game.id)), [leagueGames, scheduleIds]);

  const refreshDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ["teamDashboardAccounts"] });
    queryClient.invalidateQueries({ queryKey: ["teamDashboardUpdates"] });
    queryClient.invalidateQueries({ queryKey: ["teamDashboardMemberships"] });
    queryClient.invalidateQueries({ queryKey: ["teamDashboardLeagueGames"] });
    queryClient.invalidateQueries({ queryKey: ["teamDashboardScheduleLinks"] });
    queryClient.invalidateQueries({ queryKey: ["teamScheduleLinks"] });
  };

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    const params = new URLSearchParams(location.search);
    params.set("tab", nextTab);
    navigate(`/TeamDashboard?${params.toString()}`, { replace: true });
  };

  const handleSelectAccount = (nextAccount) => {
    if (!nextAccount?.id) return;
    sessionStorage.setItem("yardit_explicit_organizer_account_id", nextAccount.id);
    if (isVendorDashboardAccount(nextAccount)) {
      navigate(`/VendorDashboard?tab=profile&account=${nextAccount.id}`);
      return;
    }
    if (isTeamAccount(nextAccount)) {
      navigate(`/TeamDashboard?tab=profile&account=${nextAccount.id}`);
      return;
    }
    navigate(`/LeagueTeamDashboard?tab=profile&account=${nextAccount.id}`);
  };

  const handleMakeDefaultPage = () => {
    if (!account?.id || !isOwner) return;
    localStorage.setItem(storageKey, account.id);
    localStorage.setItem("yardit_default_organizer_account_id", account.id);
    setDefaultAccountId(account.id);
    toast.success("This Team account is now your default organizer account.");
  };

  if (loadingUser || loadingAccounts) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#5DADA5]" /></div>;
  if (!account) return <LeagueAccessDenied />;

  const heroProfile = {
    id: account.id, business_name: account.business_name, logo_url: account.business_logo, tier: account.vendor_tier,
    category: account.business_category, description: account.description, phone: account.phone,
    location: account.location || account.service_area || account.city || account.address,
    hero_background_color: account.hero_background_color, vendor_account_number: account.vendor_account_number || account.account_number, owner_email: account.owner_email,
  };

  const tabList = [
    { value: "profile", label: "My Page" },
    { value: "schedule", label: "My Team Schedule" },
    { value: "leagues", label: "My League" },
    { value: "scoreboard", label: "My Scoreboard" },
    { value: "events", label: "My Events" },
  ];
  const isDefaultPage = account.id === defaultAccountId;

  return <div className="w-full min-h-screen overflow-x-hidden bg-slate-50">
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-0 min-w-0">
      <div className="bg-gradient-to-br from-[#2C4F4E] to-[#3d6b6a] text-white shadow-lg">
        <div className="max-w-7xl mx-auto w-full px-0 sm:px-5 lg:px-6 pt-0 sm:pt-6">
          <MobileVendorHeader account={account} accounts={organizerAccounts} onSelectBusiness={handleSelectAccount} defaultAccountId={defaultAccountId} dashboardType="team" currentTab={activeTab} canManageDefaultPage={isOwner} isDefaultPage={isDefaultPage} onMakeDefaultPage={handleMakeDefaultPage} />
          <div className="hidden sm:block"><BusinessSelectorBar accounts={organizerAccounts} activeAccount={account} onSelectSameDashboard={handleSelectAccount} defaultAccountId={defaultAccountId} dashboardType="team" currentTab={activeTab} canManageDefaultPage={isOwner} isDefaultPage={isDefaultPage} onMakeDefaultPage={handleMakeDefaultPage} /><BusinessHero profile={heroProfile} onRefresh={refreshDashboard} asHeader /></div>
          <div className="mt-0 sm:mt-5 overflow-x-auto"><TabsList className="flex w-max min-w-full bg-transparent p-0 h-auto justify-start rounded-none gap-0.5 sm:gap-1">{tabList.map((tab) => <TabsTrigger key={tab.value} value={tab.value} className="min-w-fit px-3 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-sm font-semibold rounded-none sm:rounded-t-xl text-white/70 hover:text-white hover:bg-white/10 data-[state=active]:bg-slate-50 data-[state=active]:text-[#2C4F4E] data-[state=active]:font-bold">{tab.label}</TabsTrigger>)}</TabsList></div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto w-full min-w-0 p-2 pb-24 sm:p-5 lg:p-6 space-y-3 sm:space-y-6">
        <TabsContent value="profile" className="mt-0"><VendorBusinessPage account={account} pins={[]} checkIns={[]} updates={updates} onRefresh={refreshDashboard} /></TabsContent>
        <TabsContent value="schedule" className="mt-0"><TeamScheduleManager account={account} user={user} section="schedule" /></TabsContent>
        <TabsContent value="leagues" className="mt-0"><div className="space-y-4"><TeamLeagueConnections account={account} user={user} onRefresh={refreshDashboard} /><TeamScheduleManager account={account} user={user} section="add" /></div></TabsContent>
        <TabsContent value="scoreboard" className="mt-0"><LeagueScoreboard account={account} user={user} games={myGames} assignments={[]} memberships={memberships} isOwner={false} onRefresh={refreshDashboard} /></TabsContent>
        <TabsContent value="events" className="mt-0"><LeagueEventsTab account={account} user={user} /></TabsContent>
      </div>
    </Tabs>
  </div>;
}