import { Plus, Circle as CircleIcon, Square, Triangle as TriangleIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOOLS = [
  { id: "circle", label: "Circle", icon: CircleIcon },
  { id: "rectangle", label: "Rectangle", icon: Square },
  { id: "triangle", label: "Triangle", icon: TriangleIcon },
];

export default function AreaDrawToolbar({ toolbarOpen, drawingMode, onOpenToolbar, onSelectTool, onCancel }) {
  if (!toolbarOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={onOpenToolbar}
        className="h-11 w-full gap-2 text-base"
      >
        <Plus className="w-5 h-5" />
        Highlight an Area
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#2C4F4E]/15 bg-[#FBFAF7] p-2">
      {TOOLS.map((t) => (
        <Button
          key={t.id}
          type="button"
          variant={drawingMode === t.id ? "default" : "outline"}
          onClick={() => onSelectTool(t.id)}
          className="h-11 min-w-[110px] flex-1 gap-2"
        >
          <t.icon className="w-5 h-5" />
          <span>{t.label}</span>
        </Button>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="h-11 min-w-[110px] flex-1 gap-2 border-red-300 text-red-600 hover:bg-red-50"
      >
        <X className="w-5 h-5" />
        <span>Cancel</span>
      </Button>
    </div>
  );
}