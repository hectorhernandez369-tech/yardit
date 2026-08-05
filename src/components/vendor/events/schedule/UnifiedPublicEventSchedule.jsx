import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { getUnifiedEventSchedule } from "@/lib/unifiedEventSchedule";

const timeLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const dateLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
};

const gameStatusLabel = (game) => {
  const status = String(game?.status || "upcoming").toLowerCase();
  if (status === "final") return "Final";
  if (status === "halftime") return "Halftime";
  if (status === "live") return "Live";
  return timeLabel(game?.start_time);
};

const showGameScore = (game) => {
  const status = String(game?.status || "upcoming").toLowerCase();
  return ["live", "halftime", "final"].includes(status);
};

export default function UnifiedPublicEventSchedule({ leagueEventLinks = [], leagueGames = [], scheduleEntries = [], selectedSpotId = "", selectedFieldName = "", onClearField, onViewFieldOnMap }) {
  const schedule = getUnifiedEventSchedule({ leagueEventLinks, leagueGames, scheduleEntries });

  const filteredItems = useMemo(() => {
    if (!selectedSpotId && !selectedFieldName) return schedule.items;
    return schedule.items.filter((item) => {
      if (selectedSpotId) {
        if (item?.spot_id === selectedSpotId) return true;
        return !item?.spot_id && selectedFieldName && String(item?.field_name || "").trim().toLowerCase() === String(selectedFieldName).trim().toLowerCase();
      }
      return selectedFieldName && String(item?.field_name || "").trim().toLowerCase() === String(selectedFieldName).trim().toLowerCase();
    });
  }, [schedule.items, selectedSpotId, selectedFieldName]);

  if (!schedule.items.length) return null;

  const groups = filteredItems.reduce((result, item) => {
    const fieldName = String(item?.field_name || item?.location || "Main Event").trim() || "Main Event";
    if (!result[fieldName]) result[fieldName] = [];
    result[fieldName].push(item);
    return result;
  }, {});

  return (
    <Card id="public-event-schedule" className="rounded-3xl bg-white">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-[#2C4F4E]">{selectedFieldName ? `${selectedFieldName} Schedule` : "Schedule"}</h2>
            {selectedFieldName && <p className="text-sm text-slate-500">Showing activities assigned to this field.</p>}
          </div>
          {selectedFieldName && onClearField && <button type="button" onClick={onClearField} className="text-sm font-bold text-[#2C4F4E] underline">View all fields</button>}
        </div>

        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">No schedule entries are assigned to this field.</div>
        ) : (
          Object.entries(groups).map(([fieldName, rows]) => (
            <section key={fieldName} className="space-y-2">
              <h3 className="rounded-xl bg-[#2C4F4E] px-4 py-2 font-black text-white">{fieldName}</h3>
              {rows.map((item) => {
                const isLeagueGame = item.schedule_item_type === "league_game";
                return (
                  <div key={`${item.schedule_item_type}-${item.id}`} className="rounded-2xl border border-[#2C4F4E]/10 bg-[#FBFAF7] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {isLeagueGame ? (
                          <>
                            <p className="text-sm font-bold text-slate-500">{item.division || item.age_group || "Game"}</p>
                            <p className="font-black text-[#2C4F4E]">{item.home_team || "Home"} vs {item.away_team || "Away"}</p>
                          </>
                        ) : (
                          <p className="font-black text-[#2C4F4E]">{item.title}</p>
                        )}
                        <p className="mt-1 text-sm text-slate-600">{dateLabel(item.start_time)}{" · "}{timeLabel(item.start_time)}{item.end_time ? ` - ${timeLabel(item.end_time)}` : ""}</p>
                        {item.notes && <p className="mt-1 text-xs text-slate-500">{item.notes}</p>}
                        {isLeagueGame && item.league_event_field_id && onViewFieldOnMap && (
                          <button type="button" onClick={() => onViewFieldOnMap(item)} className="mt-2 inline-flex items-center gap-1 rounded-full border border-[#2C4F4E]/20 bg-white px-3 py-1 text-xs font-bold text-[#2C4F4E] hover:bg-[#5DADA5]/10">
                            <MapPin className="h-3 w-3" /> View Field on Map
                          </button>
                        )}
                      </div>
                      {isLeagueGame && (
                        <div className="shrink-0 text-right">
                          <Badge className="capitalize bg-[#5DADA5] text-white">{gameStatusLabel(item)}</Badge>
                          {showGameScore(item) && <p className="mt-2 text-lg font-black text-[#2C4F4E]">{Number(item.home_score || 0)} - {Number(item.away_score || 0)}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ))
        )}
      </CardContent>
    </Card>
  );
}