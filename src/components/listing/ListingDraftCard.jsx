import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Trash2 } from "lucide-react";

const typeLabels = {
  yard_sale: "Yard Sale",
  neighborhood_sale: "Neighborhood Sale",
  event: "Event",
};

function getDraftSummary(draft) {
  try {
    const data = JSON.parse(draft.draftData || "{}");
    return [data.city, data.state, data.zip].filter(Boolean).join(", ");
  } catch {
    return "";
  }
}

export default function ListingDraftCard({ draft, onResume, onDelete }) {
  const summary = getDraftSummary(draft);
  const title = draft.title || `${typeLabels[draft.listingType] || "Listing"} Draft`;

  return (
    <Card className="rounded-xl border bg-white/85 shadow-sm">
      <CardContent className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-900 truncate">{title}</h3>
              <span className="text-[11px] uppercase tracking-wide rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 font-semibold">
                Draft
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {typeLabels[draft.listingType] || "Listing"}{summary ? ` • ${summary}` : ""}
            </p>
          </div>
        </div>

        <div className="flex gap-2 sm:shrink-0">
          <Button onClick={() => onResume(draft)} className="bg-[#006168] hover:bg-[#004d52] text-white">
            Resume
          </Button>
          <Button variant="outline" onClick={() => onDelete(draft)} className="text-red-600 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}