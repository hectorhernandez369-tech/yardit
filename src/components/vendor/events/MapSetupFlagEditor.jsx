import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function MapSetupFlagEditor({ flag, onUpdate, onDelete, onClose }) {
  return (
    <div className="mt-2 space-y-3 rounded-lg border border-[#2C4F4E]/15 bg-[#FBFAF7] p-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Flag name</Label>
        <Input
          value={flag.title || ""}
          onChange={(e) => onUpdate({ title: e.target.value, label: e.target.value || flag.label })}
          placeholder="e.g. Field 1, Main Entrance, Stage A"
          className="bg-white"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</Label>
        <Textarea
          value={flag.description || ""}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="What is at this location? Shown to attendees who tap the flag."
          className="resize-none h-20 bg-white"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category <span className="font-normal text-slate-400">(optional)</span></Label>
        <Input
          value={flag.category || ""}
          onChange={(e) => onUpdate({ category: e.target.value })}
          placeholder="e.g. Field, Entrance, Stage, Food"
          className="bg-white"
        />
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9 gap-1.5">
          <X className="w-4 h-4" /> Done
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDelete} className="h-9 gap-1.5 border-red-300 text-red-600 hover:bg-red-50">
          <Trash2 className="w-4 h-4" /> Delete Flag
        </Button>
      </div>
    </div>
  );
}