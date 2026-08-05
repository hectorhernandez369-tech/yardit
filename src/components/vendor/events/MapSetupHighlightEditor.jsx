import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COLOR_PRESETS = [
  { label: "Orange", value: "#F4A849" },
  { label: "Teal", value: "#5DADA5" },
  { label: "Blue", value: "#3B82F6" },
  { label: "Green", value: "#22C55E" },
  { label: "Red", value: "#EF4444" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Gray", value: "#64748B" },
];

function ColorSwatches({ value, onPick }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_PRESETS.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          onClick={() => onPick(c.value)}
          className={`h-8 w-8 rounded-full border-2 ${value === c.value ? "border-[#2C4F4E] ring-2 ring-[#2C4F4E]/30" : "border-white shadow"}`}
          style={{ backgroundColor: c.value }}
        />
      ))}
    </div>
  );
}

export default function MapSetupHighlightEditor({ shape, onUpdate, onDelete, onClose }) {
  const fillPct = Math.round((Number(shape.fillOpacity ?? 0.2)) * 100);
  const linePct = Math.round((Number(shape.lineOpacity ?? 0.9)) * 100);

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-[#2C4F4E]/15 bg-[#FBFAF7] p-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Area title</Label>
        <Input
          value={shape.title || ""}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="e.g. STAGING AREA"
          className="uppercase font-semibold bg-white"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fill color</Label>
          <ColorSwatches value={shape.fillColor} onPick={(v) => onUpdate({ fillColor: v })} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fill opacity</Label>
            <span className="text-xs font-bold text-[#2C4F4E]">{fillPct}%</span>
          </div>
          <input
            type="range" min="10" max="80" step="5"
            value={fillPct}
            onChange={(e) => onUpdate({ fillOpacity: Number(e.target.value) / 100 })}
            className="w-full accent-[#5DADA5]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Border color</Label>
          <ColorSwatches value={shape.lineColor} onPick={(v) => onUpdate({ lineColor: v })} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Border opacity</Label>
            <span className="text-xs font-bold text-[#2C4F4E]">{linePct}%</span>
          </div>
          <input
            type="range" min="0" max="100" step="10"
            value={linePct}
            onChange={(e) => onUpdate({ lineOpacity: Number(e.target.value) / 100 })}
            className="w-full accent-[#5DADA5]"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9 gap-1.5">
          <X className="w-4 h-4" /> Done
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDelete} className="h-9 gap-1.5 border-red-300 text-red-600 hover:bg-red-50">
          <Trash2 className="w-4 h-4" /> Delete Area
        </Button>
      </div>
    </div>
  );
}