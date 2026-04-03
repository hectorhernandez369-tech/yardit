import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";

function LogEntry({ log }) {
  const [expanded, setExpanded] = useState(false);
  const meta = log.metadata ? (() => { try { return JSON.parse(log.metadata); } catch { return log.metadata; } })() : null;

  return (
    <div className="border-b py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-[#2C4F4E]">{log.action_type}</span>
            <Badge className={log.success ? "bg-green-100 text-green-800 text-[10px]" : "bg-red-100 text-red-800 text-[10px]"}>
              {log.success ? "Success" : "Failed"}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {log.created_at || log.created_date ? format(new Date(log.created_at || log.created_date), "MMM d, yyyy h:mm:ss a") : "—"}
          </p>
          {(log.target_type || log.target_id) && (
            <p className="text-xs text-gray-600 mt-1">
              {log.target_type && <span className="capitalize">{log.target_type}</span>}
              {log.target_id && <span className="font-mono ml-1">#{log.target_id}</span>}
            </p>
          )}
        </div>
      </div>
      {meta && (
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
              {typeof meta === "string" ? meta : JSON.stringify(meta, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function EmployeeActivityDrawer({ open, onClose, admin }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !admin) return;
    const load = async () => {
      setLoading(true);
      const [byUser, byEmpId] = await Promise.all([
        admin.user_id ? base44.entities.AdminAuditLog.filter({ user_id: admin.user_id }, "-created_date", 100) : Promise.resolve([]),
        base44.entities.AdminAuditLog.filter({ admin_employee_id: admin.employee_id }, "-created_date", 100),
      ]);
      // Merge and deduplicate by id, newest first
      const map = new Map();
      [...byUser, ...byEmpId].forEach(l => map.set(l.id, l));
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
              {logs.map((log) => <LogEntry key={log.id} log={log} />)}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}