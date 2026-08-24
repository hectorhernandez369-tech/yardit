import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { sendYarditNotification } from "@/lib/yarditNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { isLeagueAccount } from "@/lib/getUserVendorAccounts";

const normalize = (value) => String(value || "").trim().toLowerCase();

export default function TeamLeagueConnections({ account, user, onRefresh }) {
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const { data: organizations = [], refetch: refetchOrganizations } = useQuery({
    queryKey: ["teamLeagueSearch"],
    queryFn: () => base44.entities.VendorAccount.list("business_name", 250),
  });
  const { data: requests = [], refetch: refetchRequests } = useQuery({
    queryKey: ["teamLeagueRequests", account?.id],
    queryFn: () => base44.entities.LeagueJoinRequest.filter({ requesting_account_id: account.id }, "-created_at").catch(() => []),
    enabled: !!account?.id,
  });
  const { data: memberships = [], refetch: refetchMemberships } = useQuery({
    queryKey: ["teamLeagueMemberships", account?.id],
    queryFn: () => base44.entities.LeagueMembership.filter({ member_account_id: account.id }).catch(() => []),
    enabled: !!account?.id,
  });

  const leagues = useMemo(() => organizations.filter(isLeagueAccount), [organizations]);
  const accepted = memberships.filter((item) => item.status === "active");
  const acceptedIds = new Set(accepted.map((item) => item.league_account_id));
  const pendingIds = new Set(requests.filter((item) => item.status === "pending").map((item) => item.league_account_id));
  const results = useMemo(() => {
    const term = normalize(search);
    if (!term) return [];
    return leagues.filter((league) => [league.business_name, league.vendor_display_name, league.business_city, league.business_state, league.vendor_account_number].some((value) => normalize(value).includes(term))).slice(0, 15);
  }, [leagues, search]);

  const leagueName = (id) => leagues.find((league) => league.id === id)?.business_name || "League";

  const sendRequest = async (league) => {
    if (!user?.email) return toast.error("A verified Yardit login is required.");
    if (acceptedIds.has(league.id)) return toast.error("This Team is already connected to that League.");
    if (pendingIds.has(league.id)) return toast.error("A request is already pending.");
    const now = new Date().toISOString();
    await base44.entities.LeagueJoinRequest.create({
      league_account_id: league.id,
      requesting_account_id: account.id,
      requesting_user_id: user.id,
      requesting_name: user.full_name || user.email,
      requesting_email: user.email,
      requesting_email_verified: true,
      organization_name: account.business_name,
      organization_account_number: account.vendor_account_number || account.account_number,
      town_name: account.business_city || account.location || "",
      sport: account.business_category || "",
      request_message: message,
      status: "pending",
      created_at: now,
    });
    if (league.owner_user_id) {
      await sendYarditNotification({ user_id: league.owner_user_id, userId: league.owner_user_id, title: "New team join request", message: `${account.business_name} is requesting to join ${league.business_name}.`, type: "league_join_request", related_entity_type: "LeagueJoinRequest", deep_link: "/LeagueTeamDashboard?tab=leagues" }).catch(() => {});
    }
    toast.success("Request sent to the League.");
    setMessage("");
    refetchRequests();
    onRefresh?.();
  };

  const refresh = () => { refetchOrganizations(); refetchRequests(); refetchMemberships(); onRefresh?.(); };

  return <div className="space-y-4">
    <Card className="rounded-2xl bg-white">
      <CardHeader><CardTitle className="text-[#2C4F4E]">My Leagues</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {accepted.length === 0 ? <p className="text-sm text-slate-500">This Team has not been accepted into a League yet.</p> : accepted.map((membership) => <div key={membership.id} className="flex items-center justify-between rounded-xl border p-3"><div><p className="font-bold text-[#2C4F4E]">{leagueName(membership.league_account_id)}</p><p className="text-xs text-slate-500">Connected League</p></div><Badge className="bg-green-100 text-green-800">Accepted</Badge></div>)}
      </CardContent>
    </Card>

    <Card className="rounded-2xl bg-white">
      <CardHeader><CardTitle className="flex items-center gap-2 text-[#2C4F4E]"><Search className="h-5 w-5" /> Find a League</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search League name, city, state, or account number" />
        <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Optional message to the League" />
        {!search && <p className="text-sm text-slate-500">Search for the League this Team belongs to. The League must approve the request before its Master Schedule can be used here.</p>}
        {search && results.length === 0 && <p className="text-sm text-slate-500">No League accounts found.</p>}
        {results.map((league) => {
          const acceptedNow = acceptedIds.has(league.id);
          const pending = pendingIds.has(league.id);
          return <div key={league.id} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-[#2C4F4E]">{league.business_name}</p><p className="text-xs text-slate-500">{[league.business_city, league.business_state].filter(Boolean).join(", ")} {league.vendor_account_number ? `· ${league.vendor_account_number}` : ""}</p></div><Button disabled={acceptedNow || pending} onClick={() => sendRequest(league)} className="bg-[#5DADA5] text-white hover:bg-[#4A9B93]">{acceptedNow ? "Accepted" : pending ? "Pending" : "Request to Join"}</Button></div>;
        })}
        <Button variant="outline" size="sm" onClick={refresh}>Refresh</Button>
      </CardContent>
    </Card>
  </div>;
}