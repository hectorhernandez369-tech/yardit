import { Circle, Square, Triangle as TriangleIcon, MousePointer2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TOOLS = [
  { id: "none", label: "Select", icon: MousePointer2 },
  { id: "circle", label: "Circle", icon: Circle },
  { id: "rectangle", label: "Square", icon: Square },
  { id: "triangle", label: "Triangle", icon: TriangleIcon },
];

const HINTS = {
  none: "Choose a shape tool to highlight an area on the map.",
  circle: "Click and drag on the map to draw a circle.",
  rectangle: "Click and drag on the map to draw a square/rectangle.",
  triangle: "Click 3 points on the map to draw a triangle.",
};

export default function AreaHighlightPanel({ drawingMode, setDrawingMode, highlights, onTitleChange, onDelete }) {
  return (
    <div className="space-y-3 rounded-xl bg-[#FBFAF7] p-3 border border-[#2C4F4E]/10">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-semibold text-[#2C4F4E]">Highlight Areas</span>
        <div className="flex gap-1.5">
          {TOOLS.map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={drawingMode === t.id ? "default" : "outline"}
              onClick={() => setDrawingMode(t.id)}
              className="gap-1.5"
            >
              <t.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </Button>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-500">{HINTS[drawingMode]}</p>
      {highlights.length > 0 && (
        <div className="space-y-2">
          {highlights.map((h) => (
            <div key={h.id} className="flex items-center gap-2">
              <Input
                value={h.title}
                onChange={(e) => onTitleChange(h.id, e.target.value)}
                placeholder="e.g. STAGING AREA"
                className="uppercase font-semibold"
              />
              <Button type="button" size="icon" variant="outline" onClick={() => onDelete(h.id)}>
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}