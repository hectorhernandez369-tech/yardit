import LeagueEventMapWorkstation from "@/components/league/map/LeagueEventMapWorkstation";

export default function LeagueEventMap() {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("id") || params.get("event_id");
  if (!eventId) return <div className="p-6 text-center text-sm text-slate-500">Missing event id.</div>;
  return <LeagueEventMapWorkstation eventId={eventId} />;
}