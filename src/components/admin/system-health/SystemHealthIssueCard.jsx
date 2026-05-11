import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Wrench } from "lucide-react";

const severityClass = {
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
  WARNING: "bg-amber-100 text-amber-800 border-amber-200",
  NOTICE: "bg-blue-100 text-blue-800 border-blue-200",
};

export default function SystemHealthIssueCard({ issue, onReviewed, onRepair }) {
  const canRepair = issue.metadata?.safe_repair === true;
  const viewPath = issue.metadata?.view_path;

  return (
    <Card className="border-slate-200 bg-white">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={severityClass[issue.severity] || severityClass.NOTICE}>{issue.severity}</Badge>
              <Badge variant="outline">{issue.category}</Badge>
              <Badge variant="secondary">{issue.status}</Badge>
            </div>
            <div>
              <h3 className="font-bold text-[#2C4F4E]">{issue.title}</h3>
              <p className="text-sm text-slate-600 mt-1">{issue.description}</p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
          <div><span className="font-semibold">Record:</span> {issue.affected_entity_type || "System"}</div>
          <div><span className="font-semibold">ID:</span> {issue.affected_entity_id || "—"}</div>
          <div><span className="font-semibold">Name:</span> {issue.affected_display_name || "—"}</div>
        </div>

        <p className="text-sm"><span className="font-semibold">Suggested fix:</span> {issue.suggested_fix || "Manual review required."}</p>

        <div className="flex flex-wrap gap-2">
          {viewPath && (
            <Button size="sm" variant="outline" onClick={() => window.open(viewPath, "_blank")}>
              <ExternalLink className="w-4 h-4" /> View Record
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onReviewed(issue)} disabled={issue.status === "reviewed"}>
            Mark Reviewed
          </Button>
          <Button size="sm" onClick={() => onRepair(issue)} disabled={!canRepair} className="bg-[#5DADA5] hover:bg-[#4A9B93]">
            <Wrench className="w-4 h-4" /> {canRepair ? "Resolve / Repair" : "Manual review required"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}