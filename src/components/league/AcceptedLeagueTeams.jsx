import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const splitName = (fullName = "") => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || "—", lastName: parts.slice(1).join(" ") || "—" };
};

export default function AcceptedLeagueTeams({ account }) {
  const { data: acceptedTeams = [] } = useQuery({
    queryKey: ["acceptedLeagueTeams", account?.id],
    queryFn: () => base44.entities.LeagueJoinRequest.filter({ league_account_id: account.id, status: "approved" }, "organization_name"),
    enabled: !!account?.id,
  });

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardHeader><CardTitle className="text-[#2C4F4E]">Accepted Teams</CardTitle></CardHeader>
      <CardContent>
        {acceptedTeams.length === 0 ? <p className="text-sm text-slate-600">No accepted teams yet.</p> : (
          <div className="grid gap-2 md:grid-cols-2">
            {acceptedTeams.map((item) => {
              const { firstName, lastName } = splitName(item.requesting_name);
              return <div key={item.id} className="rounded-xl border p-3 text-sm"><p className="font-bold text-[#2C4F4E]">{item.organization_name}</p><p>{item.requesting_email}</p><p>{firstName}</p><p>{lastName}</p></div>;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}