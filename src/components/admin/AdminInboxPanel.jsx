import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Inbox, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

const categoryLabels = {
  reports: "Reports",
  cases: "Cases",
  admin_notes: "Admin Notes",
  assisted_listings: "Assisted Listings",
  vendor_admin: "Vendor Admin",
  permissions: "Permissions",
  billing: "Billing",
  audit: "Audit",
  system: "System",
};

export default function AdminInboxPanel({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["adminInboxItems", user?.id],
    queryFn: async () => {
      const [inboxItems, legacyCaseItems] = await Promise.all([
        base44.entities.AdminInboxItem.list("-created_date", 100),
        base44.entities.CaseNotification.filter({ admin_id: user.id }, "-created_date"),
      ]);

      const normalizedLegacy = legacyCaseItems.map((item) => ({
        id: `case-${item.id}`,
        sourceId: item.id,
        _legacyCaseNotification: true,
        title: "Case Management",
        message: item.message,
        type: "admin_case",
        category: "cases",
        status: item.is_read ? "open" : "unread",
        priority: "normal",
        related_entity_type: "case",
        related_entity_id: item.case_id,
        deep_link: createPageUrl("AdminLite") + `?section=case_management&openCaseId=${item.case_id}`,
        created_date: item.created_date,
      }));

      return [...inboxItems, ...normalizedLegacy].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user?.id,
    initialData: [],
    refetchInterval: 30000,
  });

  const markOpenMutation = useMutation({
    mutationFn: async (item) => {
      if (item._legacyCaseNotification) {
        return base44.entities.CaseNotification.update(item.sourceId, { is_read: true });
      }
      return base44.entities.AdminInboxItem.update(item.id, { status: item.status === "unread" ? "open" : item.status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminInboxItems"] }),
  });

  const resolveMutation = useMutation({
    mutationFn: async (item) => {
      if (item._legacyCaseNotification) {
        return base44.entities.CaseNotification.update(item.sourceId, { is_read: true });
      }
      return base44.entities.AdminInboxItem.update(item.id, { status: "resolved", resolved_at: new Date().toISOString() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminInboxItems"] }),
  });

  const activeItems = items.filter((item) => item.status !== "resolved" && item.status !== "archived");

  const openItem = (item) => {
    markOpenMutation.mutate(item);
    if (item.deep_link) navigate(item.deep_link);
  };

  if (isLoading) {
    return <div className="p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-white">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#2C4F4E]">Admin Inbox</h2>
            <p className="text-sm text-slate-600">Alert center only — open an alert to jump to the right work area.</p>
          </div>
        </div>
      </div>

      {!activeItems.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          <Inbox className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <p>No open admin inbox items.</p>
        </div>
      ) : (
        activeItems.map((item) => (
          <Card key={item.id} className={item.status === "unread" ? "border-blue-300 bg-blue-50" : "bg-white"}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{categoryLabels[item.category] || item.category || "Admin"}</Badge>
                    {item.priority === "critical" || item.priority === "high" ? <Badge className="bg-red-600 text-white">{item.priority}</Badge> : null}
                    {item.status === "unread" ? <Badge className="bg-blue-600 text-white">New</Badge> : null}
                  </div>
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-700">{item.message}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatDistanceToNow(new Date(item.created_date), { addSuffix: true })}</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {item.deep_link && (
                    <Button size="sm" onClick={() => openItem(item)} className="gap-1 bg-[#5DADA5] hover:bg-[#4A9B93]">
                      Open <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => resolveMutation.mutate(item)} className="gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}