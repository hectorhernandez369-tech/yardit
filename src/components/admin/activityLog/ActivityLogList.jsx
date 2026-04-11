import React from "react";
import { formatYarditDateTime } from "@/lib/dateTime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ACTIVITY_FILTERS, getActivityCardData, groupLogsByDate, matchesFilter } from "./logUiUtils";
import { buildChangeSummary, parseJsonSafe } from "../adminLogsUtils";

const toneClasses = {
  green: "bg-green-50 border-green-200 text-green-800",
  orange: "bg-orange-50 border-orange-200 text-orange-800",
  red: "bg-red-50 border-red-200 text-red-800",
  blue: "bg-blue-50 border-blue-200 text-blue-800",
  slate: "bg-slate-50 border-slate-200 text-slate-700",
};

function FilterBar({ activeFilter, onFilterChange, showNoise, onToggleNoise }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ACTIVITY_FILTERS.map((filter) => (
          <button
            key={filter.key}
            onClick={() => onFilterChange(filter.key)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${activeFilter === filter.key ? "bg-[#2C4F4E] text-white border-[#2C4F4E]" : "bg-white text-[#2C4F4E] border-slate-200"}`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <button
        onClick={onToggleNoise}
        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${showNoise ? "bg-slate-100 text-slate-700 border-slate-300" : "bg-white text-slate-500 border-slate-200"}`}
      >
        Show Activity Noise
      </button>
    </div>
  );
}

function ActivityCard({ log, references }) {
  const [expanded, setExpanded] = React.useState(false);
  const card = getActivityCardData(log, references);
  const changes = buildChangeSummary(log, references);
  const payload = parseJsonSafe(log.event_payload || log.metadata);
  const rawData = {
    old_value: parseJsonSafe(log.old_value),
    new_value: parseJsonSafe(log.new_value),
    metadata: payload,
    raw_json: {
      ...log,
      event_payload: parseJsonSafe(log.event_payload),
    },
  };

  return (
    <button
      onClick={() => setExpanded((value) => !value)}
      className={`w-full rounded-2xl border p-4 text-left shadow-sm transition-colors ${toneClasses[card.tone] || toneClasses.slate}`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold leading-5 text-sm line-clamp-1">{card.title}</div>
            <div className="text-[11px] opacity-80 mt-1">{formatYarditDateTime(log.created_at || log.created_date, { includeSeconds: true })}</div>
          </div>
          <Badge className="shrink-0 bg-white/70 text-current border border-current/10">{card.isNoise ? "Noise" : "Key"}</Badge>
        </div>

        <div className="space-y-1 text-xs leading-5">
          <p className="line-clamp-1"><span className="font-semibold">Actor:</span> {card.actor}</p>
          <p className="line-clamp-1"><span className="font-semibold">Target:</span> {card.target}</p>
          <p className="line-clamp-1"><span className="font-semibold">Location:</span> {card.location}</p>
          <p className={`text-[12px] ${expanded ? "" : "line-clamp-1"}`}>{card.preview}</p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span>Tap to {expanded ? "collapse" : "expand"}</span>
        </div>

        {expanded && (
          <div className="mt-3 space-y-3 rounded-xl bg-white/70 p-3 text-xs text-slate-700">
            {changes.length > 0 && (
              <div>
                <div className="font-semibold mb-1">Before / After</div>
                <div className="space-y-1">
                  {changes.map((change, index) => (
                    <div key={`${change.field}-${index}`} className="rounded-lg bg-slate-50 px-2 py-1.5">
                      <div className="font-medium">{change.field}</div>
                      <div>Before: {change.before || "—"}</div>
                      <div>After: {change.after || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {payload && (
              <div>
                <div className="font-semibold mb-1">Metadata</div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2">{JSON.stringify(payload, null, 2)}</pre>
              </div>
            )}

            <div>
              <div className="font-semibold mb-1">Raw JSON</div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2">{JSON.stringify(rawData.raw_json, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

export default function ActivityLogList({ logs, references, activeFilter, onFilterChange, showNoise, onToggleNoise, emptyText = "No activity found." }) {
  const visibleLogs = logs.filter((log) => matchesFilter(log, activeFilter)).filter((log) => showNoise || !getActivityCardData(log, references).isNoise);
  const groups = groupLogsByDate(visibleLogs);

  return (
    <div className="space-y-4">
      <FilterBar
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        showNoise={showNoise}
        onToggleNoise={onToggleNoise}
      />

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white/60 p-6 text-sm text-slate-500">{emptyText}</div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.key} className="space-y-3">
              <div className="sticky top-0 z-10 bg-[#F3E6CF]/95 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm">
                {group.label}
              </div>
              <div className="space-y-3">
                {group.logs.map((log) => (
                  <ActivityCard key={`${log._source || "log"}-${log.id}`} log={log} references={references} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}