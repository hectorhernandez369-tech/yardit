import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Play, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { getDraftStepLabel } from "@/lib/vendorEventDraft";

export default function CreateEventDraftGate({ open, onOpenChange, drafts, onContinue, onStartNew, onDeleteAll }) {
  const draft = drafts?.[0];
  const lastEdited = draft?.updated_at || draft?.created_at;
  const step = draft?.draft_current_step || 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <FileText className="h-5 w-5 text-amber-500" /> You have an unfinished event
          </DialogTitle>
          <DialogDescription className="text-left">
            Pick up where you left off, or start fresh. Starting a new event will delete the existing draft.
          </DialogDescription>
        </DialogHeader>

        {draft && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-1">
            <p className="font-bold text-slate-900 truncate">{draft.draft_form_data?.title?.trim() || draft.title?.trim() || "Untitled Event"}</p>
            <p className="text-xs text-slate-500">Step {step}: {getDraftStepLabel(step)}</p>
            {lastEdited && (
              <p className="text-[11px] text-slate-400">Last edited {format(new Date(lastEdited), "MMM d, yyyy 'at' h:mm a")}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button onClick={onContinue} className="bg-[#2C4F4E] text-white hover:bg-[#3d6b6a] h-11 gap-2">
            <Play className="h-4 w-4" /> Continue Draft
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (window.confirm("Starting a new event will delete your unfinished draft. Continue?")) {
                onStartNew();
              }
            }}
            className="h-11 gap-2"
          >
            <Plus className="h-4 w-4" /> Start New Event
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (window.confirm("Delete this draft permanently?")) {
                onDeleteAll();
              }
            }}
            className="h-10 gap-2 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" /> Delete Draft
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}