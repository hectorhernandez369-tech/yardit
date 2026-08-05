import { Copy, Trash2, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AREA_SUBTYPES, ENTRANCE_SUBTYPES, SERVICE_ICONS, serviceIconGlyph } from "@/lib/leagueEventMapGeometry";

const FIELD_TYPES = [
  { value: "football", label: "Football" },
  { value: "soccer", label: "Soccer" },
  { value: "baseball", label: "Baseball" },
  { value: "softball", label: "Softball" },
  { value: "basketball", label: "Basketball" },
  { value: "volleyball", label: "Volleyball" },
  { value: "multipurpose", label: "Multipurpose" },
  { value: "other", label: "Other" },
];

const Row = ({ label, children }) => (
  <label className="space-y-1 text-xs font-bold text-slate-600">
    <span>{label}</span>
    {children}
  </label>
);

const ColorInput = ({ value, onChange }) => (
  <div className="flex items-center gap-2">
    <input type="color" value={value || "#5DADA5"} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-slate-200" />
    <Input value={value || ""} onChange={(e) => onChange(e.target.value)} className="h-8" />
  </div>
);

// Right-panel settings for the selected venue object or playable field.
export default function ObjectSettingsPanel({ object, type, onChange, onDelete, onDuplicate, onManageGames, gameCount }) {
  if (!object) {
    return <div className="p-4 text-xs text-slate-400">Select an object on the map or from the Layers panel to edit its settings.</div>;
  }

  const set = (patch) => onChange(patch);
  const setStyle = (patch) => set({ style: { ...(object.style || {}), ...patch } });
  const setGeom = (patch) => set({ geometry: { ...(object.geometry || {}), ...patch } });

  const isField = type === "field";

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-[#2C4F4E]">{isField ? "Playable Field" : object.type ? object.type[0].toUpperCase() + object.type.slice(1) : "Object"}</h3>
        <div className="flex gap-1">
          <button type="button" onClick={onDuplicate} className="rounded-lg p-1.5 hover:bg-slate-100" title="Duplicate"><Copy className="h-4 w-4" /></button>
          <button type="button" onClick={onDelete} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" title="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      <Row label="Name / Title">
        <Input value={object.title || object.name || ""} onChange={(e) => set(isField ? { name: e.target.value } : { title: e.target.value })} />
      </Row>

      {isField && (
        <>
          <Row label="Field number">
            <Input value={object.field_number || ""} onChange={(e) => set({ field_number: e.target.value })} placeholder="Optional" />
          </Row>
          <Row label="Field type">
            <Select value={object.field_type || "multipurpose"} onValueChange={(v) => set({ field_type: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </Row>
          <Row label="Status">
            <Select value={object.status || "active"} onValueChange={(v) => set({ status: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active (can host games)</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </Row>
        </>
      )}

      {object.type === "area" && (
        <Row label="Area type">
          <Select value={object.subtype || "Vendor Area"} onValueChange={(v) => set({ subtype: v })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{AREA_SUBTYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </Row>
      )}

      {object.type === "entrance" && (
        <>
          <Row label="Entrance type">
            <Select value={object.subtype || "Spectator Entrance"} onValueChange={(v) => set({ subtype: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{ENTRANCE_SUBTYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Row>
          <Row label="Arrow direction (°)">
            <Input type="number" value={object.style?.arrowDeg ?? 0} onChange={(e) => setStyle({ arrowDeg: Number(e.target.value) })} />
          </Row>
        </>
      )}

      {object.type === "icon" && (
        <Row label="Service icon">
          <Select value={object.icon_key || "restroom"} onValueChange={(v) => set({ icon_key: v })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{SERVICE_ICONS.map((i) => <SelectItem key={i.key} value={i.key}>{i.glyph} {i.label}</SelectItem>)}</SelectContent>
          </Select>
        </Row>
      )}

      {(isField || object.type === "area") && (
        <>
          <Row label="Shape">
            <Select value={object.geometry?.type || "rectangle"} onValueChange={(v) => setGeom({ type: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rectangle">Rectangle</SelectItem>
                <SelectItem value="circle">Circle</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Fill color"><ColorInput value={object.fill_color || object.style?.fillColor} onChange={(v) => isField ? set({ fill_color: v }) : setStyle({ fillColor: v })} /></Row>
          <Row label="Border color"><ColorInput value={object.border_color || object.style?.borderColor} onChange={(v) => isField ? set({ border_color: v }) : setStyle({ borderColor: v })} /></Row>
          <Row label={`Fill opacity (${Math.round((object.fill_opacity ?? object.style?.fillOpacity ?? 0.25) * 100)}%)`}>
            <input type="range" min={0} max={1} step={0.05} value={object.fill_opacity ?? object.style?.fillOpacity ?? 0.25} onChange={(e) => isField ? set({ fill_opacity: Number(e.target.value) }) : setStyle({ fillOpacity: Number(e.target.value) })} className="w-full" />
          </Row>
          <Row label="Border width">
            <Input type="number" value={object.border_width ?? object.style?.borderWidth ?? 2} onChange={(e) => isField ? set({ border_width: Number(e.target.value) }) : setStyle({ borderWidth: Number(e.target.value) })} />
          </Row>
          {object.geometry?.type === "rectangle" && (
            <Row label={`Rotation (${object.geometry.rotationDeg || 0}°)`}>
              <input type="range" min={0} max={180} value={object.geometry.rotationDeg || 0} onChange={(e) => setGeom({ rotationDeg: Number(e.target.value) })} className="w-full" />
            </Row>
          )}
        </>
      )}

      <Row label="Label text size">
        <Select value={object.text_size || "md"} onValueChange={(v) => set({ text_size: v })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="md">Medium</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <Row label="Label position">
        <Select value={object.label_position || "center"} onValueChange={(v) => set({ label_position: v })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="top">Top</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="bottom">Bottom</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      {isField && onManageGames && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-600">Scheduled games</p>
            <span className="rounded-full bg-[#F4A849]/20 px-2 py-0.5 text-xs font-black text-[#9a6a1c]">{gameCount ?? 0}</span>
          </div>
          <button type="button" onClick={onManageGames} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2C4F4E] px-3 py-2 text-xs font-bold text-white">
            <Calendar className="h-3.5 w-3.5" /> Manage Games
          </button>
        </div>
      )}
    </div>
  );
}