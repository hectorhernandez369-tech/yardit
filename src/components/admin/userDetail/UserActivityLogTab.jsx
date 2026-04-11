import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { subMonths } from "date-fns";
import { formatYarditDateTime } from "@/lib/dateTime";
import { Loader2 } from "lucide-react";
import UserTrustSafetySummary from "./UserTrustSafetySummary";
import {
  buildChangeSummary,
  formatPageArea,
  getFriendlyActionLabel,
  getTargetSummary,
  parseJsonSafe,
} from "../adminLogsUtils";

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
      return changes.map((change) => `${change.field}: ${change.before || "—"} → ${change.after || "—"}`).join(" • ");
    }

    if (log.comment) return log.comment;

    const payload = parseJsonSafe(log.event_payload);
    if (!payload) return "—";
    if (typeof payload === "string") return payload;

    const preview = Object.entries(payload)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`)
      .join(" • ");

    return preview || "—";
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

function matchesSelectedUser(log, user) {
  const normalizedEmail = user.email?.toLowerCase?.() || "";
  const valuesToCheck = [
    log.admin_id,
    log.comment,
    log.page,
    log.old_value,
    log.new_value,
    log.event_payload,
    log.case_id,
    log.listing_id,
  ].filter(Boolean);

  return valuesToCheck.some((value) => String(value).toLowerCase().includes(user.id.toLowerCase())) ||
    (normalizedEmail && valuesToCheck.some((value) => String(value).toLowerCase().includes(normalizedEmail)));
}

export default function UserActivityLogTab({ user }) {
  const twelveMonthsAgo = subMonths(new Date(), 12).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["userActivityLogs", user.id],
    queryFn: async () => {
      const [userLogs, guestLogs, adminEvents, adminActions, adminProfiles, cases, listings, users] = await Promise.all([
        base44.entities.UserActivityLog.filter({ user_id: user.id }, "-created_date", 1000),
        user.email ? base44.entities.UserActivityLog.filter({ details_json: { email: user.email } }, "-created_date", 1000).catch(() => []) : Promise.resolve([]),
        base44.entities.AdminEvent.list("-created_date", 300),
        base44.entities.AdminAction.list("-created_date", 300),
        base44.entities.AdminProfile.list("-created_date", 200),
        base44.entities.Case.list("-created_date", 200),
        base44.entities.Listing.list("-created_date", 200),
        base44.entities.User.list("-created_date", 200),
      ]);

      const references = {
        admins: Object.fromEntries((adminProfiles || []).map((record) => {
          const profile = record.data || record;
          const label = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || "Unknown Admin";
          return [profile.user_id, `${label} – ${profile.employee_id || "No Employee ID"}`];
        })),
        cases: Object.fromEntries((cases || []).map((record) => {
          const item = record.data || record;
          return [record.id || item.id, item.account_number || record.id];
        })),
        listings: Object.fromEntries((listings || []).map((record) => {
          const item = record.data || record;
          return [record.id || item.id, item.title || item.listingNumber || record.id];
        })),
        users: Object.fromEntries((users || []).map((record) => [record.id, record.email || record.full_name || record.id])),
      };

      const mergedUserLogs = [...userLogs, ...guestLogs].filter(
        (log, index, arr) => arr.findIndex((item) => item.id === log.id) === index
      );

      const mergedAdminLogs = [...(adminEvents || []), ...(adminActions || [])]
        .filter((log) => matchesSelectedUser(log, user))
        .map((log) => ({ ...log, _source: "admin_log" }));

      const logs = [...mergedUserLogs, ...mergedAdminLogs]
        .filter((log, index, arr) => arr.findIndex((item) => `${item._source || "user_log"}-${item.id}` === `${log._source || "user_log"}-${log.id}`) === index)
        .filter((log) => new Date(log.created_at || log.created_date).toISOString() >= twelveMonthsAgo)
        .sort((a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date));

      return { logs, references };
    },
    initialData: { logs: [], references: { admins: {}, cases: {}, listings: {}, users: {} } },
  });

  const logs = data.logs || [];
  const references = data.references || {};

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
                  <tr key={`${log._source || "user_log"}-${log.id}`} className="border-b align-top">
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div>{formatYarditDateTime(log.created_at || log.created_date)}</div>
                      {log._source === "admin_log" && (
                        <div className="text-[11px] text-slate-500">{formatPageArea(log.page)}</div>
                      )}
                    </td>
                    <td className="py-2 px-3 font-medium">
                      {log._source === "admin_log" ? getFriendlyActionLabel(log) : (log.event_label || log.event_type)}
                    </td>
                    <td className="py-2 px-3">{formatTarget(log, references)}</td>
                    <td className="py-2 px-3 text-gray-600 break-words">{formatDetails(log, references)}</td>
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