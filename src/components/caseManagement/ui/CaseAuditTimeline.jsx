import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CaseAuditTimeline({ actions, allAdminUsers }) {
  const adminMap = {};
  allAdminUsers.forEach(a => { adminMap[a.id] = a; });

  const actionColors = {
    assign_self: "bg-green-100 text-green-800",
    assign_other: "bg-green-100 text-green-800",
    change_priority: "bg-yellow-100 text-yellow-800",
    set_disposition: "bg-purple-100 text-purple-800",
    submit_case: "bg-blue-100 text-blue-800",
    approve_case: "bg-green-100 text-green-800",
    send_back: "bg-orange-100 text-orange-800",
    reassign: "bg-indigo-100 text-indigo-800",
    admin_comment: "bg-gray-100 text-gray-700",
    supervisor_comment: "bg-purple-100 text-purple-700",
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Case Timeline ({actions.length})</CardTitle></CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-sm text-gray-500">No actions recorded.</p>
        ) : (
          <div className="space-y-2">
            {actions.map(a => {
              const admin = adminMap[a.admin_id];
              let oldVal, newVal;
              try { oldVal = a.old_value ? JSON.parse(a.old_value) : null; } catch { oldVal = a.old_value; }
              try { newVal = a.new_value ? JSON.parse(a.new_value) : null; } catch { newVal = a.new_value; }

              return (
                <div key={a.id} className="border rounded p-2 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={actionColors[a.action_type] || "bg-gray-100 text-gray-800"}>{a.action_type}</Badge>
                    <span className="font-medium">{admin?.full_name || admin?.email || a.admin_id}</span>
                    <span className="text-gray-400 ml-auto">{new Date(a.created_date).toLocaleString()}</span>
                  </div>
                  {oldVal && <div className="text-gray-500">From: {typeof oldVal === "object" ? JSON.stringify(oldVal) : oldVal}</div>}
                  {newVal && <div className="text-gray-600">To: {typeof newVal === "object" ? JSON.stringify(newVal) : newVal}</div>}
                  {a.comment && <div className="italic text-gray-500">Note: {a.comment}</div>}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}