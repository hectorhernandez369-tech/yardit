import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Trash2, MapPin, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { getDraftStepLabel } from "@/lib/vendorEventDraft";

export default function DraftEventCard({ draft, onEdit, onDelete }) {
  const formData = draft.draft_form_data || {};
  const title = formData.title?.trim() || draft.title?.trim() || "Untitled Event";
  const step = draft.draft_current_step || 1;
  const lastEdited = draft.updated_at || draft.created_at;
  const displayAddress = formData.display_address?.trim() || draft.display_address?.trim();

  return (
    <Card className="border-amber-200 bg-amber-50/40 rounded-2xl">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-400 text-amber-900 text-[10px] font-bold">Draft</Badge>
              <span className="text-xs text-slate-500">Step {step}: {getDraftStepLabel(step)}</span>
            </div>
            <h4 className="font-bold text-slate-900 mt-1 truncate">{title}</h4>
            {displayAddress && (
              <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{displayAddress}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button size="sm" onClick={onEdit} className="bg-[#2C4F4E] text-white hover:bg-[#3d6b6a] h-8 gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button size="sm" variant="outline" onClick={onDelete} className="h-8 gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>
        <p className="flex items-center gap-1 text-[11px] text-slate-400">
          <CalendarClock className="h-3 w-3" />
          Last edited {lastEdited ? format(new Date(lastEdited), "MMM d, yyyy 'at' h:mm a") : "—"}
        </p>
      </CardContent>
    </Card>
  );
}