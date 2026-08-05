import { Trash2, Pencil, X, Circle as CircleIcon, Square, Triangle as TriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COLOR_PRESETS = [
  { label: "Orange", value: "#F4A849" },
  { label: "Teal", value: "#5DADA5" },
  { label: "Blue", value: "#3B82F6" },
  { label: "Green", value: "#22C55E" },
  { label: "Red", value: "#EF4444" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Gray", value: "#64748B" },
];

const TYPE_LABEL = { circle: "Circle", rectangle: "Rectangle", triangle: "Triangle" };
const TYPE_ICON = { circle: CircleIcon, rectangle: Square, triangle: TriangleIcon };

function AreaEditor({ shape, onUpdate, onDelete, onClose }) {
  const fillPct = Math.round((Number(shape.fillOpacity ?? 0.2)) * 100);
  return (
    <div className="mt-2 space-y-3 rounded-lg border border-[#2C4F4E]/15 bg-white p-3">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Area title</label>
        <Input
          value={shape.title || ""}
          onChange={(e) => onUpdate(shape.id, { title: e.target.value })}
          placeholder="e.g. STAGING AREA"
          className="uppercase font-semibold"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fill color</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => onUpdate(shape.id, { fillColor: c.value, lineColor: c.value })}
              className={`h-8 w-8 rounded-full border-2 ${shape.fillColor === c.value ? "border-[#2C4F4E] ring-2 ring-[#2C4F4E]/30" : "border-white shadow"}`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fill opacity</label>
          <span className="text-xs font-bold text-[#2C4F4E]">{fillPct}%</span>
        </div>
        <input
          type="range"
          min="10"
          max="60"
          step="5"
          value={fillPct}
          onChange={(e) => onUpdate(shape.id, { fillOpacity: Number(e.target.value) / 100 })}
          className="w-full accent-[#5DADA5]"
        />
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9 gap-1.5">
          <X className="w-4 h-4" /> Done
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onDelete(shape.id)} className="h-9 gap-1.5 border-red-300 text-red-600 hover:bg-red-50">
          <Trash2 className="w-4 h-4" /> Delete Area
        </Button>
      </div>
    </div>
  );
}

export default function AreaHighlightList({ highlights, editingId, onStartEdit, onCloseEdit, onUpdate, onDelete }) {
  if (!highlights || highlights.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-[#2C4F4E]">Highlighted Areas</p>
      {highlights.map((h) => {
        const Icon = TYPE_ICON[h.type] || CircleIcon;
        const editing = editingId === h.id;
        return (
          <div key={h.id} className="rounded-xl border border-[#2C4F4E]/10 bg-[#FBFAF7] p-2.5">
            <div className="flex items-center gap-2">
              <span
                className="h-5 w-5 shrink-0 rounded-full border border-[#2C4F4E]/20"
                style={{ backgroundColor: h.fillColor || "#F4A849" }}
              />
              <span className="flex-1 truncate text-sm font-semibold text-[#2C4F4E]">
                {h.title && h.title.trim() ? h.title : "Untitled Area"}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Icon className="h-3.5 w-3.5" /> {TYPE_LABEL[h.type] || h.type}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => (editing ? onCloseEdit() : onStartEdit(h.id))}
                className="h-9 gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" /> {editing ? "Close" : "Edit"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDelete(h.id)}
                className="h-9 gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            {editing && <AreaEditor shape={h} onUpdate={onUpdate} onDelete={onDelete} onClose={onCloseEdit} />}
          </div>
        );
      })}
    </div>
  );
}