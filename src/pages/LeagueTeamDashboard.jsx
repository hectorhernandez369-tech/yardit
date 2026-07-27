import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import VendorBusinessPage from "@/components/vendor/VendorBusinessPage";
import BusinessHero from "@/components/vendor/BusinessHero";
import MobileVendorHeader from "@/components/vendor/MobileVendorHeader";
import { getUserVendorAccounts, isLeagueTeamAccount, isVendorDashboardAccount } from "@/lib/getUserVendorAccounts";
import BusinessSelectorBar from "@/components/vendor/BusinessSelectorBar";
import LeagueAccessDenied from "@/components/league/LeagueAccessDenied";
import LeagueTeamsTab from "@/components/league/LeagueTeamsTab";
import LeagueEventsTab from "@/components/league/events/LeagueEventsTab";
import LeagueScheduleManager from "@/components/league/schedule/LeagueScheduleManager";
import LeagueScoreboard from "@/components/league/scoreboard/LeagueScoreboard";
import LeagueConnectionsTab from "@/components/league/LeagueConnectionsTab";
import MyLeagueSchedule from "@/components/league/MyLeagueSchedule";
import LeagueAuditHistory from "@/components/league/LeagueAuditHistory";
import { gameMatchesAssignment, membershipPermissions, userOwnsLeagueAccount } from "@/lib/leaguePermissions";
import { canAdminPreviewOrganization } from "@/lib/canAdminPreviewOrganization";
import AdminPreviewBanner from "@/components/admin/AdminPreviewBanner";
import { ADMIN_PREVIEW_ENTRY_ACTION, ADMIN_PREVIEW_EXIT_ACTION, createAdminPreviewAuditLog } from "@/lib/adminPreviewAudit";
import { toast } from "sonner";

