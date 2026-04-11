import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { subMonths } from "date-fns";
import { formatYarditDateTime } from "@/lib/dateTime";
import { Loader2, Shield } from "lucide-react";
import UserTrustSafetySummary from "./UserTrustSafetySummary";
import { buildChangeSummary, formatPageArea, getFriendlyActionLabel, getTargetSummary, parseJsonSafe } from "../adminLogsUtils";

function formatTarget(log, references = {}) {
  if (log._source === "admin_log") {
    return getTargetSummary(log, references);
  }
  if (!log.target_type) return "—";
  if (!log.target_id) return log.target_type;
  return `${log.target_type} • ${String(log.target_id).slice(0, 8)}`;
}

function formatDetails(log, references = {}) {
  if (log._source === "admin_log") {
    const changes = buildChangeSummary(log, references);
    if (changes.length > 0) {
      return changes.map((change) => `${change.field}: ${change.before || "None"} → ${change.after || "None"}`).join(" • ");
    }
    if (log.comment) return log.comment;
    const payload = parseJsonSafe(log.event_payload);
    if (payload && typeof payload === "object") {
      return Object.entries(payload)
        .slice(0, 3)
        .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`)
        .join(" • ");
    }
    return "—";
  }

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
  const twelveMonthsAgo = subMonths(new Date(), 12).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["userActivityLogs", user.id, user.email],
    queryFn: async () => {
      const [userLogs, guestLogs, adminProfiles, adminActions, adminEvents, cases, listings, users] = await Promise.all([
        base44.entities.UserActivityLog.filter({ user_id: user.id }, "-created_date", 1000),
        user.email ? base44.entities.UserActivityLog.filter({ details_json: { email: user.email } }, "-created_date", 1000).catch(() => []) : Promise.resolve([]),
        base44.entities.AdminProfile.list("-created_date", 200).catch(() => []),
        base44.entities.AdminAction.list("-created_date", 400).catch(() => []),
        base44.entities.AdminEvent.list("-created_date", 400).catch(() => []),
        base44.entities.Case.list("-created_date", 300).catch(() => []),
        base44.entities.Listing.list("-created_date", 300).catch(() => []),
        base44.entities.User.list("-created_date", 300).catch(() => []),
      ]);

      const matchedAdminProfiles = adminProfiles.filter((record) => {
        const profile = record.data || record;
        return profile.user_id === user.id || (user.email && profile.email === user.email.toLowerCase());
      });
      const adminUserIds = matchedAdminProfiles.map((record) => (record.data || record).user_id).filter(Boolean);
      const adminEmployeeIds = matchedAdminProfiles.map((record) => (record.data || record).employee_id).filter(Boolean);

      const adminLogs = [...adminActions, ...adminEvents]
        .filter((log) => adminUserIds.includes(log.admin_id))
        .map((log) => ({ ...log, _source: "admin_log" }));

      const mergedLogs = [...userLogs, ...guestLogs, ...adminLogs].filter(
        (log, index, arr) => arr.findIndex((item) => `${item._source || "user"}-${item.id}` === `${log._source || "user"}-${log.id}`) === index
      );

      const references = {
        admins: Object.fromEntries(
          adminProfiles.map((record) => {
            const profile = record.data || record;
            const label = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || "Unknown Admin";
            return [profile.user_id, `${label} – ${profile.employee_id || "No Employee ID"}`];
          })
        ),
        cases: Object.fromEntries(cases.map((record) => [record.id, record.account_number || record.id])),
        listings: Object.fromEntries(listings.map((record) => [record.id, record.title || record.listingNumber || record.id])),
        users: Object.fromEntries(users.map((record) => [record.id, record.email || record.full_name || record.id])),
      };

      const logs = mergedLogs
        .filter((log) => new Date(log.created_at || log.created_date).toISOString() >= twelveMonthsAgo)
        .sort((a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date));

      return { logs, references };
    },
    initialData: { logs: [], references: { admins: {}, cases: {}, listings: {}, users: {} } },
  });

  const logs = data.logs || [];
  const references = data.references || { admins: {}, cases: {}, listings: {}, users: {} };

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
                    <td className="py-2 px-3 whitespace-nowrap">{formatYarditDateTime(log.created_at || log.created_date)}</td>
                    <td className="py-2 px-3 font-medium">
                      <div className="flex items-center gap-2">
                        {log._source === "admin_log" && <Shield className="w-3.5 h-3.5 text-[#5DADA5]" />}
                        <span>{log._source === "admin_log" ? getFriendlyActionLabel(log) : (log.event_label || log.event_type)}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">{formatTarget(log, references)}</td>
                    <td className="py-2 px-3 text-gray-600 break-words">
                      {formatDetails(log, references)}
                      {log._source === "admin_log" && (
                        <div className="mt-1 text-xs text-gray-400">{formatPageArea(log.page)}</div>
                      )}
                    </td>
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