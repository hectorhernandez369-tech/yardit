import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ArrowLeft, Layers, X } from "lucide-react";
import MapToolbar from "./MapToolbar";
import LayersPanel from "./LayersPanel";
import ObjectSettingsPanel from "./ObjectSettingsPanel";
import FieldPanel from "./FieldPanel";
import VenueMapCanvas from "./VenueMapCanvas";
import { uid, defaultFieldGeometry } from "@/lib/leagueEventMapGeometry";
import { canAssignGameToField, gamesOnField } from "@/lib/leagueFieldConflict";

const clone = (v) => JSON.parse(JSON.stringify(v));
const nowIso = () => new Date().toISOString();

export default function LeagueEventMapWorkstation({ eventId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mapRef = useRef(null);

  const { data: events = [] } = useQuery({ queryKey: ["leagueEventMapEvent", eventId], queryFn: () => base44.entities.VendorEvent.filter({ id: eventId }), enabled: !!eventId, initialData: [] });
  const event = events[0];
  const { data: accounts = [] } = useQuery({ queryKey: ["leagueEventMapAccount", event?.organizer_business_id], queryFn: () => base44.entities.VendorAccount.filter({ id: event?.organizer_business_id }), enabled: !!event?.organizer_business_id, initialData: [] });
  const account = accounts[0];

  const { data: serverFields = [] } = useQuery({ queryKey: ["leagueEventFields", eventId], queryFn: () => base44.entities.LeagueEventField.filter({ league_event_id: eventId }, "display_order"), enabled: !!eventId, initialData: [] });
  const { data: mapRecords = [] } = useQuery({ queryKey: ["leagueEventMapRecord", eventId], queryFn: () => base44.entities.LeagueEventMap.filter({ league_event_id: eventId }), enabled: !!eventId, initialData: [] });
  const mapRecord = mapRecords[0];
  const { data: allGames = [] } = useQuery({ queryKey: ["leagueEventMapGames", event?.organizer_business_id], queryFn: () => base44.entities.LeagueGame.filter({ vendor_account_id: event?.organizer_business_id }, "sort_order"), enabled: !!event?.organizer_business_id, initialData: [] });
  const { data: links = [] } = useQuery({ queryKey: ["leagueEventMapLinks", eventId], queryFn: () => base44.entities.LeagueEventGame.filter({ event_id: eventId }), enabled: !!eventId, initialData: [] });

  const eventGames = useMemo(() => {
    const linkedIds = new Set(links.map((l) => l.league_game_id));
    return allGames.filter((g) => g.league_event_id === eventId || linkedIds.has(g.id));
  }, [allGames, links, eventId]);

  const [fields, setFields] = useState([]);
  const [objects, setObjects] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [serverFieldIds, setServerFieldIds] = useState(new Set());
  const [publishedObjects, setPublishedObjects] = useState([]);
  const [hasUnpublished, setHasUnpublished] = useState(false);

  const [selected, setSelected] = useState({ id: null, type: null });
  const [activeTool, setActiveTool] = useState("select");
  const [view, setView] = useState("design");
  const [layersOpen, setLayersOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);

  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Hydrate local draft from server once data is available.
  useEffect(() => {
    if (loaded || !event) return;
    setFields(serverFields.map((f) => clone(f)));
    setServerFieldIds(new Set(serverFields.map((f) => f.id)));
    setObjects(clone(mapRecord?.draft_objects || []));
    setPublishedObjects(clone(mapRecord?.published_objects || []));
    setHasUnpublished(!!mapRecord?.has_unpublished_changes || (!mapRecord && serverFields.length > 0));
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverFields, mapRecord, event, loaded]);

  const snapshot = useCallback(() => ({ fields: clone(fields), objects: clone(objects) }), [fields, objects]);

  const mutate = useCallback((next) => {
    setHistory((h) => [...h.slice(-49), { fields: clone(fields), objects: clone(objects) }]);
    setFuture([]);
    if (typeof next === "function") next();
  }, [fields, objects]);

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [{ fields: clone(fields), objects: clone(objects) }, ...f]);
      setFields(prev.fields);
      setObjects(prev.objects);
      return h.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setHistory((h) => [...h, { fields: clone(fields), objects: clone(objects) }]);
      setFields(next.fields);
      setObjects(next.objects);
      return f.slice(1);
    });
  };

  const markDirty = () => setHasUnpublished(true);

  // --- Field operations ---
  const addField = (center) => {
    const id = uid();
    const order = fields.length;
    const field = { id, league_event_id: eventId, league_account_id: account?.id, name: `Field ${fields.length + 1}`, field_number: "", field_type: "multipurpose", status: "active", latitude: center[0], longitude: center[1], geometry: defaultFieldGeometry(center), fill_opacity: 0.25, fill_color: "#5DADA5", border_color: "#2C4F4E", border_width: 2, label_position: "center", text_size: "md", display_order: order, is_active: true };
    mutate(() => setFields((f) => [...f, field]));
    setSelected({ id, type: "field" });
    markDirty();
  };

  const updateField = (id, patch) => {
    mutate(() => setFields((f) => f.map((x) => (x.id === id ? { ...x, ...patch } : x))));
    markDirty();
  };

  const deleteField = (id) => {
    const assigned = gamesOnField(id, allGames);
    if (assigned.length) {
      toast.error(`This field is assigned to ${assigned.length} game${assigned.length === 1 ? "" : "s"}. Reassign or unschedule those games before deleting the field.`);
      return;
    }
    mutate(() => setFields((f) => f.filter((x) => x.id !== id)));
    setSelected({ id: null, type: null });
    markDirty();
  };

  // --- Venue object operations ---
  const addObject = (obj) => {
    mutate(() => setObjects((o) => [...o, { ...obj, display_order: o.length }]));
    setSelected({ id: obj.id, type: obj.type });
    markDirty();
  };

  const updateObject = (id, patch) => {
    mutate(() => setObjects((o) => o.map((x) => (x.id === id ? { ...x, ...patch } : x))));
    markDirty();
  };

  const deleteObject = (id) => {
    mutate(() => setObjects((o) => o.filter((x) => x.id !== id)));
    setSelected({ id: null, type: null });
    markDirty();
  };

  const duplicateObject = (id, type) => {
    if (type === "field") {
      const f = fields.find((x) => x.id === id);
      if (!f) return;
      const nid = uid();
      const copy = { ...clone(f), id: nid, name: `${f.name} (Copy)`, display_order: fields.length };
      mutate(() => setFields((arr) => [...arr, copy]));
      setSelected({ id: nid, type: "field" });
    } else {
      const o = objects.find((x) => x.id === id);
      if (!o) return;
      const nid = uid();
      const copy = { ...clone(o), id: nid, title: `${o.title || "Object"} (Copy)`, display_order: objects.length };
      mutate(() => setObjects((arr) => [...arr, copy]));
      setSelected({ id: nid, type: o.type });
    }
    markDirty();
  };

  const moveOrder = (id, type, dir) => {
    if (type === "field") mutate(() => setFields((arr) => moveItem(arr, id, dir)));
    else mutate(() => setObjects((arr) => moveItem(arr, id, dir)));
    markDirty();
  };

  const toggleVisible = (id, type) => {
    if (type === "field") updateField(id, { hidden: !fields.find((f) => f.id === id)?.hidden });
    else updateObject(id, { hidden: !objects.find((o) => o.id === id)?.hidden });
  };
  const toggleLock = (id, type) => {
    if (type === "field") updateField(id, { locked: !fields.find((f) => f.id === id)?.locked });
    else updateObject(id, { locked: !objects.find((o) => o.id === id)?.locked });
  };
  const renameObject = (id, type) => {
    const cur = type === "field" ? fields.find((f) => f.id === id)?.name : objects.find((o) => o.id === id)?.title;
    const next = window.prompt("Rename", cur || "");
    if (next == null) return;
    if (type === "field") updateField(id, { name: next });
    else updateObject(id, { title: next });
  };

  const selectedObject = useMemo(() => {
    if (!selected.id) return null;
    if (selected.type === "field") return fields.find((f) => f.id === selected.id);
    return objects.find((o) => o.id === selected.id);
  }, [selected, fields, objects]);

  const gameCounts = useMemo(() => {
    const counts = {};
    fields.forEach((f) => { counts[f.id] = allGames.filter((g) => g.league_event_field_id === f.id).length; });
    return counts;
  }, [fields, allGames]);

  // --- Save / publish ---
  const persistFields = async () => {
    const currentServerIds = new Set(serverFieldIds);
    const localIds = new Set(fields.map((f) => f.id));
    // Deletes
    for (const sid of serverFieldIds) {
      if (!localIds.has(sid)) {
        await base44.entities.LeagueEventField.delete(sid).catch(() => {});
      }
    }
    let created = 0;
    const idMap = {};
    for (const f of fields) {
      const payload = { ...f };
      delete payload.id;
      if (currentServerIds.has(f.id)) {
        await base44.entities.LeagueEventField.update(f.id, payload).catch((e) => toast.error(`Field ${f.name}: ${e.message}`));
      } else {
        const createdRecord = await base44.entities.LeagueEventField.create(payload).catch((e) => { toast.error(`Field ${f.name}: ${e.message}`); return null; });
        if (createdRecord) { idMap[f.id] = createdRecord.id; created++; }
      }
    }
    // Remap local temp ids to server ids so games can reference them
    if (created) {
      setFields((arr) => arr.map((f) => idMap[f.id] ? { ...f, id: idMap[f.id] } : f));
      setServerFieldIds((s) => new Set([...s, ...Object.values(idMap)]));
      queryClient.invalidateQueries({ queryKey: ["leagueEventFields", eventId] });
    }
  };

  const persistMapRecord = async (publish) => {
    const payload = {
      league_event_id: eventId,
      league_account_id: account?.id,
      draft_objects: objects,
      has_unpublished_changes: publish ? false : hasUnpublished,
      draft_updated_at: nowIso(),
      default_view: mapRecord?.default_view,
      tile_mode: mapRecord?.tile_mode || "standard",
    };
    if (publish) {
      payload.published_objects = objects;
      payload.published_at = nowIso();
      payload.has_unpublished_changes = false;
    }
    if (mapRecord?.id) {
      await base44.entities.LeagueEventMap.update(mapRecord.id, payload);
    } else {
      await base44.entities.LeagueEventMap.create(payload);
    }
    queryClient.invalidateQueries({ queryKey: ["leagueEventMapRecord", eventId] });
    if (publish) {
      setPublishedObjects(clone(objects));
      setHasUnpublished(false);
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      await persistFields();
      await persistMapRecord(false);
      toast.success("Draft saved.");
    } catch (e) {
      toast.error(e.message || "Could not save draft.");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setSaving(true);
    try {
      await persistFields();
      await persistMapRecord(true);
      toast.success("Map published. Attendees now see the updated venue map.");
    } catch (e) {
      toast.error(e.message || "Could not publish.");
    } finally {
      setSaving(false);
    }
  };

  const fitVenue = () => {
    const map = mapRef.current;
    if (!map) return;
    import("@/lib/leagueEventMapGeometry").then(({ fitBoundsFromObjects }) => {
      const bounds = fitBoundsFromObjects(fields, objects.filter((o) => !o.hidden));
      if (bounds) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
      else toast.info("Add some objects first, then fit the venue.");
    });
  };

  const setDefaultView = () => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    updateMapRecord({ default_view: { center: [c.lat, c.lng], zoom: map.getZoom() } });
    toast.success("Default view saved.");
  };

  const resetView = () => fitVenue();

  const updateMapRecord = async (patch) => {
    if (mapRecord?.id) await base44.entities.LeagueEventMap.update(mapRecord.id, patch).catch(() => {});
    else await base44.entities.LeagueEventMap.create({ league_event_id: eventId, league_account_id: account?.id, ...patch }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["leagueEventMapRecord", eventId] });
  };

  // Assign a game to the selected field from the map field panel.
  const assignGame = async (game, field) => {
    if (!serverFieldIds.has(field.id)) {
      toast.error("Save the field first so it has a permanent record, then assign games.");
      return;
    }
    const check = canAssignGameToField(game, field, allGames);
    if (!check.ok) { toast.error(check.reason); return; }
    await base44.entities.LeagueGame.update(game.id, { league_event_field_id: field.id, field_name_snapshot: field.name, league_event_id: eventId });
    queryClient.invalidateQueries({ queryKey: ["leagueEventMapGames", event?.organizer_business_id] });
    toast.success(`${game.home_team || "Game"} vs ${game.away_team || ""} assigned to ${field.name}.`);
  };

  if (!loaded || !event) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading venue map…</div>;

  const RightContent = () => {
    if (layersOpen) {
      return (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <p className="flex items-center gap-2 text-sm font-black text-[#2C4F4E]"><Layers className="h-4 w-4" /> Layers</p>
            <button type="button" onClick={() => setLayersOpen(false)} className="rounded p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <LayersPanel fields={fields} objects={objects} gameCounts={gameCounts} selectedId={selected.id} onSelect={(id, type) => { setSelected({ id, type }); setLayersOpen(false); }} onToggleVisible={toggleVisible} onToggleLock={toggleLock} onRename={renameObject} onDuplicate={duplicateObject} onDelete={(id, type) => type === "field" ? deleteField(id) : deleteObject(id)} onMoveOrder={moveOrder} />
          </div>
        </div>
      );
    }
    if (view === "schedule" && selected.type === "field") {
      const field = fields.find((f) => f.id === selected.id);
      return <FieldPanel field={field} games={allGames} eventGames={eventGames} onAssignGame={assignGame} onAddGame={() => navigate(`/LeagueTeamDashboard?tab=schedule&account=${account?.id}`)} onOpenSchedule={() => navigate(`/LeagueTeamDashboard?tab=schedule&account=${account?.id}`)} onClose={() => setSelected({ id: null, type: null })} />;
    }
    if (selected.id) {
      return <ObjectSettingsPanel object={selectedObject} type={selected.type} onChange={(patch) => selected.type === "field" ? updateField(selected.id, patch) : updateObject(selected.id, patch)} onDelete={() => selected.type === "field" ? deleteField(selected.id) : deleteObject(selected.id)} onDuplicate={() => duplicateObject(selected.id, selected.type)} onManageGames={() => setView("schedule")} gameCount={gameCounts[selected.id]} />;
    }
    return <div className="p-4 text-xs text-slate-400">Add a field, area, entrance, route, label or icon using the tools. Select an object to edit it.</div>;
  };

  const TopBar = () => (
    <div className="yardit-ui-control flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <button type="button" onClick={() => navigate(`/VendorEventDashboard?id=${eventId}`)} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-[#2C4F4E] hover:bg-slate-100"><ArrowLeft className="h-4 w-4" /> Back</button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[#2C4F4E]">Event Map · {event.title}</p>
        <p className="truncate text-[11px] text-slate-500">{hasUnpublished ? "Unpublished changes" : "All changes published"}</p>
      </div>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${view === "design" ? "bg-[#5DADA5] text-white" : "bg-[#F4A849] text-[#2C4F4E]"}`}>{view}</span>
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[4000] flex flex-col bg-slate-50">
        <TopBar />
        <div className="relative flex-1">
          <VenueMapCanvas event={event} fields={fields} objects={objects} activeTool={activeTool} setActiveTool={setActiveTool} selectedId={selected.id} selectedType={selected.type} onSelect={(id, type) => setSelected({ id, type })} onAddField={addField} onAddObject={addObject} onUpdateField={updateField} onUpdateObject={updateObject} view={view} games={allGames} onSelectField={(f) => setSelected({ id: f.id, type: "field" })} mapRef={mapRef} />
        </div>
        {layersOpen && <div className="absolute inset-x-0 bottom-0 max-h-[45vh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl"><RightContent /></div>}
        {!layersOpen && selected.id && <div className="absolute inset-x-0 bottom-0 max-h-[45vh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl"><RightContent /></div>}
        <MapToolbar activeTool={activeTool} setTool={setActiveTool} layout="tray" view={view} setView={setView} layersOpen={layersOpen} setLayersOpen={setLayersOpen} canUndo={!!history.length} canRedo={!!future.length} onUndo={undo} onRedo={redo} onSaveDraft={saveDraft} onPublish={publish} saving={saving} onFitVenue={fitVenue} onSetDefault={setDefaultView} onResetView={resetView} hasUnpublished={hasUnpublished} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[4000] flex flex-col bg-slate-50">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <div className="w-56 shrink-0"><MapToolbar activeTool={activeTool} setTool={setActiveTool} layout="panel" view={view} setView={setView} layersOpen={layersOpen} setLayersOpen={setLayersOpen} canUndo={!!history.length} canRedo={!!future.length} onUndo={undo} onRedo={redo} onSaveDraft={saveDraft} onPublish={publish} saving={saving} onFitVenue={fitVenue} onSetDefault={setDefaultView} onResetView={resetView} hasUnpublished={hasUnpublished} /></div>
        <div className="relative min-w-0 flex-1">
          <VenueMapCanvas event={event} fields={fields} objects={objects} activeTool={activeTool} setActiveTool={setActiveTool} selectedId={selected.id} selectedType={selected.type} onSelect={(id, type) => setSelected({ id, type })} onAddField={addField} onAddObject={addObject} onUpdateField={updateField} onUpdateObject={updateObject} view={view} games={allGames} onSelectField={(f) => setSelected({ id: f.id, type: "field" })} mapRef={mapRef} />
        </div>
        <div className="w-80 shrink-0 overflow-y-auto border-l border-slate-200 bg-white"><RightContent /></div>
      </div>
    </div>
  );
}

function moveItem(arr, id, dir) {
  const idx = arr.findIndex((x) => x.id === id);
  if (idx < 0) return arr;
  const next = idx + dir;
  if (next < 0 || next >= arr.length) return arr;
  const copy = arr.slice();
  const [item] = copy.splice(idx, 1);
  copy.splice(next, 0, item);
  return copy.map((x, i) => ({ ...x, display_order: i }));
}