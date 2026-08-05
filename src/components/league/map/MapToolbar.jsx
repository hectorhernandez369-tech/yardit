import { MousePointer2, Flag, Square, LogIn, Route, Type, MapPin, Layers, Undo2, Redo2, Save, Upload, Maximize, Crosshair, Eye } from "lucide-react";

const TOOLS = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "field", label: "Field", icon: Flag },
  { id: "area", label: "Area", icon: Square },
  { id: "entrance", label: "Entrance", icon: LogIn },
  { id: "route", label: "Route", icon: Route },
  { id: "label", label: "Label", icon: Type },
  { id: "icon", label: "Icon", icon: MapPin },
];

// Left tool panel (desktop) or bottom tray (mobile). Stateless presentation only.
export default function MapToolbar({ activeTool, setTool, layout = "panel", view, setView, layersOpen, setLayersOpen, canUndo, canRedo, onUndo, onRedo, onSaveDraft, onPublish, saving, onFitVenue, onSetDefault, onResetView, hasUnpublished }) {
  const ToolBtn = ({ tool }) => {
    const Icon = tool.icon;
    const active = activeTool === tool.id;
    return (
      <button
        type="button"
        onClick={() => setTool(tool.id)}
        title={tool.label}
        className={`flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-bold transition ${
          active ? "bg-[#2C4F4E] text-white shadow" : "text-slate-600 hover:bg-slate-100"
        } ${layout === "tray" ? "flex-col gap-0.5 px-1 py-1" : "w-full"}`}
      >
        <Icon className="h-4 w-4" />
        <span>{tool.label}</span>
      </button>
    );
  };

  const IconBtn = ({ onClick, disabled, title, children, active }) => (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={`rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40 ${active ? "bg-slate-200" : ""}`}>{children}</button>
  );

  if (layout === "tray") {
    return (
      <div className="yardit-ui-control flex items-center gap-1 overflow-x-auto border-t border-slate-200 bg-white px-1.5 py-1.5">
        {TOOLS.map((tool) => <ToolBtn key={tool.id} tool={tool} />)}
        <IconBtn onClick={() => setLayersOpen(!layersOpen)} title="Layers" active={layersOpen}><Layers className="h-4 w-4" /></IconBtn>
        <IconBtn onClick={onUndo} disabled={!canUndo} title="Undo"><Undo2 className="h-4 w-4" /></IconBtn>
        <IconBtn onClick={onRedo} disabled={!canRedo} title="Redo"><Redo2 className="h-4 w-4" /></IconBtn>
        <IconBtn onClick={onSaveDraft} disabled={saving} title="Save draft"><Save className="h-4 w-4" /></IconBtn>
        <IconBtn onClick={onPublish} disabled={saving} title="Publish"><Upload className="h-4 w-4" /></IconBtn>
        <IconBtn onClick={onFitVenue} title="Fit venue"><Maximize className="h-4 w-4" /></IconBtn>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto border-r border-slate-200 bg-white p-2.5">
      <div>
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">View</p>
        <div className="flex rounded-lg border border-slate-200 p-0.5">
          <button type="button" onClick={() => setView("design")} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold ${view === "design" ? "bg-[#2C4F4E] text-white" : "text-slate-600"}`}>Design</button>
          <button type="button" onClick={() => setView("schedule")} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold ${view === "schedule" ? "bg-[#2C4F4E] text-white" : "text-slate-600"}`}>Schedule</button>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">Tools</p>
        <div className="space-y-1">
          {TOOLS.map((tool) => <ToolBtn key={tool.id} tool={tool} />)}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">Map</p>
        <div className="flex flex-wrap gap-1">
          <IconBtn onClick={() => setLayersOpen(!layersOpen)} title="Layers" active={layersOpen}><Layers className="h-4 w-4" /></IconBtn>
          <IconBtn onClick={onFitVenue} title="Fit venue to screen"><Maximize className="h-4 w-4" /></IconBtn>
          <IconBtn onClick={onSetDefault} title="Set as default view"><Crosshair className="h-4 w-4" /></IconBtn>
          <IconBtn onClick={onResetView} title="Reset view"><Eye className="h-4 w-4" /></IconBtn>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">History</p>
        <div className="flex gap-1">
          <IconBtn onClick={onUndo} disabled={!canUndo} title="Undo"><Undo2 className="h-4 w-4" /></IconBtn>
          <IconBtn onClick={onRedo} disabled={!canRedo} title="Redo"><Redo2 className="h-4 w-4" /></IconBtn>
        </div>
      </div>

      <div className="mt-auto space-y-2">
        <button type="button" onClick={onSaveDraft} disabled={saving} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {saving ? "Saving…" : "Save Draft"}
        </button>
        <button type="button" onClick={onPublish} disabled={saving} className={`w-full rounded-lg px-3 py-2 text-xs font-bold text-white shadow ${hasUnpublished ? "bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]" : "bg-[#2C4F4E] hover:bg-[#244f4c]"} disabled:opacity-50`}>
          {saving ? "Publishing…" : hasUnpublished ? "Publish Map" : "Published"}
        </button>
      </div>
    </div>
  );
}