import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

export default function AdminLogsTab() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["adminEvents"],
    queryFn: () => base44.entities.AdminEvent.list("-created_date", 100),
  });

  const { data: actions = [] } = useQuery({
    queryKey: ["adminActions"],
    queryFn: () => base44.entities.AdminAction.list("-created_date", 100),
  });

  // Merge events and actions into a single timeline
  const allLogs = [
    ...events.map(e => ({ ...e, _kind: "event" })),
    ...actions.map(a => ({ ...a, _kind: "action" })),
  ].sort((a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date));

  const filtered = searchQuery.trim()
    ? allLogs.filter(l =>
        (l.event_type || l.action_type || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.admin_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.case_id || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allLogs;

  if (isLoading) return <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="mt-6">
      <div className="mb-4 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Filter by event type, admin ID, or case ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No logs found.</p>
      ) : (
        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
          {filtered.slice(0, 200).map((log) => (
            <Card key={log.id} className="border-l-4 border-l-[#5DADA5]">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <Badge variant="outline" className="w-fit text-xs">
                    {log._kind === "event" ? log.event_type : log.action_type}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(log.created_at || log.created_date).toLocaleString()}
                  </span>
                  {log.page && <span className="text-xs text-gray-400">Page: {log.page}</span>}
                </div>
                <div className="mt-1 text-xs text-gray-600 break-all">
                  Admin: {log.admin_id?.slice(0, 12)}...
                  {log.case_id && <> · Case: {log.case_id.slice(0, 12)}...</>}
                </div>
                {log.comment && <p className="mt-1 text-xs text-gray-700">{log.comment}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}