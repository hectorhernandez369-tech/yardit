import { Eye, EyeOff, Lock, Unlock, Copy, Trash2, ChevronUp, ChevronDown, Flag, Square, LogIn, Route as RouteIcon, Type, MapPin } from "lucide-react";

const TYPE_META = {
  field: { label: "Fields", icon: Flag },
  entrance: { label: "Entrances", icon: LogIn },
  area: { label: "Areas", icon: Square },
  route: { label: "Routes", icon: RouteIcon },
  service: { label: "Services", icon: MapPin },
  label: { label: "Labels", icon: Type },
};

// Layers panel grouping all venue objects, playable fields first with linked game counts.
export default function LayersPanel({ fields = [], objects = [], gameCounts = {}, selectedId, onSelect, onToggleVisible, onToggleLock, onRename, onDuplicate, onDelete, onMoveOrder, compact }) {
  const fieldItems = fields.map((f, i) => ({
    id: f.id,
    title: f.name,
    type: "field",
    locked: f.locked,
    hidden: f.hidden,
    badge: gameCounts[f.id] != null ? `${gameCounts[f.id]} game${gameCounts[f.id] === 1 ? "" : "s"}` : "",
    order: i,
  }));

  const grouped = TYPE_META.keys ? null : null;
  const objectGroups = ["entrance", "area", "route", "service", "label"]
    .map((type) => ({ type, items: objects.map((o, i) => ({ ...o, order: i })).filter((o) => o.type === type) }))
    .filter((g) => g.items.length);

  const Row = ({ item, type }) => {
    const Icon = (TYPE_META[type] || {}).icon || Square;
    const active = item.id === selectedId;
    return (
      <div className={`flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs ${active ? "bg-[#5DADA5]/15 ring-1 ring-[#5DADA5]" : "hover:bg-slate-100"}`}>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 text-left" onClick={() => onSelect(item.id, type)}>
          <Icon className="h-3.5 w-3.5 shrink-0 text-[#2C4F4E]" />
          <span className="truncate font-semibold text-slate-700">{item.title || item.subtype || "Untitled"}</span>
          {item.badge && <span className="ml-auto shrink-0 rounded-full bg-[#F4A849]/20 px-1.5 text-[10px] font-bold text-[#9a6a1c]">{item.badge}</span>}
        </button>
        <button type="button" title={item.hidden ? "Show" : "Hide"} className="rounded p-1 hover:bg-slate-200" onClick={() => onToggleVisible(item.id, type)}>
          {item.hidden ? <EyeOff className="h-3 w-3 text-slate-400" /> : <Eye className="h-3 w-3 text-slate-600" />}
        </button>
        <button type="button" title={item.locked ? "Unlock" : "Lock"} className="rounded p-1 hover:bg-slate-200" onClick={() => onToggleLock(item.id, type)}>
          {item.locked ? <Lock className="h-3 w-3 text-red-500" /> : <Unlock className="h-3 w-3 text-slate-500" />}
        </button>
        <button type="button" title="Rename" className="rounded p-1 hover:bg-slate-200" onClick={() => onRename(item.id, type)}>✎</button>
        <button type="button" title="Duplicate" className="rounded p-1 hover:bg-slate-200" onClick={() => onDuplicate(item.id, type)}><Copy className="h-3 w-3" /></button>
        <button type="button" title="Delete" className="rounded p-1 text-red-600 hover:bg-red-50" onClick={() => onDelete(item.id, type)}><Trash2 className="h-3 w-3" /></button>
        <div className="flex">
          <button type="button" title="Move backward" className="rounded p-0.5 hover:bg-slate-200" onClick={() => onMoveOrder(item.id, type, -1)}><ChevronDown className="h-3 w-3" /></button>
          <button type="button" title="Move forward" className="rounded p-0.5 hover:bg-slate-200" onClick={() => onMoveOrder(item.id, type, 1)}><ChevronUp className="h-3 w-3" /></button>
        </div>
      </div>
    );
  };

  const Group = ({ type, items }) => (
    <div className="space-y-0.5">
      <p className="px-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">{TYPE_META[type].label} · {items.length}</p>
      {items.map((item) => <Row key={item.id} item={item} type={type} />)}
    </div>
  );

  return (
    <div className={`space-y-2 ${compact ? "max-h-[40vh] overflow-y-auto p-1" : "p-2"}`}>
      {fieldItems.length > 0 && <Group type="field" items={fieldItems} />}
      {objectGroups.map((g) => <Group key={g.type} type={g.type} items={g.items} />)}
      {!fieldItems.length && !objectGroups.length && <p className="px-1.5 text-xs text-slate-400">No venue objects yet. Use the tools to add fields, areas, entrances and services.</p>}
    </div>
  );
}