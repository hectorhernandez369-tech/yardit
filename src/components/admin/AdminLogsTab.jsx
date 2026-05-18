import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { formatYarditDateTime } from "@/lib/dateTime";
import {
  buildChangeSummary,
  formatPageArea,
  getBadgeTone,
  getFriendlyActionLabel,
  getLogCategory,
  getTargetSummary,
  isLowPriorityLog,
  parseJsonSafe,
} from "./adminLogsUtils";

const badgeToneClasses = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  red: "bg-red-50 text-red-700 border-red-200",
  slate: "bg-slate-50 text-slate-700 border-slate-200",
};

const filterGroups = [
  { value: "all", label: "All" },
  { value: "admin", label: "Admin Actions" },
  { value: "case", label: "Case Actions" },
  { value: "listing", label: "Listing Actions" },
  { value: "user", label: "User Actions" },
  { value: "security", label: "Security / Access" },
  { value: "status", label: "Status Changes" },
];

const quickFilters = ["created", "updated", "deleted", "assigned", "approved", "rejected"];

export default function AdminLogsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState("all");
  const [showNavigationEvents, setShowNavigationEvents] = useState(false);
  const [expandedIds, setExpandedIds] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ["adminLogsAuditView"],
    queryFn: async () => {
      const [events, actions, adminProfiles, cases, listings, users] = await Promise.all([
        base44.entities.AdminEvent.list("-created_date", 150),
        base44.entities.AdminAction.list("-created_date", 150),
        base44.entities.AdminProfile.list("-created_date", 200),
        base44.entities.Case.list("-created_date", 200),
        base44.entities.Listing.list("-created_date", 200),
        base44.entities.User.list("-created_date", 200),
      ]);

      return { events, actions, adminProfiles, cases, listings, users };
    },
    initialData: { events: [], actions: [], adminProfiles: [], cases: [], listings: [], users: [] },
  });

  const references = useMemo(() => {
    const admins = Object.fromEntries(
      (data.adminProfiles || []).map((record) => {
        const profile = record.data || record;
        const label = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || "Unknown Admin";
        return [profile.user_id, `${label} – ${profile.employee_id || "No Employee ID"}`];
      })
    );

    const cases = Object.fromEntries(
      (data.cases || []).map((record) => {
        const item = record.data || record;
        return [record.id || item.id, item.account_number || record.id];
      })
    );

    const listings = Object.fromEntries(
      (data.listings || []).map((record) => {
        const item = record.data || record;
        return [record.id || item.id, item.title || item.listingNumber || record.id];
      })
    );

    const users = Object.fromEntries(
      (data.users || []).map((user) => [user.id, user.email || user.full_name || user.id])
    );

    return { admins, cases, listings, users };
  }, [data]);

  const allLogs = useMemo(() => {
    const events = (data.events || []).map((item) => ({ ...item, _kind: "event" }));
    const actions = (data.actions || []).map((item) => ({ ...item, _kind: "action" }));
    return [...events, ...actions].sort(
      (a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date)
    );
  }, [data]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      const type = (log.event_type || log.action_type || "").toLowerCase();
      const actionLabel = getFriendlyActionLabel(log).toLowerCase();
      const actor = (references.admins[log.admin_id] || log.admin_id || "").toLowerCase();
      const target = getTargetSummary(log, references).toLowerCase();
      const matchesSearch = !searchQuery.trim() || [type, actionLabel, actor, target, log.comment || ""].some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      );
      const matchesGroup = groupFilter === "all" || getLogCategory(log) === groupFilter;
      const matchesQuick = quickFilter === "all" || type.includes(quickFilter);
      const matchesNoise = showNavigationEvents || !isLowPriorityLog(log);
      return matchesSearch && matchesGroup && matchesQuick && matchesNoise;
    });
  }, [allLogs, searchQuery, groupFilter, quickFilter, showNavigationEvents, references]);

  const toggleExpanded = (id) => setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));

  if (isLoading) {
    return <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="mt-6 space-y-4">
      <Card className="border-[#DCC9A5] bg-[#FFF9EE]">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#2C4F4E]">Audit Log</h2>
              <p className="text-sm text-slate-600">Readable activity history showing who did what, where, and what changed.</p>
            </div>
            <Button
              variant={showNavigationEvents ? "secondary" : "outline"}
              onClick={() => setShowNavigationEvents((prev) => !prev)}
              className="w-full lg:w-auto"
            >
              {showNavigationEvents ? "Hide Navigation Events" : "Show Navigation Events"}
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by action, admin, case, listing, or comment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>

          <Tabs value={groupFilter} onValueChange={setGroupFilter}>
            <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
              {filterGroups.map((filter) => (
                <TabsTrigger key={filter.value} value={filter.value} className="whitespace-nowrap">
                  {filter.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={quickFilter === "all" ? "secondary" : "outline"} onClick={() => setQuickFilter("all")}>All Types</Button>
            {quickFilters.map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={quickFilter === filter ? "secondary" : "outline"}
                onClick={() => setQuickFilter(filter)}
                className="capitalize"
              >
                {filter}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {filteredLogs.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No audit logs match the current filters.</p>
      ) : (
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {filteredLogs.slice(0, 200).map((log) => {
            const expanded = !!expandedIds[log.id];
            const changes = buildChangeSummary(log, references);
            const technicalPayload = parseJsonSafe(log.event_payload);
            const tone = getBadgeTone(log);
            const caseId = log.case_id;
            const listingId = log.listing_id;
            const actorLabel = references.admins[log.admin_id] || log.admin_id || "Unknown Admin";
            const targetLabel = getTargetSummary(log, references);

            return (
              <Card key={log.id} className="border-l-4 border-l-[#5DADA5] shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={badgeToneClasses[tone]}>
                          {getFriendlyActionLabel(log)}
                        </Badge>
                        <span className="text-xs text-slate-500">{formatYarditDateTime(log.created_at || log.created_date)}</span>
                      </div>
                      <h3 className="text-base font-semibold text-[#2C4F4E] break-words">{getFriendlyActionLabel(log)}</h3>
                      <div className="grid gap-1 text-sm text-slate-700">
                        <p><span className="font-medium text-slate-900">Actor:</span> {actorLabel}</p>
                        <p><span className="font-medium text-slate-900">Target:</span> {targetLabel}</p>
                        <p><span className="font-medium text-slate-900">Page/Area:</span> {formatPageArea(log.page)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {caseId && (
                        <Button size="sm" variant="outline" onClick={() => window.open(`/AdminLite?tab=cases&openCaseId=${caseId}`, "_blank")}>
                          <Eye className="w-4 h-4" /> View Case
                        </Button>
                      )}
                      {listingId && (
                        <Button size="sm" variant="outline" onClick={() => window.open(`/ListingDetail?id=${listingId}`, "_blank")}>
                          <Eye className="w-4 h-4" /> View Listing
                        </Button>
                      )}
                    </div>
                  </div>

                  {changes.length > 0 ? (
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                      <p className="text-sm font-medium text-slate-900 mb-2">Changes</p>
                      <div className="space-y-1.5 text-sm text-slate-700">
                        {changes.map((change, index) => (
                          <p key={`${log.id}-change-${index}`}>
                            <span className="font-medium">{change.field}:</span> {change.before || "None"} → {change.after || "None"}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : log.comment ? (
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Summary:</span> {log.comment}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-slate-500">Type: {log._kind === "event" ? "UI Event" : "Admin Action"}</p>
                    <Button size="sm" variant="ghost" onClick={() => toggleExpanded(log.id)}>
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {expanded ? "Hide Details" : "Show Details"}
                    </Button>
                  </div>

                  {expanded && (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 space-y-3">
                      <div className="text-sm text-slate-700 space-y-1">
                        <p><span className="font-medium text-slate-900">Event Type:</span> {(log.event_type || log.action_type || "—").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                        <p><span className="font-medium text-slate-900">Admin:</span> {actorLabel}</p>
                        {log.case_id && <p><span className="font-medium text-slate-900">Case:</span> {references.cases[log.case_id] || log.case_id}</p>}
                        {log.listing_id && <p><span className="font-medium text-slate-900">Listing:</span> {references.listings[log.listing_id] || log.listing_id}</p>}
                        {log.comment && <p><span className="font-medium text-slate-900">Comment:</span> {log.comment}</p>}
                      </div>

                      {(log.old_value || log.new_value) && (() => {
                        const oldVal = parseJsonSafe(log.old_value);
                        const newVal = parseJsonSafe(log.new_value);
                        const allKeys = Array.from(new Set([
                          ...Object.keys(oldVal && typeof oldVal === "object" ? oldVal : {}),
                          ...Object.keys(newVal && typeof newVal === "object" ? newVal : {}),
                        ]));
                        if (allKeys.length === 0) return null;
                        return (
                          <div className="rounded-md bg-slate-50 p-3 border border-slate-200">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">What Changed</p>
                            <div className="space-y-1.5 text-sm">
                              {allKeys.map(key => {
                                const before = oldVal?.[key];
                                const after = newVal?.[key];
                                const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                                return (
                                  <div key={key} className="flex flex-wrap items-start gap-1">
                                    <span className="font-medium text-slate-700 shrink-0">{label}:</span>
                                    {before !== undefined && <span className="text-red-600 line-through">{String(before)}</span>}
                                    {before !== undefined && after !== undefined && <span className="text-slate-400">→</span>}
                                    {after !== undefined && <span className="text-green-700">{String(after)}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {technicalPayload && (() => {
                        const keys = Object.keys(technicalPayload);
                        if (keys.length === 0) return null;
                        return (
                          <div className="rounded-md bg-slate-50 p-3 border border-slate-200">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Additional Info</p>
                            <div className="space-y-1.5 text-sm text-slate-700">
                              {keys.map(key => (
                                <div key={key} className="flex flex-wrap gap-1">
                                  <span className="font-medium text-slate-900 shrink-0">{key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}:</span>
                                  <span className="break-all">{typeof technicalPayload[key] === "object" ? JSON.stringify(technicalPayload[key]) : String(technicalPayload[key])}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}