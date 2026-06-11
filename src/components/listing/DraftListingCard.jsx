import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";

const typeLabels = {
  yard_sale: "Yard Sale",
  neighborhood_sale: "Neighborhood Sale",
  event: "Event",
};

export default function DraftListingCard({ draft, onResume, onDelete }) {
  const title = draft.title || "Untitled draft";
  const typeLabel = typeLabels[draft.listing_type] || "Listing";
  const savedAt = draft.updated_date || draft.created_date;

  return (
    <Card className="rounded-xl border bg-white/85 shadow-sm">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-slate-100 text-slate-700 border border-slate-200">Draft</Badge>
              <Badge className="bg-[#e6f3f4] text-[#006168] border border-[#b3d9db]">{typeLabel}</Badge>
              {draft.tier && <Badge variant="outline">{String(draft.tier).replace(/_/g, " ")}</Badge>}
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-lg bg-amber-50 p-2 text-amber-700">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  Saved {savedAt ? format(new Date(savedAt), "MMM d, yyyy 'at' h:mm a") : "recently"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 sm:shrink-0">
            <Button onClick={() => onResume(draft)} className="bg-[#006168] hover:bg-[#004d52] text-white">
              Resume
            </Button>
            <Button variant="outline" onClick={() => onDelete(draft)} className="text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}