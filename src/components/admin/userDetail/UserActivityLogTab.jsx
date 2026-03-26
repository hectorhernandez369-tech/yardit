import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import UserTrustSafetySummary from "./UserTrustSafetySummary";

function formatTarget(log) {
  if (!log.target_type) return "—";
  if (!log.target_id) return log.target_type;
  return `${log.target_type} • ${String(log.target_id).slice(0, 8)}`;
}

function formatDetails(log) {
  if (log.before_value || log.after_value) {
    return `${log.before_value || "—"} → ${log.after_value || "—"}`;
  }

  if (!log.details_json) return "—";
  if (typeof log.details_json === "string") return log.details_json;

  const preview = Object.entries(log.details_json)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`)
    .join(" • ");

  return preview || "—";
}

export default function UserActivityLogTab({ user }) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["userActivityLogs", user.id],
    queryFn: () => base44.entities.UserActivityLog.filter({ user_id: user.id }, "-created_date"),
    initialData: [],
  });

  if (isLoading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <UserTrustSafetySummary user={user} />

      <div>
        <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-2">Activity Log</h3>
        {logs.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-sm text-gray-500">No activity has been logged for this user yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-gray-600">
                  <th className="py-2 px-3">Date/Time</th>
                  <th className="py-2 px-3">Event</th>
                  <th className="py-2 px-3">Target</th>
                  <th className="py-2 px-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b align-top">
                    <td className="py-2 px-3 whitespace-nowrap">{format(new Date(log.created_at || log.created_date), "MMM d, yyyy h:mm a")}</td>
                    <td className="py-2 px-3 font-medium">{log.event_label || log.event_type}</td>
                    <td className="py-2 px-3">{formatTarget(log)}</td>
                    <td className="py-2 px-3 text-gray-600 break-words">{formatDetails(log)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}