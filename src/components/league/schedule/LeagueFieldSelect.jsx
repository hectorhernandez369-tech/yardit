import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { conflictsForAssignment, formatConflictMessage } from "@/lib/leagueFieldConflict";

const BLANK = "__none__";

// Field selector for Schedule Manager / game editor. Shows only active fields
// belonging to the selected League Event and blocks conflicting assignments.
export default function LeagueFieldSelect({ accountId, eventId, value, onChange, game, allGames = [], disabled }) {
  const { data: rawFields = [] } = useQuery({
    queryKey: ["leagueEventFields", accountId, eventId],
    queryFn: () => base44.entities.LeagueEventField.filter({ league_event_id: eventId, is_active: true }, "display_order"),
    enabled: !!eventId,
    initialData: [],
  });
  // Only active-status fields can host games; decorative map objects are never listed here.
  const fields = (rawFields || []).filter((f) => f.is_active !== false && (f.status || "active") === "active");

  const setField = (fieldId) => {
    if (fieldId === BLANK) {
      onChange?.({ league_event_field_id: "", field_name_snapshot: "" });
      return;
    }
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const conflicts = conflictsForAssignment(game, fieldId, allGames);
    onChange?.({ league_event_field_id: fieldId, field_name_snapshot: field.name, conflict: conflicts[0] });
  };

  return (
    <Select value={value || BLANK} onValueChange={setField} disabled={disabled || !eventId}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder={eventId ? "Assign field" : "Select event first"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={BLANK}>No field</SelectItem>
        {fields.map((field) => {
          const conflicts = conflictsForAssignment(game, field.id, allGames);
          const count = allGames.filter((g) => g.league_event_field_id === field.id).length;
          const label = `${field.name}${field.field_number ? ` #${field.field_number}` : ""} — ${count} game${count === 1 ? "" : "s"}${conflicts.length ? " · Conflict" : " · Available"}`;
          return (
            <SelectItem key={field.id} value={field.id} disabled={!!conflicts.length}>
              {label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}