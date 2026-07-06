import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import VendorBusinessPage from "@/components/vendor/VendorBusinessPage";
import VendorBillingTab from "@/components/vendor/VendorBillingTab";
import VendorUsersTab from "@/components/vendor/VendorUsersTab";
import VendorPinHistoryTab from "@/components/vendor/VendorPinHistoryTab";
import { getUserVendorAccounts } from "@/lib/getUserVendorAccounts";
import LeagueAccessDenied from "@/components/league/LeagueAccessDenied";
import LeagueDashboardHeader from "@/components/league/LeagueDashboardHeader";
import LeagueTeamsTab from "@/components/league/LeagueTeamsTab";
import LeagueGamesTab from "@/components/league/LeagueGamesTab";

export default function LeagueTeamDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const requestedTab = new URLSearchParams(window.location.search).get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(requestedTab);
  const [activeAccountId, setActiveAccountId] = useState(null);

  const { data: user, isLoading: loadingUser } = useQuery({ queryKey: ["leagueDashboardUser"], queryFn: () => base44.auth.me() });
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({ queryKey: ["leagueDashboardAccounts", user?.id, user?.email], queryFn: () => getUserVendorAccounts(user), enabled: !!user?.id || !!user?.email });

  const storageKey = user?.id || user?.email ? `yardit_default_league_account_id:${user.id || user.email}` : "yardit_default_league_account_id";

  useEffect(() => {
    if (loadingAccounts) return;
    if (!accounts.length) return setActiveAccountId(null);
    const paramId = new URLSearchParams(window.location.search).get("account");
    const savedId = localStorage.getItem(storageKey);
    if (paramId && accounts.find((item) => item.id === paramId)) setActiveAccountId(paramId);
    else if (savedId && accounts.find((item) => item.id === savedId)) setActiveAccountId(savedId);
    else setActiveAccountId(accounts[0].id);
  }, [accounts, loadingAccounts, storageKey]);

  useEffect(() => setActiveTab(requestedTab), [requestedTab]);

  const account = accounts.find((item) => item.id === activeAccountId) || accounts[0] || null;
  const isOwner = !!account && (account.owner_user_id === user?.id || account.owner_user_id === user?.email || account.owner_email === user?.email);

  const { data: users = [] } = useQuery({ queryKey: ["leagueDashboardUsers", account?.id], queryFn: () => base44.entities.VendorAuthorizedUser.filter({ vendor_account_id: account.id }, "-created_date"), enabled: !!account?.id });
  const { data: updates = [] } = useQuery({ queryKey: ["leagueDashboardUpdates", account?.id], queryFn: () => base44.entities.VendorUpdate.filter({ vendor_account_id: account.id }, "-created_date"), enabled: !!account?.id });

  const refreshDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ["leagueDashboardAccounts"] });
    queryClient.invalidateQueries({ queryKey: ["leagueDashboardUsers"] });
    queryClient.invalidateQueries({ queryKey: ["leagueDashboardUpdates"] });
  };

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", nextTab);
    navigate(`/LeagueTeamDashboard?${params.toString()}`, { replace: true });
  };

  const handleSelectAccount = (nextAccount) => {
    setActiveAccountId(nextAccount.id);
    localStorage.setItem(storageKey, nextAccount.id);
    navigate(`/LeagueTeamDashboard?tab=${activeTab}&account=${nextAccount.id}`, { replace: true });
  };

  if (loadingUser || loadingAccounts) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#5DADA5]" /></div>;
  if (!account) return <LeagueAccessDenied />;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <LeagueDashboardHeader account={account} accounts={accounts} onSelect={handleSelectAccount} />
        <div className="border-b bg-white">
          <TabsList className="mx-auto flex h-auto max-w-7xl justify-start overflow-x-auto rounded-none bg-transparent p-0">
            {[{ value: "profile", label: "My Page" }, { value: "teams", label: "Teams" }, { value: "games", label: "Games" }, { value: "history", label: "History" }, { value: "tier", label: "Plan & Billing" }, { value: "users", label: "Staff" }].map((tab) => <TabsTrigger key={tab.value} value={tab.value} className="rounded-none px-4 py-3 text-sm font-semibold data-[state=active]:text-[#2C4F4E]">{tab.label}</TabsTrigger>)}
          </TabsList>
        </div>
        <div className="mx-auto max-w-7xl space-y-4 p-3 pb-24 sm:p-6 sm:pb-24">
          <TabsContent value="profile"><VendorBusinessPage account={account} pins={[]} checkIns={[]} updates={updates} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="teams"><LeagueTeamsTab account={account} /></TabsContent>
          <TabsContent value="games"><LeagueGamesTab account={account} /></TabsContent>
          <TabsContent value="history"><VendorPinHistoryTab pins={[]} checkIns={[]} /></TabsContent>
          <TabsContent value="tier"><VendorBillingTab account={account} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="users"><VendorUsersTab account={account} users={users} user={user} pins={[]} isOwner={isOwner} onRefresh={refreshDashboard} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}