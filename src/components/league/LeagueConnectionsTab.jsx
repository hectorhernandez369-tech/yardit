import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { isLeagueTeamAccount } from "@/lib/getUserVendorAccounts";
import { ROLE_PRESETS } from "@/lib/leaguePermissions";

const activeStatuses = new Set(["pending", "approved"]);
const normalize = (value) => String(value || "").trim().toLowerCase();

export default function LeagueConnectionsTab({ account, user, accounts = [], isOwner, onRefresh }) {
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [divisionText, setDivisionText] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteType, setInviteType] = useState("team_organization");
  const [inviteRole, setInviteRole] = useState("Read Only");
  const [assignRequestId, setAssignRequestId] = useState("");
  const [assignTeamId, setAssignTeamId] = useState("");
  const [assignEdit, setAssignEdit] = useState(false);
  const [assignScore, setAssignScore] = useState(false);

  const { data: leagues = [], refetch: refetchLeagues } = useQuery({ queryKey: ["leagueFindCandidates"], queryFn: () => base44.entities.VendorAccount.list("business_name", 200) });
  const { data: requests = [], refetch: refetchRequests } = useQuery({ queryKey: ["leagueJoinRequests", account?.id], queryFn: async () => {
    const [incoming, outgoing] = await Promise.all([
      base44.entities.LeagueJoinRequest.filter({ league_account_id: account.id }, "-created_at").catch(() => []),
      base44.entities.LeagueJoinRequest.filter({ requesting_account_id: account.id }, "-created_at").catch(() => []),
    ]);
    return [...incoming, ...outgoing].filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index);
  }, enabled: !!account?.id });
  const { data: memberships = [], refetch: refetchMemberships } = useQuery({ queryKey: ["leagueMemberships", account?.id], queryFn: async () => {
    const [owned, member] = await Promise.all([
      base44.entities.LeagueMembership.filter({ league_account_id: account.id }, "-invited_at").catch(() => []),
      base44.entities.LeagueMembership.filter({ member_account_id: account.id }, "-invited_at").catch(() => []),
    ]);
    return [...owned, ...member].filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index);
  }, enabled: !!account?.id });
  const { data: teams = [], refetch: refetchTeams } = useQuery({ queryKey: ["leagueTeamsForAssignments", account?.id], queryFn: () => base44.entities.LeagueTeam.filter({ league_account_id: account.id, is_active: true }, "team_name"), enabled: !!account?.id && isOwner });

  const candidateLeagues = useMemo(() => {
    const term = normalize(search);
    return leagues.filter((league) => league.id !== account.id && isLeagueTeamAccount(league)).filter((league) => {
      if (!term) return false;
      return [league.business_name, league.vendor_display_name, league.business_city, league.business_state, league.vendor_account_number, league.account_number, league.business_category, league.season].some((field) => normalize(field).includes(term));
    }).slice(0, 12);
  }, [leagues, account.id, search]);

  const myPendingRequestIds = new Set(requests.filter((request) => request.requesting_account_id === account.id && request.status === "pending").map((request) => request.league_account_id));
  const incomingRequests = requests.filter((request) => request.league_account_id === account.id);
  const outgoingRequests = requests.filter((request) => request.requesting_account_id === account.id);
  const selectedRequest = incomingRequests.find((request) => request.id === assignRequestId);
  const assignmentTeams = useMemo(() => {
    const unique = new Map();
    teams.forEach((team) => {
      const name = normalize(team.team_name);
      if (name && !unique.has(name)) unique.set(name, team);
    });
    return [...unique.values()];
  }, [teams]);

  const refreshAll = () => {
    refetchLeagues();
    refetchRequests();
    refetchMemberships();
    refetchTeams();
    onRefresh?.();
  };

  const submitJoinRequest = async (league) => {
    if (!user?.email) return toast.error("A verified login email is required.");
    if (myPendingRequestIds.has(league.id) || requests.some((request) => request.league_account_id === league.id && request.requesting_account_id === account.id && activeStatuses.has(request.status))) return toast.error("A request is already pending for this league.");
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
      requested_divisions: divisionText.split(",").map((item) => item.trim()).filter(Boolean),
      request_message: message,
      status: "pending",
      created_at: now,
    });
    if (league.owner_user_id) {
      await base44.entities.Notification.create({ user_id: league.owner_user_id, userId: league.owner_user_id, title: "New league join request", message: `${user.full_name || user.email} from ${account.business_name} is requesting to join ${league.business_name}. Verified email: ${user.email}`, type: "league_join_request", related_entity_type: "LeagueJoinRequest", deep_link: "/LeagueTeamDashboard?tab=leagues" }).catch(() => {});
    }
    setMessage("");
    toast.success("Join request sent.");
    refreshAll();
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return toast.error("Enter an email to invite.");
    const now = new Date().toISOString();
    await base44.entities.LeagueMembership.create({ league_account_id: account.id, invited_email: inviteEmail.trim().toLowerCase(), membership_type: inviteType, role: inviteRole, status: "invited", permissions: ROLE_PRESETS[inviteRole] || ["view_full_schedule"], invited_by_user_id: user.id, invited_at: now });
    await base44.entities.Notification.create({ user_email: inviteEmail.trim().toLowerCase(), title: "League invite received", message: `${account.business_name} invited you to join their league workspace.`, type: "league_invite_received", related_entity_type: "LeagueMembership", deep_link: "/LeagueTeamDashboard?tab=leagues" }).catch(() => {});
    setInviteEmail("");
    toast.success("League invitation created.");
    refreshAll();
  };

  const reviewRequest = async (request, status) => {
    await base44.entities.LeagueJoinRequest.update(request.id, { status, reviewed_by_user_id: user.id, reviewed_at: new Date().toISOString() });
    if (status === "approved") {
      await base44.entities.LeagueMembership.create({ league_account_id: account.id, member_account_id: request.requesting_account_id, member_user_id: request.requesting_user_id, invited_email: request.requesting_email, membership_type: "team_organization", role: "Read Only", status: "active", permissions: ["view_full_schedule"], invited_by_user_id: user.id, invited_at: request.created_at, accepted_at: new Date().toISOString() });
      await base44.entities.Notification.create({ user_id: request.requesting_user_id, userId: request.requesting_user_id, title: "Join request approved", message: `${account.business_name} approved your request. Your account has view-only access until teams and permissions are assigned.`, type: "league_join_approved", related_entity_type: "LeagueJoinRequest", related_entity_id: request.id, deep_link: "/LeagueTeamDashboard?tab=schedule" }).catch(() => {});
      toast.success("Approved with view-only access. Assign teams before editing is allowed.");
    } else {
      await base44.entities.Notification.create({ user_id: request.requesting_user_id, userId: request.requesting_user_id, title: "Join request denied", message: `${account.business_name} denied your league join request.`, type: "league_join_denied", related_entity_type: "LeagueJoinRequest", related_entity_id: request.id }).catch(() => {});
      toast.success("Request denied.");
    }
    refreshAll();
  };

  const assignTeam = async () => {
    const team = assignmentTeams.find((item) => item.id === assignTeamId);
    if (!selectedRequest || !team) return toast.error("Choose a request and team.");
    const existing = await base44.entities.LeagueTeamAssignment.filter({ league_account_id: account.id, team_id: team.id, is_active: true }).catch(() => []);
    if (existing.some((item) => item.team_account_id !== selectedRequest.requesting_account_id)) return toast.error("That team is already assigned to another organization. Remove the current assignment first.");
    await base44.entities.LeagueTeamAssignment.create({ league_account_id: account.id, team_account_id: selectedRequest.requesting_account_id, team_id: team.id, team_name: team.team_name, town_name: team.town_name, division: team.division, season: team.season, can_edit_assigned_games: assignEdit, can_submit_scores: assignScore, is_active: true });
    await base44.entities.LeagueMembership.create({ league_account_id: account.id, member_account_id: selectedRequest.requesting_account_id, member_user_id: selectedRequest.requesting_user_id, invited_email: selectedRequest.requesting_email, membership_type: "team_organization", role: "Team Manager", status: "active", permissions: assignScore ? ROLE_PRESETS["Team Manager"] : ["view_full_schedule"], invited_by_user_id: user.id, invited_at: selectedRequest.created_at, accepted_at: new Date().toISOString() });
    await base44.entities.Notification.create({ user_id: selectedRequest.requesting_user_id, userId: selectedRequest.requesting_user_id, title: "Team assignment completed", message: `${account.business_name} assigned ${team.team_name} to your league account.`, type: "league_team_assignment_completed", related_entity_type: "LeagueTeamAssignment", deep_link: "/LeagueTeamDashboard?tab=my_schedule" }).catch(() => {});
    setAssignRequestId("");
    setAssignTeamId("");
    toast.success("Team assignment completed.");
    refreshAll();
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#2C4F4E]">
            <Search className="h-5 w-5" /> Find and Join a League
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search league name, city, state, account number, sport, or season" />
          <div className="rounded-xl border bg-slate-50 p-3 text-sm">
            <p><strong>Organization:</strong> {account.business_name}</p>
            <p><strong>Requesting person:</strong> {user?.full_name || user?.email}</p>
            <p><strong>Verified email:</strong> {user?.email || "Required"}</p>
            <p><strong>Team account number:</strong> {account.vendor_account_number || account.account_number || "Not assigned"}</p>
            <p><strong>Town / Sport:</strong> {account.business_city || account.location || "Town not set"} · {account.business_category || "Sport not set"}</p>
          </div>
          <Input value={divisionText} onChange={(e) => setDivisionText(e.target.value)} placeholder="Requested divisions, comma-separated" />
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Optional message to the league owner" />
          {candidateLeagues.map((league) => (
            <div key={league.id} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-[#2C4F4E]">{league.business_name}</p>
                <p className="text-xs text-slate-500">{league.business_city}, {league.business_state} · {league.vendor_account_number || league.account_number}</p>
              </div>
              <Button disabled={myPendingRequestIds.has(league.id)} onClick={() => submitJoinRequest(league)} className="bg-[#5DADA5] text-white hover:bg-[#4A9B93]">
                {myPendingRequestIds.has(league.id) ? "Pending" : "Request to Join"}
              </Button>
            </div>
          ))}
          {search && candidateLeagues.length === 0 && <p className="text-sm text-slate-500">No leagues found. Try a different search.</p>}
          {!search && <p className="text-sm text-slate-500">Start typing to search for a league to join. The league owner must approve your request before your team is added.</p>}
        </CardContent>
      </Card>

      {isOwner && <Card className="rounded-2xl bg-white"><CardHeader><CardTitle className="flex items-center gap-2 text-[#2C4F4E]"><UserPlus className="h-5 w-5" /> Invitations & Requests</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-2 lg:grid-cols-[1fr_180px_180px_auto]"><Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Invite team or staff by email" /><Select value={inviteType} onValueChange={setInviteType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["team_organization", "league_staff", "scorekeeper", "scheduler", "viewer"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Select value={inviteRole} onValueChange={setInviteRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.keys(ROLE_PRESETS).map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent></Select><Button onClick={inviteMember} className="bg-[#5DADA5] text-white hover:bg-[#4A9B93]">Invite</Button></div>{incomingRequests.map((request) => <div key={request.id} className="rounded-xl border p-3"><div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between"><div><p className="font-bold text-[#2C4F4E]">{request.requesting_name} from {request.organization_name} is requesting to join {account.business_name}.</p><p className="text-xs text-slate-600">Verified email: {request.requesting_email}</p><p className="text-xs text-slate-600">Account: {request.organization_account_number || "None"} · Town: {request.town_name || "None"} · Sport: {request.sport || "None"}</p><p className="text-xs text-slate-600">Requested divisions: {(request.requested_divisions || []).join(", ") || "None"}</p><p className="text-xs text-slate-600">Created: {request.created_at ? new Date(request.created_at).toLocaleDateString() : "Unknown"}</p><p className="mt-1 text-sm text-slate-700">{request.request_message}</p></div><Badge>{request.status}</Badge></div>{request.status === "pending" && <div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => reviewRequest(request, "approved")} className="bg-[#5DADA5] text-white hover:bg-[#4A9B93]">Approve View-Only</Button><Button variant="outline" onClick={() => reviewRequest(request, "denied")}>Deny</Button></div>}</div>)}</CardContent></Card>}

      {isOwner && <Card className="rounded-2xl bg-white"><CardHeader><CardTitle className="flex items-center gap-2 text-[#2C4F4E]"><ShieldCheck className="h-5 w-5" /> Assign Teams & Editing Permissions</CardTitle></CardHeader><CardContent className="grid gap-2 lg:grid-cols-[1fr_1fr_auto_auto_auto]"><Select value={assignRequestId} onValueChange={setAssignRequestId}><SelectTrigger><SelectValue placeholder="Approved request" /></SelectTrigger><SelectContent>{incomingRequests.filter((request) => request.status === "approved").map((request) => <SelectItem key={request.id} value={request.id}>{request.organization_name} · {request.requesting_email}</SelectItem>)}</SelectContent></Select><Select value={assignTeamId} onValueChange={setAssignTeamId}><SelectTrigger><SelectValue placeholder="Official team" /></SelectTrigger><SelectContent>{assignmentTeams.map((team) => <SelectItem key={team.id} value={team.id}>{team.team_name}</SelectItem>)}</SelectContent></Select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={assignEdit} onChange={(e) => setAssignEdit(e.target.checked)} /> Edit games</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={assignScore} onChange={(e) => setAssignScore(e.target.checked)} /> Submit scores</label><Button onClick={assignTeam} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">Assign</Button></CardContent></Card>}

      <Card className="rounded-2xl bg-white"><CardHeader><CardTitle className="text-[#2C4F4E]">Membership History</CardTitle></CardHeader><CardContent className="space-y-2">{[...memberships, ...outgoingRequests].length === 0 ? <p className="text-sm text-slate-500">No league membership history yet.</p> : [...memberships, ...outgoingRequests].map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border p-3 text-sm"><span>{item.organization_name || item.invited_email || item.member_account_id || item.league_account_id}</span><Badge>{item.status}</Badge></div>)}</CardContent></Card>
    </div>
  );
}