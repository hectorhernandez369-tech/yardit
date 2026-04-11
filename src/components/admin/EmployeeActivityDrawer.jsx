import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { formatYarditDateTime } from "@/lib/dateTime";
import { buildChangeSummary, formatPageArea, getFriendlyActionLabel } from "./adminLogsUtils";

function LogEntry({ log, references }) {
  const [expanded, setExpanded] = useState(false);
  const meta = log.metadata ? (() => { try { return JSON.parse(log.metadata); } catch { return log.metadata; } })() : null;
  const changes = buildChangeSummary(log, references);

  return (
    <div className="border-b py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[#2C4F4E]">{getFriendlyActionLabel(log)}</span>
            <Badge className="bg-slate-100 text-slate-700 text-[10px]">Admin Log</Badge>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatYarditDateTime(log.created_at || log.created_date, { includeSeconds: true })}
          </p>
          <p className="text-xs text-gray-600 mt-1">{formatPageArea(log.page)}</p>
          {changes.length > 0 && (
            <p className="text-xs text-gray-700 mt-1">{changes.map((change) => `${change.field}: ${change.before || "None"} → ${change.after || "None"}`).join(" • ")}</p>
          )}
          {log.comment && <p className="text-xs text-gray-700 mt-1">{log.comment}</p>}
        </div>
      </div>
      {(meta || log.old_value || log.new_value || log.event_payload) && (
        <div className="mt-1.5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[#5DADA5] hover:underline flex items-center gap-1"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            View details
          </button>
          {expanded && (
            <pre className="mt-1 p-2 bg-gray-50 rounded text-[11px] text-gray-700 overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify({ metadata: meta, old_value: log.old_value, new_value: log.new_value, event_payload: log.event_payload }, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function EmployeeActivityDrawer({ open, onClose, admin }) {
  const [logs, setLogs] = useState([]);
  const [references, setReferences] = useState({ admins: {}, users: {} });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !admin) return;
    const load = async () => {
      setLoading(true);
      const [byUser, byEmpId, adminActions, adminEvents, adminProfiles] = await Promise.all([
        admin.user_id ? base44.entities.AdminAuditLog.filter({ user_id: admin.user_id }, "-created_date", 100) : Promise.resolve([]),
        base44.entities.AdminAuditLog.filter({ admin_employee_id: admin.employee_id }, "-created_date", 100),
        admin.user_id ? base44.entities.AdminAction.filter({ admin_id: admin.user_id }, "-created_date", 200).catch(() => []) : Promise.resolve([]),
        admin.user_id ? base44.entities.AdminEvent.filter({ admin_id: admin.user_id }, "-created_date", 200).catch(() => []) : Promise.resolve([]),
        base44.entities.AdminProfile.list("-created_date", 200).catch(() => []),
      ]);
      const refs = {
        admins: Object.fromEntries(adminProfiles.map((record) => {
          const profile = record.data || record;
          const label = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || "Unknown Admin";
          return [profile.user_id, `${label} – ${profile.employee_id || "No Employee ID"}`];
        })),
        users: {},
      };
      setReferences(refs);
      const map = new Map();
      [...byUser, ...byEmpId, ...adminActions, ...adminEvents].forEach(l => map.set(`${l.entity_name || "log"}-${l.id}`, l));
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date)
      );
      setLogs(merged);
      setLoading(false);
    };
    load();
  }, [open, admin]);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">
            Activity: {admin?.first_name} {admin?.last_name}
            <span className="text-xs font-mono text-gray-500 ml-2">({admin?.employee_id})</span>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No activity found.</p>
          ) : (
            <div className="divide-y-0">
              {logs.map((log) => <LogEntry key={`${log.entity_name || 'log'}-${log.id}`} log={log} references={references} />)}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}