export default function LeagueTeamDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(location.search);
  const requestedRawTab = urlParams.get("tab") || "profile";
  const requestedTab = requestedRawTab === "games" ? "schedule" : requestedRawTab === "history" ? "events" : requestedRawTab;
  const adminPreviewAccountId = urlParams.get("adminPreview") === "1" ? urlParams.get("account") : null;
  const [activeTab, setActiveTab] = useState(requestedTab);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [defaultAccountId, setDefaultAccountId] = useState(null);
  const loggedAdminPreviewEntriesRef = useRef(new Set());

  const { data: user, isLoading: loadingUser } = useQuery({ queryKey: ["leagueDashboardUser"], queryFn: () => base44.auth.me() });
  const canAdminPreview = !!adminPreviewAccountId && canAdminPreviewOrganization(user);
  const { data: organizerAccounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["leagueDashboardAccounts", user?.id, user?.email, adminPreviewAccountId, canAdminPreview],
    queryFn: () => canAdminPreview
      ? base44.entities.VendorAccount.filter({ id: adminPreviewAccountId })
      : getUserVendorAccounts(user),
    enabled: !!user?.id || !!user?.email,
  });
  const accounts = useMemo(() => canAdminPreview ? organizerAccounts : organizerAccounts.filter(isLeagueTeamAccount), [canAdminPreview, organizerAccounts]);

  const storageKey = user?.id || user?.email ? `yardit_default_league_account_id:${user.id || user.email}` : "yardit_default_league_account_id";

  useEffect(() => {
    setDefaultAccountId(localStorage.getItem(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (loadingAccounts) return;
    const params = new URLSearchParams(location.search);
    const paramId = params.get("account");
    const pendingExplicitAccountId = sessionStorage.getItem("yardit_explicit_organizer_account_id");
    const isExplicitAccountParam = !!paramId && (pendingExplicitAccountId === paramId || activeAccountId === paramId);

    if (adminPreviewAccountId && !canAdminPreview) {
      params.delete("adminPreview");
      params.delete("account");
      navigate(`/LeagueTeamDashboard?${params.toString()}`, { replace: true });
      return;
    }

    const requestedAccount = organizerAccounts.find((item) => item.id === paramId);
    if (requestedAccount && isVendorDashboardAccount(requestedAccount) && !adminPreviewAccountId && isExplicitAccountParam) {
      const nextParams = new URLSearchParams();
      nextParams.set("tab", "profile");
      nextParams.set("account", requestedAccount.id);
      navigate(`/VendorDashboard?${nextParams.toString()}`);
      return;
    }
    if (!accounts.length) return setActiveAccountId(null);

    const savedId = localStorage.getItem(storageKey);
    const hasAccount = (id) => !!id && accounts.some((item) => item.id === id);
    const nextAccountId = hasAccount(adminPreviewAccountId)
      ? adminPreviewAccountId
      : isExplicitAccountParam && hasAccount(paramId)
        ? paramId
        : hasAccount(savedId)
          ? savedId
          : accounts[0].id;

    if (activeAccountId !== nextAccountId) {
      setActiveAccountId(nextAccountId);
    }

    if (pendingExplicitAccountId === paramId) {
      sessionStorage.removeItem("yardit_explicit_organizer_account_id");
    }

    if (!adminPreviewAccountId && paramId !== nextAccountId) {
      params.set("account", nextAccountId);
      navigate(`/LeagueTeamDashboard?${params.toString()}`, { replace: true });
    }
  }, [accounts, organizerAccounts, loadingAccounts, storageKey, navigate, adminPreviewAccountId, canAdminPreview, activeAccountId, location.search]);

  useEffect(() => setActiveTab(requestedTab), [requestedTab]);

  const account = accounts.find((item) => item.id === activeAccountId) || accounts[0] || null;
  const adminPreviewSessionKey = canAdminPreview && account?.id === adminPreviewAccountId
    ? `${user?.id || user?.email}:${account.id}:${adminPreviewAccountId}:league_team`
    : null;
  const isOwner = canAdminPreview || userOwnsLeagueAccount(account, user);

  const { data: updates = [] } = useQuery({ queryKey: ["leagueDashboardUpdates", account?.id], queryFn: () => base44.entities.VendorUpdate.filter({ vendor_account_id: account.id }, "-created_date"), enabled: !!account?.id });
  const { data: ownerGames = [] } = useQuery({ queryKey: ["leagueDashboardGames", account?.id, "owner"], queryFn: () => base44.entities.LeagueGame.filter({ vendor_account_id: account.id }, "sort_order"), enabled: !!account?.id && isOwner });
  const { data: memberships = [] } = useQuery({ queryKey: ["leagueDashboardMemberships", account?.id, user?.id], queryFn: async () => {
    const [byAccount, byUser, owned] = await Promise.all([
      base44.entities.LeagueMembership.filter({ member_account_id: account.id, status: "active" }).catch(() => []),
      user?.id ? base44.entities.LeagueMembership.filter({ member_user_id: user.id, status: "active" }).catch(() => []) : Promise.resolve([]),
      base44.entities.LeagueMembership.filter({ league_account_id: account.id }).catch(() => []),
    ]);
    return [...byAccount, ...byUser, ...owned].filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index);
  }, enabled: !!account?.id });

  const memberLeagueIds = useMemo(() => [...new Set(memberships.filter((item) => item.status === "active" && item.league_account_id !== account?.id && (item.member_account_id === account?.id || item.member_user_id === user?.id)).map((item) => item.league_account_id))], [memberships, account?.id, user?.id]);
  const memberPermissions = useMemo(() => membershipPermissions(memberships.filter((item) => memberLeagueIds.includes(item.league_account_id))), [memberships, memberLeagueIds]);

  const { data: memberGames = [] } = useQuery({ queryKey: ["leagueDashboardGames", account?.id, "member", memberLeagueIds.join("|")], queryFn: async () => {
    const batches = await Promise.all(memberLeagueIds.map((leagueId) => base44.entities.LeagueGame.filter({ vendor_account_id: leagueId }, "sort_order").catch(() => [])));
    return batches.flat();
  }, enabled: !!account?.id && !isOwner && memberLeagueIds.length > 0 });

  const { data: assignments = [] } = useQuery({ queryKey: ["leagueDashboardAssignments", account?.id, memberLeagueIds.join("|")], queryFn: async () => {
    const leagueIds = isOwner ? [account.id] : memberLeagueIds;
    const batches = await Promise.all(leagueIds.map((leagueId) => base44.entities.LeagueTeamAssignment.filter({ league_account_id: leagueId, team_account_id: account.id, is_active: true }).catch(() => [])));
    return batches.flat();
  }, enabled: !!account?.id && (isOwner || memberLeagueIds.length > 0) });

  const games = isOwner ? ownerGames : memberGames;
  const myGames = isOwner ? ownerGames : games.filter((game) => assignments.some((assignment) => gameMatchesAssignment(game, assignment)));
  const canManageScores = isOwner || memberPermissions.includes("edit_all_game_scores") || memberPermissions.includes("edit_assigned_game_scores");

  const refreshDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ["leagueDashboardAccounts"] });
    queryClient.invalidateQueries({ queryKey: ["leagueDashboardUpdates"] });
    queryClient.invalidateQueries({ queryKey: ["leagueDashboardGames"] });
    queryClient.invalidateQueries({ queryKey: ["leagueDashboardMemberships"] });
    queryClient.invalidateQueries({ queryKey: ["leagueDashboardAssignments"] });
  };

  const handleExitAdminMode = async () => {
    try {
      await createAdminPreviewAuditLog({
        actionType: ADMIN_PREVIEW_EXIT_ACTION,
        user,
        account,
        dashboardType: "league_team",
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
      dashboardType: "league_team",
      occurredAt: new Date().toISOString(),
    }).catch((error) => {
      console.error("Admin preview entry audit failed:", error);
    });
  }, [adminPreviewSessionKey, canAdminPreview, account?.id, adminPreviewAccountId, user?.id, user?.email]);

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    const params = new URLSearchParams(location.search);
    params.set("tab", nextTab);
    navigate(`/LeagueTeamDashboard?${params.toString()}`, { replace: true });
  };

  const handleSelectAccount = (nextAccount) => {
    if (!nextAccount?.id) return;

    if (!canAdminPreview && isVendorDashboardAccount(nextAccount)) {
      const params = new URLSearchParams();
      params.set("tab", "profile");
      params.set("account", nextAccount.id);
      navigate(`/VendorDashboard?${params.toString()}`);
      return;
    }

    setActiveAccountId(nextAccount.id);
    const params = new URLSearchParams();
    if (activeTab) {
      params.set("tab", activeTab);
    }
    params.set("account", nextAccount.id);
    navigate(`/LeagueTeamDashboard?${params.toString()}`);
  };

  const handleMakeDefaultPage = () => {
    if (!account?.id || canAdminPreview || !isOwner) return;

    localStorage.setItem(storageKey, account.id);
    setDefaultAccountId(account.id);
    toast.success("This account is now your League/Team Dashboard homepage.");
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

  const tabList = isOwner
    ? [{ value: "profile", label: "My Page" }, { value: "schedule", label: "Master Schedule" }, { value: "teams", label: "Teams" }, { value: "leagues", label: "Invitations" }, { value: "scoreboard", label: "Scoreboard" }, { value: "audit", label: "Score Review" }, { value: "events", label: "Events" }]
    : [{ value: "profile", label: "My Page" }, { value: "my_schedule", label: "My Schedule" }, { value: "schedule", label: "Full League Schedule" }, { value: "scoreboard", label: "My Scoreboard" }, { value: "events", label: "My Events" }, { value: "leagues", label: "Find My League" }, { value: "staff", label: "Staff" }];
  const canManageDefaultPage = !canAdminPreview && isOwner;
  const isDefaultPage = account?.id === defaultAccountId;

  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-slate-50">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-0 min-w-0">
        <div className="bg-gradient-to-br from-[#2C4F4E] to-[#3d6b6a] text-white shadow-lg">
          <div className="max-w-7xl mx-auto w-full px-0 sm:px-5 lg:px-6 pt-0 sm:pt-6">
            <MobileVendorHeader account={account} accounts={organizerAccounts} onSelectBusiness={handleSelectAccount} defaultAccountId={defaultAccountId} dashboardType="league_team" currentTab={activeTab} adminPreview={!!canAdminPreview} canManageDefaultPage={canManageDefaultPage} isDefaultPage={isDefaultPage} onMakeDefaultPage={handleMakeDefaultPage} />
            <div className="hidden sm:block">
              <BusinessSelectorBar accounts={organizerAccounts} activeAccount={account} onSelectSameDashboard={handleSelectAccount} defaultAccountId={defaultAccountId} dashboardType="league_team" currentTab={activeTab} adminPreview={!!canAdminPreview} canManageDefaultPage={canManageDefaultPage} isDefaultPage={isDefaultPage} onMakeDefaultPage={handleMakeDefaultPage} />
              <BusinessHero profile={heroProfile} onRefresh={refreshDashboard} asHeader />
            </div>

            <div className="mt-0 sm:mt-5 overflow-x-auto">
              <TabsList className="flex w-max min-w-full bg-transparent p-0 h-auto justify-start rounded-none gap-0.5 sm:gap-1">
                {tabList.map((tab) => <TabsTrigger key={tab.value} value={tab.value} className="min-w-fit px-3 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-sm font-semibold rounded-none sm:rounded-t-xl text-white/70 hover:text-white hover:bg-white/10 transition-all data-[state=active]:bg-slate-50 data-[state=active]:text-[#2C4F4E] data-[state=active]:shadow-none data-[state=active]:font-bold">{tab.label}</TabsTrigger>)}
              </TabsList>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full min-w-0 p-2 pb-24 sm:p-5 sm:pb-24 lg:p-6 lg:pb-24 space-y-3 sm:space-y-6">
          {canAdminPreview && <AdminPreviewBanner account={account} onExit={handleExitAdminMode} />}
          <TabsContent value="profile" className="mt-0 min-w-0"><VendorBusinessPage account={account} pins={[]} checkIns={[]} updates={updates} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="events" className="mt-0 min-w-0"><LeagueEventsTab account={account} user={user} /></TabsContent>
          <TabsContent value="teams" className="mt-0 min-w-0"><LeagueTeamsTab account={account} user={user} /></TabsContent>
          <TabsContent value="my_schedule" className="mt-0 min-w-0"><MyLeagueSchedule title="My Schedule" description="This is a filtered view of the league’s existing master LeagueGame records. No duplicate games are created." account={account} user={user} games={myGames} assignments={assignments} memberships={memberships} onRefresh={refreshDashboard} readOnly={!canManageScores} /></TabsContent>
          <TabsContent value="schedule" className="mt-0 min-w-0"><LeagueScheduleManager account={account} user={user} games={games} assignments={assignments} memberships={memberships} canManageSchedule={isOwner} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="scoreboard" className="mt-0 min-w-0"><LeagueScoreboard account={account} user={user} games={isOwner ? games : myGames} assignments={assignments} memberships={memberships} isOwner={isOwner} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="leagues" className="mt-0 min-w-0"><LeagueConnectionsTab account={account} user={user} accounts={accounts} isOwner={isOwner} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="staff" className="mt-0 min-w-0"><LeagueConnectionsTab account={account} user={user} accounts={accounts} isOwner={isOwner} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="audit" className="mt-0 min-w-0"><LeagueAuditHistory games={games} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}