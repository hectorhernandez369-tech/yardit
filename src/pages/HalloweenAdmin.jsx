import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, ArrowLeft, CalendarDays, Candy, CheckCircle2, Clock3, ExternalLink, Ghost, Loader2, MapPin, Search, Shield, Sparkles, Star, UserRound, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getAdminSession } from "@/components/admin/AdminLoginModal";
import AdminLoginModal from "@/components/admin/AdminLoginModal";
import { HALLOWEEN_PREVIEW_ICON_ASSETS } from "@/lib/halloweenMapIcons";
import { getHalloweenSpotTypeLabel } from "@/lib/halloweenSpots";

const SPOT_TYPES = [
  { value: "halloween_decorations", label: "Halloween Decorations" },
  { value: "haunted", label: "Haunted House" },
  { value: "trick_or_treat", label: "Trick-or-Treat" },
  { value: "trunk_or_treat", label: "Trunk-or-Treat" },
  { value: "scary_yard", label: "Scary Yard" },
  { value: "light_show", label: "Light Show" },
];

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const displayAddress = (spot) => spot.address || [spot.street_address, spot.city, spot.state, spot.zip_code].filter(Boolean).join(", ");

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(value) {
  if (!value) return "—";
  const [h, m] = String(value).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function HalloweenAdmin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [adminSession, setAdminSession] = useState(() => getAdminSession());
  const [showLogin, setShowLogin] = useState(false);
  const [accessState, setAccessState] = useState("loading");
  const [spots, setSpots] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [reservationEmail, setReservationEmail] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const me = await base44.auth.me();
        const [byId, byEmail] = await Promise.all([
          base44.entities.AdminProfile.filter({ user_id: me.id }),
          base44.entities.AdminProfile.filter({ email: normalizeEmail(me.email) }),
        ]);
        const profile = byId[0] || byEmail[0];
        if (!profile || profile.is_active !== true) {
          setAccessState("denied");
          return;
        }
        me.role = profile.role_label;
        me.isAdmin = true;
        setUser(me);
        setAccessState("ready");
      } catch {
        setAccessState("denied");
      }
    };
    init();
  }, [adminSession]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [locationRows, reservationRows, reportRows] = await Promise.all([
        base44.entities.Location.filter({ type: "halloween_candy" }, "-created_date"),
        base44.entities.PendingHalloweenOwnership.list("-created_date").catch(() => []),
        base44.entities.Report.list("-created_date").catch(() => []),
      ]);
      setSpots(locationRows || []);
      setReservations(reservationRows || []);
      setReports((reportRows || []).filter((report) => report.target_type === "location" || report.location_id));
    } catch (error) {
      console.error(error);
      toast.error("Could not load Halloween Admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessState === "ready" && adminSession) loadData();
  }, [accessState, adminSession]);

  const selected = spots.find((spot) => spot.id === selectedId) || null;
  const selectedReservation = selected ? reservations.find((r) => r.location_id === selected.id && r.status === "pending") : null;
  const selectedReports = selected ? reports.filter((r) => r.location_id === selected.id || (r.target_type === "location" && r.listingId === selected.id)) : [];

  const stats = useMemo(() => ({
    total: spots.length,
    active: spots.filter((s) => s.status === "active").length,
    suspended: spots.filter((s) => s.status === "suspended").length,
    mustSee: spots.filter((s) => s.halloween_featured_badge === "must_see").length,
    pendingClaims: reservations.filter((r) => r.status === "pending").length,
    reports: reports.length,
  }), [spots, reservations, reports]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return spots.filter((spot) => {
      if (statusFilter !== "all" && spot.status !== statusFilter) return false;
      if (typeFilter !== "all" && (spot.halloween_spot_type || spot.halloween_icon_key || "halloween_decorations") !== typeFilter) return false;
      if (featuredFilter === "must_see" && spot.halloween_featured_badge !== "must_see") return false;
      if (featuredFilter === "standard" && spot.halloween_featured_badge === "must_see") return false;
      if (!q) return true;
      return [spot.title, spot.display_title, spot.address, spot.street_address, spot.city, spot.state, spot.zip_code, spot.id]
        .some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [spots, search, statusFilter, typeFilter, featuredFilter]);

  const patchSpot = async (id, patch, successMessage = "Halloween Spot updated") => {
    setSaving(true);
    try {
      await base44.entities.Location.update(id, patch);
      setSpots((prev) => prev.map((spot) => spot.id === id ? { ...spot, ...patch } : spot));
      toast.success(successMessage);
    } catch (error) {
      console.error(error);
      toast.error("Could not update Halloween Spot.");
    } finally {
      setSaving(false);
    }
  };

  const toggleMustSee = async (spot) => {
    const next = spot.halloween_featured_badge === "must_see" ? "none" : "must_see";
    await patchSpot(spot.id, { halloween_featured_badge: next }, next === "must_see" ? "Yardit Must See awarded ⭐" : "Must See badge removed");
  };

  const toggleSuspended = async (spot) => {
    const next = spot.status === "suspended" ? "active" : "suspended";
    await patchSpot(spot.id, { status: next }, next === "suspended" ? "Halloween Spot suspended" : "Halloween Spot restored");
  };

  const saveReservation = async () => {
    if (!selected) return;
    const email = normalizeEmail(reservationEmail);
    if (!email || !email.includes("@")) {
      toast.error("Enter a valid email.");
      return;
    }
    setSaving(true);
    try {
      const existing = reservations.find((r) => r.location_id === selected.id && r.status === "pending");
      if (existing) {
        await base44.entities.PendingHalloweenOwnership.update(existing.id, { email, note: `Halloween ownership reservation for ${selected.title || selected.id}` });
      } else {
        await base44.entities.PendingHalloweenOwnership.create({ email, location_id: selected.id, status: "pending", note: `Halloween ownership reservation for ${selected.title || selected.id}` });
      }
      setReservationEmail("");
      setEmailDialogOpen(false);
      await loadData();
      toast.success("Future ownership email attached privately.");
    } catch (error) {
      console.error(error);
      toast.error("Could not save ownership reservation.");
    } finally {
      setSaving(false);
    }
  };

  if (accessState === "loading") return <div className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
  if (accessState === "denied") return <div className="mx-auto mt-16 max-w-md p-8 text-center"><Shield className="mx-auto mb-3 h-10 w-10 text-slate-400" /><h1 className="text-xl font-bold">No Halloween Admin Access</h1><p className="mt-2 text-sm text-slate-500">An active Yardit admin profile is required.</p><Button variant="outline" className="mt-5" onClick={() => navigate(createPageUrl("Home"))}>Back to Yardit</Button></div>;

  if (!adminSession) return <><div className="mx-auto mt-16 max-w-md rounded-2xl border border-purple-200 bg-purple-50 p-8 text-center"><Ghost className="mx-auto mb-3 h-12 w-12 text-purple-800" /><h1 className="text-xl font-black text-purple-950">Halloween Admin</h1><p className="mt-2 text-sm text-purple-900/70">Employee ID and PIN are required before managing seasonal spots.</p><Button className="mt-5 bg-purple-900 hover:bg-purple-800" onClick={() => setShowLogin(true)}>Enter Admin Mode</Button></div><AdminLoginModal open={showLogin} onClose={() => setShowLogin(false)} onSuccess={(session) => { setAdminSession(session); setShowLogin(false); }} /></>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 px-3 py-5 text-white sm:px-5">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl("AdminLite"))} className="border-white/20 bg-white/10 text-white hover:bg-white/20"><ArrowLeft className="mr-1 h-4 w-4" /> Admin Hub</Button>
            <div>
              <div className="flex items-center gap-2"><Ghost className="h-7 w-7 text-orange-300" /><h1 className="text-2xl font-black">Halloween Admin</h1></div>
              <p className="text-xs text-purple-200">Seasonal spots, featured badges, safety, ownership, and map presentation.</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={loadData} disabled={loading} className="border-orange-300/40 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20">{loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Refresh</Button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Total Spots", stats.total, Ghost], ["Active", stats.active, CheckCircle2], ["Suspended", stats.suspended, XCircle], ["Must See", stats.mustSee, Star], ["Pending Claims", stats.pendingClaims, UserRound], ["Reports", stats.reports, AlertTriangle],
          ].map(([label, value, Icon]) => <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3"><Icon className="mb-1 h-4 w-4 text-orange-300" /><div className="text-xl font-black">{value}</div><div className="text-[10px] uppercase tracking-wide text-purple-200">{label}</div></div>)}
        </div>

        <div className="mb-4 grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 md:grid-cols-[1fr_170px_190px_160px]">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-300" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, city, address, spot ID..." className="border-white/10 bg-black/20 pl-9 text-white placeholder:text-purple-300/50" /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="border-white/10 bg-black/20 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="suspended">Suspended</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="under_review">Under Review</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="border-white/10 bg-black/20 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Spot Types</SelectItem>{SPOT_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select>
          <Select value={featuredFilter} onValueChange={setFeaturedFilter}><SelectTrigger className="border-white/10 bg-black/20 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All badges</SelectItem><SelectItem value="must_see">Must See only</SelectItem><SelectItem value="standard">No Must See</SelectItem></SelectContent></Select>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="border-b border-white/10 px-4 py-3 text-sm font-bold">Halloween Spots ({filtered.length})</div>
            <div className="max-h-[70vh] divide-y divide-white/10 overflow-y-auto">
              {loading ? <div className="p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : filtered.length === 0 ? <div className="p-8 text-center text-purple-200">No Halloween Spots match these filters.</div> : filtered.map((spot) => {
                const iconKey = spot.halloween_spot_type || spot.halloween_icon_key || "halloween_decorations";
                const iconUrl = HALLOWEEN_PREVIEW_ICON_ASSETS[iconKey] || HALLOWEEN_PREVIEW_ICON_ASSETS.halloween_decorations;
                const pendingClaim = reservations.some((r) => r.location_id === spot.id && r.status === "pending");
                const reportCount = reports.filter((r) => r.location_id === spot.id || (r.target_type === "location" && r.listingId === spot.id)).length;
                return <button key={spot.id} type="button" onClick={() => setSelectedId(spot.id)} className={`flex w-full items-center gap-3 p-3 text-left transition hover:bg-white/5 ${selectedId === spot.id ? "bg-orange-500/10 ring-1 ring-inset ring-orange-400/40" : ""}`}>
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-orange-300/20 bg-black/20"><img src={iconUrl} alt="" className="h-12 w-12 object-contain" /></div>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><span className="truncate font-bold">{spot.title || "Halloween Spot"}</span>{spot.halloween_featured_badge === "must_see" && <Badge className="bg-yellow-500 text-black"><Star className="mr-1 h-3 w-3" />Must See</Badge>}{spot.status === "suspended" && <Badge className="bg-red-600">Suspended</Badge>}{pendingClaim && <Badge variant="outline" className="border-purple-300/40 text-purple-100">Claim Reserved</Badge>}{reportCount > 0 && <Badge className="bg-orange-600">{reportCount} report{reportCount === 1 ? "" : "s"}</Badge>}</div><p className="mt-0.5 text-xs text-purple-200">{getHalloweenSpotTypeLabel(spot)} · {spot.city || "Unknown city"}</p><p className="truncate text-[11px] text-slate-400">{displayAddress(spot) || spot.id}</p></div>
                  <div className="hidden text-right text-[10px] text-slate-400 sm:block"><div>{formatDate(spot.halloween_start_date || spot.start_date_time)}</div><div>{formatTime(spot.halloween_start_time || spot.viewing_start_time)}</div></div>
                </button>;
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            {!selected ? <div className="flex min-h-[280px] flex-col items-center justify-center text-center text-purple-200"><Ghost className="mb-2 h-10 w-10 opacity-50" /><p className="font-bold">Select a Halloween Spot</p><p className="mt-1 text-xs">Manage its badge, status, type, schedule, icon, and ownership.</p></div> : <SpotEditor spot={selected} reservation={selectedReservation} reportCount={selectedReports.length} saving={saving} onPatch={(patch, message) => patchSpot(selected.id, patch, message)} onToggleMustSee={() => toggleMustSee(selected)} onToggleSuspended={() => toggleSuspended(selected)} onReserveEmail={() => { setReservationEmail(selectedReservation?.email || ""); setEmailDialogOpen(true); }} />}
          </div>
        </div>
      </div>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}><DialogContent><DialogHeader><DialogTitle>Reserve Future Ownership</DialogTitle></DialogHeader><p className="text-sm text-slate-600">Privately attach this Halloween Spot to an email. When that email registers with Yardit, the ownership claim system can attach the Spot to their account.</p><div className="space-y-2"><Label>Email</Label><Input value={reservationEmail} onChange={(e) => setReservationEmail(e.target.value)} placeholder="owner@example.com" /></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button><Button onClick={saveReservation} disabled={saving}>{saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Save Reservation</Button></div></DialogContent></Dialog>
    </div>
  );
}

function SpotEditor({ spot, reservation, reportCount, saving, onPatch, onToggleMustSee, onToggleSuspended, onReserveEmail }) {
  const [draft, setDraft] = useState(() => ({ ...spot, halloween_tags: spot.halloween_tags || [] }));
  useEffect(() => setDraft({ ...spot, halloween_tags: spot.halloween_tags || [] }), [spot]);
  const candyPrimary = ["trick_or_treat", "trunk_or_treat"].includes(draft.halloween_spot_type || draft.halloween_icon_key);
  const iconKey = draft.halloween_spot_type || draft.halloween_icon_key || "halloween_decorations";
  const iconUrl = HALLOWEEN_PREVIEW_ICON_ASSETS[iconKey] || HALLOWEEN_PREVIEW_ICON_ASSETS.halloween_decorations;

  const toggleTag = (tag) => setDraft((prev) => ({ ...prev, halloween_tags: (prev.halloween_tags || []).includes(tag) ? prev.halloween_tags.filter((item) => item !== tag) : [...(prev.halloween_tags || []), tag] }));
  const save = () => {
    const type = draft.halloween_spot_type || draft.halloween_icon_key || "halloween_decorations";
    const tags = ["trick_or_treat", "trunk_or_treat"].includes(type) ? (draft.halloween_tags || []).filter((tag) => tag !== "no_candy_here") : (draft.halloween_tags || []);
    onPatch({
      title: draft.title || "Halloween Spot",
      description: draft.description || "",
      halloween_spot_type: type,
      halloween_icon_key: type,
      halloween_tags: tags,
      halloween_candy_available: ["trick_or_treat", "trunk_or_treat"].includes(type) ? true : tags.includes("no_candy_here") ? false : draft.halloween_candy_available === true,
      halloween_walkthrough: draft.halloween_walkthrough === true,
      halloween_lights: draft.halloween_lights === true,
      halloween_sound: draft.halloween_sound === true,
      halloween_jump_scares: draft.halloween_jump_scares === true,
      halloween_suggested_age: draft.halloween_suggested_age || "",
      halloween_start_date: draft.halloween_start_date || "",
      halloween_end_date: draft.halloween_end_date || draft.halloween_start_date || "",
      halloween_start_time: draft.halloween_start_time || draft.viewing_start_time || "",
      halloween_end_time: draft.halloween_end_time || draft.viewing_end_time || "",
      viewing_start_time: draft.halloween_start_time || draft.viewing_start_time || "",
      viewing_end_time: draft.halloween_end_time || draft.viewing_end_time || "",
      custom_icon_url: draft.custom_icon_url || "",
    }, "Halloween Spot details saved");
  };

  return <div className="space-y-4">
    <div className="flex items-start gap-3"><div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-orange-300/30 bg-black/20"><img src={iconUrl} alt="" className="h-16 w-16 object-contain" /></div><div className="min-w-0"><div className="flex flex-wrap gap-1.5">{spot.halloween_featured_badge === "must_see" && <Badge className="bg-yellow-500 text-black"><Star className="mr-1 h-3 w-3" />Yardit Must See</Badge>}<Badge className={spot.status === "suspended" ? "bg-red-600" : "bg-green-600"}>{spot.status || "active"}</Badge>{reportCount > 0 && <Badge className="bg-orange-600">{reportCount} report{reportCount === 1 ? "" : "s"}</Badge>}</div><p className="mt-2 break-all font-mono text-[10px] text-slate-400">{spot.id}</p><p className="mt-1 text-xs text-purple-200">{displayAddress(spot)}</p></div></div>

    <div className="grid grid-cols-2 gap-2"><Button onClick={onToggleMustSee} disabled={saving} className={spot.halloween_featured_badge === "must_see" ? "bg-yellow-500 text-black hover:bg-yellow-400" : "bg-purple-800 hover:bg-purple-700"}><Star className="mr-1 h-4 w-4" />{spot.halloween_featured_badge === "must_see" ? "Remove Must See" : "Award Must See"}</Button><Button onClick={onToggleSuspended} disabled={saving} variant="outline" className={spot.status === "suspended" ? "border-green-400/40 bg-green-500/10 text-green-100" : "border-red-400/40 bg-red-500/10 text-red-100"}>{spot.status === "suspended" ? <CheckCircle2 className="mr-1 h-4 w-4" /> : <XCircle className="mr-1 h-4 w-4" />}{spot.status === "suspended" ? "Restore" : "Suspend"}</Button></div>

    <div className="space-y-2"><Label className="text-purple-100">Title</Label><Input value={draft.title || ""} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} className="border-white/10 bg-black/20 text-white" /><Label className="text-purple-100">Description</Label><Textarea value={draft.description || ""} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} rows={3} className="border-white/10 bg-black/20 text-white" /></div>

    <div className="space-y-2"><Label className="text-purple-100">Spot Type</Label><Select value={draft.halloween_spot_type || draft.halloween_icon_key || "halloween_decorations"} onValueChange={(value) => setDraft((prev) => ({ ...prev, halloween_spot_type: value, halloween_icon_key: value, halloween_tags: ["trick_or_treat", "trunk_or_treat"].includes(value) ? (prev.halloween_tags || []).filter((tag) => tag !== "no_candy_here") : prev.halloween_tags, halloween_candy_available: ["trick_or_treat", "trunk_or_treat"].includes(value) ? true : prev.halloween_candy_available }))}><SelectTrigger className="border-white/10 bg-black/20 text-white"><SelectValue /></SelectTrigger><SelectContent>{SPOT_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select></div>

    <div className="grid grid-cols-2 gap-2"><label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/15 p-2 text-xs"><Checkbox checked={(draft.halloween_tags || []).includes("kid_friendly")} onCheckedChange={() => toggleTag("kid_friendly")} /> Kid Friendly</label>{!candyPrimary && <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/15 p-2 text-xs"><Checkbox checked={(draft.halloween_tags || []).includes("no_candy_here")} onCheckedChange={() => toggleTag("no_candy_here")} /> No Candy Here</label>}<label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/15 p-2 text-xs"><Checkbox checked={draft.halloween_walkthrough === true} onCheckedChange={(value) => setDraft((prev) => ({ ...prev, halloween_walkthrough: value === true }))} /> Walk-through</label><label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/15 p-2 text-xs"><Checkbox checked={draft.halloween_lights === true} onCheckedChange={(value) => setDraft((prev) => ({ ...prev, halloween_lights: value === true }))} /> Lights</label><label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/15 p-2 text-xs"><Checkbox checked={draft.halloween_sound === true} onCheckedChange={(value) => setDraft((prev) => ({ ...prev, halloween_sound: value === true }))} /> Sound / Music</label><label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/15 p-2 text-xs"><Checkbox checked={draft.halloween_jump_scares === true} onCheckedChange={(value) => setDraft((prev) => ({ ...prev, halloween_jump_scares: value === true }))} /> Jump Scares</label></div>

    <div className="grid grid-cols-2 gap-2"><div><Label className="text-xs text-purple-200">Start date</Label><Input type="date" value={draft.halloween_start_date || ""} onChange={(e) => setDraft((prev) => ({ ...prev, halloween_start_date: e.target.value }))} className="border-white/10 bg-black/20 text-white" /></div><div><Label className="text-xs text-purple-200">End date</Label><Input type="date" value={draft.halloween_end_date || ""} onChange={(e) => setDraft((prev) => ({ ...prev, halloween_end_date: e.target.value }))} className="border-white/10 bg-black/20 text-white" /></div><div><Label className="text-xs text-purple-200">Starts at</Label><Input type="time" value={draft.halloween_start_time || draft.viewing_start_time || ""} onChange={(e) => setDraft((prev) => ({ ...prev, halloween_start_time: e.target.value }))} className="border-white/10 bg-black/20 text-white" /></div><div><Label className="text-xs text-purple-200">Ends at</Label><Input type="time" value={draft.halloween_end_time || draft.viewing_end_time || ""} onChange={(e) => setDraft((prev) => ({ ...prev, halloween_end_time: e.target.value }))} className="border-white/10 bg-black/20 text-white" /></div></div>

    <div><Label className="text-xs text-purple-200">Suggested age</Label><Input value={draft.halloween_suggested_age || ""} onChange={(e) => setDraft((prev) => ({ ...prev, halloween_suggested_age: e.target.value }))} placeholder="All ages, 8+, Teens & adults" className="border-white/10 bg-black/20 text-white" /></div>
    <div><Label className="text-xs text-purple-200">Custom icon URL <span className="font-normal text-slate-400">(admin override)</span></Label><Input value={draft.custom_icon_url || ""} onChange={(e) => setDraft((prev) => ({ ...prev, custom_icon_url: e.target.value }))} placeholder="Leave blank for standard Spot Type artwork" className="border-white/10 bg-black/20 text-white" /></div>

    <div className="rounded-xl border border-white/10 bg-black/15 p-3 text-xs"><div className="flex items-center justify-between"><span className="text-purple-200">Owner</span><span className="font-mono text-[10px]">{spot.owner_user_id || "Unclaimed"}</span></div><div className="mt-2 flex items-center justify-between"><span className="text-purple-200">Future claim</span><span>{reservation?.email || "None"}</span></div><Button variant="outline" size="sm" onClick={onReserveEmail} className="mt-2 w-full border-purple-300/30 bg-purple-500/10 text-purple-100">{reservation ? "Change Reserved Email" : "Reserve by Email"}</Button></div>

    <div className="flex gap-2"><Button onClick={save} disabled={saving} className="flex-1 bg-orange-600 hover:bg-orange-500">{saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Save Changes</Button><Button variant="outline" onClick={() => window.open(`${createPageUrl("Home")}?listingId=${spot.id}`, "_blank")} className="border-white/20 bg-white/10 text-white"><ExternalLink className="mr-1 h-4 w-4" />Map</Button></div>
  </div>;
}