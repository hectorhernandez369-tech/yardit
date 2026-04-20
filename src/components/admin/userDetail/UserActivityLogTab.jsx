import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { subMonths } from "date-fns";
import { Loader2 } from "lucide-react";
import UserTrustSafetySummary from "./UserTrustSafetySummary";
import ActivityLogList from "../activityLog/ActivityLogList";

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
  const [activeFilter, setActiveFilter] = useState("all");
  const [showNoise, setShowNoise] = useState(false);

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
        users: Object.fromEntries((users || []).map((record) => [record.id, [record.first_name, record.last_name].filter(Boolean).join(" ") || record.email || record.id])),
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
        <ActivityLogList
          logs={logs}
          references={references}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          showNoise={showNoise}
          onToggleNoise={() => setShowNoise((value) => !value)}
          emptyText="No activity has been logged for this user yet."
        />
      </div>
    </div>
  );
}