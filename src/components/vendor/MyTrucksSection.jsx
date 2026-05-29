import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Truck, Plus, Loader2, Trash2, MapPin, AlertCircle, Edit2, Clock, History, PauseCircle, PlayCircle, XCircle, CalendarClock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { TIER_CONFIG } from "@/lib/tierConfig";
import { getVendorUsageLimitStatus } from "@/lib/vendorUsage";
import TruckLogoEditor from "./TruckLogoEditor";
import VendorPinScheduleDrawer from "./VendorPinScheduleDrawer";

export default function MyTrucksSection({ vendorAccount: providedVendorAccount, currentUser: providedCurrentUser, onRefresh }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPin, setEditingPin] = useState(null);
  const [selectedPinHistory, setSelectedPinHistory] = useState(null);
  const [schedulingPin, setSchedulingPin] = useState(null);
  const [formData, setFormData] = useState({ pin_name: "", description: "", is_active: true, pin_logo_url: "", pin_icon_style: "default", assigned_users: [] });
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoEditorUrl, setLogoEditorUrl] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: loadedCurrentUser } = useQuery({
    queryKey: ["currentVendorUser"],
    queryFn: () => base44.auth.me(),
    enabled: !providedVendorAccount?.id && !providedCurrentUser?.id,
  });

  const currentUser = providedCurrentUser || loadedCurrentUser;

  const { data: loadedVendorAccounts = [], isLoading: loadingVendorAccount } = useQuery({
    queryKey: ["vendorAccountForTrucks", currentUser?.id, currentUser?.email],
    queryFn: async () => {
      const byId = await base44.entities.VendorAccount.filter({ owner_user_id: currentUser.id });
      if (byId.length) return byId;
      return base44.entities.VendorAccount.filter({ owner_user_id: currentUser.email });
    },
    enabled: !providedVendorAccount?.id && !!currentUser?.id,
  });

  const vendorAccount = providedVendorAccount || loadedVendorAccounts.find((account) => account.is_active !== false) || null;
  const hasVendorAccount = !!vendorAccount?.id;
  const vendorTier = vendorAccount?.vendor_tier || "free";
  const tierConfig = TIER_CONFIG[vendorTier] || TIER_CONFIG.free;
  const pinUsageStatus = getVendorUsageLimitStatus({ account: vendorAccount, pins: [] });
  const max_pins = pinUsageStatus.allowed.pins;

  const { data: pins = [] } = useQuery({
    queryKey: ["vendorPins", vendorAccount?.id],
    queryFn: () => base44.entities.VendorPin.filter({ vendor_account_id: vendorAccount.id }),
    enabled: hasVendorAccount,
  });

  const { data: allCheckIns = [] } = useQuery({
    queryKey: ["vendorPinCheckIns", vendorAccount?.id],
    queryFn: () => base44.entities.VendorPinCheckIn.filter({ vendor_account_id: vendorAccount.id }, "-created_date"),
    enabled: hasVendorAccount,
  });

  const { data: authorizedUsers = [] } = useQuery({
    queryKey: ["authorizedUsers", vendorAccount?.id],
    // Include accepted users as they also have active dashboard access
    queryFn: () => base44.entities.VendorAuthorizedUser.filter({ vendor_account_id: vendorAccount.id }),
    enabled: hasVendorAccount,
  });

  const activePins = pins.filter((p) => p.is_active === true);
  const livePinUsageStatus = getVendorUsageLimitStatus({ account: vendorAccount, pins });
  const canAddPin = hasVendorAccount && livePinUsageStatus.canAddPin;
  const isOwner = currentUser?.id === vendorAccount?.owner_user_id || currentUser?.email === vendorAccount?.owner_user_id;
  // Only users with active or accepted status can be assigned to pins
  const accessibleAuthorizedUsers = authorizedUsers.filter((u) => u.status === "active" || u.status === "accepted");
  // For the current user's own access check, also look up pending status so that assignments
  // made before the user accepts still grant check-in access
  const nonRemovedAuthorizedUsers = authorizedUsers.filter((u) => u.status !== "removed" && u.status !== "inactive" && u.status !== "denied");
  const currentAuthorizedUser = nonRemovedAuthorizedUsers.find((u) => u.authorized_email?.toLowerCase() === currentUser?.email?.toLowerCase());
  const getAssignedUsers = (pinId) => accessibleAuthorizedUsers.filter((u) => u.assigned_pin_ids?.includes(pinId));
  const canCurrentUserCheckIn = (pinId) => isOwner || (currentAuthorizedUser?.assigned_pin_ids || []).includes(pinId);

  const syncCheckInToPublicMap = async (checkInId) => {
    await base44.functions.invoke("syncPublicMapRecord", { recordType: "vendor_pin_checkin", recordId: checkInId });
  };

  const getPinStatus = (pinId) => {
    const checkIns = allCheckIns.filter((c) => c.vendor_pin_id === pinId);
    if (checkIns.length === 0) return { status: "Offline", lastCheckIn: null };
    const latest = [...checkIns].sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    const endTime = latest.checkin_end_time ? new Date(latest.checkin_end_time) : null;
    if (latest.status === "paused" && endTime && endTime > new Date()) return { status: "Paused", lastCheckIn: latest };
    if (latest.status === "live" && endTime && endTime > new Date()) return { status: "Live Now", lastCheckIn: latest };
    if (latest.status === "live" && endTime && endTime <= new Date()) return { status: "Expired", lastCheckIn: latest };
    return { status: "Offline", lastCheckIn: latest };
  };

  const handlePause = async (checkIn) => {
    await base44.entities.VendorPinCheckIn.update(checkIn.id, { status: "paused" });
    await syncCheckInToPublicMap(checkIn.id);
    queryClient.invalidateQueries({ queryKey: ["vendorPinCheckIns"] });
  };

  const handleResume = async (checkIn) => {
    await base44.entities.VendorPinCheckIn.update(checkIn.id, { status: "live" });
    await syncCheckInToPublicMap(checkIn.id);
    queryClient.invalidateQueries({ queryKey: ["vendorPinCheckIns"] });
  };

  const handleTakeOffline = async (checkIn) => {
    await base44.entities.VendorPinCheckIn.update(checkIn.id, { status: "ended" });
    await syncCheckInToPublicMap(checkIn.id);
    queryClient.invalidateQueries({ queryKey: ["vendorPinCheckIns"] });
  };

  const handleOpenAdd = () => {
    setEditingPin(null);
    setFormData({ pin_name: "", description: "", is_active: true, pin_logo_url: "", pin_icon_style: "default", assigned_users: [] });
    setShowAddForm(true);
  };

  const handleOpenEdit = (pin) => {
    setEditingPin(pin);
    setFormData({
      pin_name: pin.pin_name || "",
      description: pin.description || "",
      is_active: pin.is_active !== false,
      pin_logo_url: pin.pin_logo_url || "",
      pin_icon_style: pin.pin_icon_style || "default",
      assigned_users: accessibleAuthorizedUsers.filter((u) => u.assigned_pin_ids?.includes(pin.id)).map((u) => u.id),
    });
    setShowAddForm(true);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Image must be under 2MB");
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) return toast.error("Only PNG, JPG, or WebP allowed");
    setLogoEditorUrl(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleEditedLogoUpload = async (file) => {
    setLogoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData({ ...formData, pin_logo_url: file_url });
    setLogoUploading(false);
  };

  const syncPinAssignments = async (pinId, selectedUserIds) => {
    await Promise.all(accessibleAuthorizedUsers.map((authorizedUser) => {
      const assignedPins = authorizedUser.assigned_pin_ids || [];
      const shouldAssign = selectedUserIds.includes(authorizedUser.id);
      const nextAssignedPins = shouldAssign
        ? [...new Set([...assignedPins, pinId])]
        : assignedPins.filter((id) => id !== pinId);

      return base44.entities.VendorAuthorizedUser.update(authorizedUser.id, { assigned_pin_ids: nextAssignedPins });
    }));
  };

  const handleSavePin = async () => {
    if (!formData.pin_name.trim()) return toast.error("Truck/pin name is required");
    setSaving(true);
    if (editingPin) {
      await base44.entities.VendorPin.update(editingPin.id, {
        pin_name: formData.pin_name.trim(),
        description: formData.description.trim(),
        is_active: formData.is_active,
        pin_logo_url: formData.pin_logo_url,
        pin_icon_style: formData.pin_icon_style,
        assigned_users: accessibleAuthorizedUsers.filter((u) => formData.assigned_users.includes(u.id)).map((u) => u.authorized_email),
      });
      await syncPinAssignments(editingPin.id, formData.assigned_users);
      toast.success("Truck profile updated!");
    } else {
      if (!canAddPin) {
        setSaving(false);
        return toast.error(`You've reached your limit of ${max_pins} truck pin(s).`);
      }
      const newPin = await base44.entities.VendorPin.create({
        vendor_account_id: vendorAccount.id,
        pin_name: formData.pin_name.trim(),
        description: formData.description.trim(),
        is_active: true,
        pin_logo_url: formData.pin_logo_url,
        pin_icon_style: formData.pin_icon_style,
        assigned_users: accessibleAuthorizedUsers.filter((u) => formData.assigned_users.includes(u.id)).map((u) => u.authorized_email),
      });
      await syncPinAssignments(newPin.id, formData.assigned_users);
      toast.success("Truck profile created!");
    }
    queryClient.invalidateQueries({ queryKey: ["vendorPins"] });
    queryClient.invalidateQueries({ queryKey: ["authorizedUsers"] });
    onRefresh?.();
    setShowAddForm(false);
    setSaving(false);
  };

  const handleDeletePin = async (pinId) => {
    if (!confirm("Delete this truck profile?")) return;
    await base44.entities.VendorPin.update(pinId, { is_active: false });
    queryClient.invalidateQueries({ queryKey: ["vendorPins"] });
    toast.success("Truck profile deleted");
  };

  if (!hasVendorAccount) {
    return <div className="bg-card rounded-2xl border px-5 py-10 text-center">{loadingVendorAccount ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : <p className="text-sm text-muted-foreground">No vendor account found.</p>}</div>;
  }

  return (
    <div className="space-y-3 sm:space-y-5 min-w-0">
      <div className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-3 sm:p-5 shadow-sm min-w-0">
        <div className="min-w-0">
          <h2 className="font-heading font-bold text-base sm:text-lg">My Truck Pins</h2>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">Manage trucks and live map pins.</p>
        </div>
        <Button size="sm" onClick={handleOpenAdd} disabled={!canAddPin} className="shrink-0 gap-1 rounded-full font-heading px-3"><Plus className="w-3.5 h-3.5" /> Add</Button>
      </div>

      {!canAddPin && <div className="bg-destructive/10 rounded-xl p-3 flex gap-2"><AlertCircle className="w-4 h-4 text-destructive shrink-0" /><p className="text-xs text-destructive/80">You've reached your limit of {max_pins} truck pin{max_pins > 1 ? "s" : ""} for {tierConfig.name} tier.</p></div>}

      {activePins.length === 0 ? <div className="bg-card rounded-2xl border px-4 py-6 text-center"><Truck className="w-5 h-5 mx-auto text-muted-foreground mb-2" /><p className="font-heading font-semibold text-sm">No truck pins yet</p></div> : (
        <div className="space-y-3">
          {activePins.map((pin) => {
            const { status, lastCheckIn } = getPinStatus(pin.id);
            const assignedUsers = getAssignedUsers(pin.id);
            return <div key={pin.id} className="bg-card rounded-2xl border shadow-sm p-3 space-y-2.5 min-w-0">
              <div className="flex items-start gap-2.5 min-w-0">
                {pin.pin_logo_url ? <img src={pin.pin_logo_url} alt="Truck logo" className="w-10 h-10 rounded-lg object-cover shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0"><Truck className="w-5 h-5 text-muted-foreground" /></div>}
                <div className="min-w-0 flex-1"><p className="font-heading font-bold text-sm truncate">{pin.pin_name}</p>{pin.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{pin.description}</p>}<p className="mt-1 text-[11px] text-muted-foreground">{status}{lastCheckIn ? ` • ${formatDistanceToNow(new Date(lastCheckIn.created_date), { addSuffix: true })}` : ""}</p></div>
                <div className="flex gap-0.5 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => setSelectedPinHistory(pin)} className="h-8 w-8"><History className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setSchedulingPin(pin)} title="Schedule" className="h-8 w-8"><CalendarClock className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(pin)} className="h-8 w-8"><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDeletePin(pin.id)} className="h-8 w-8"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              {/* Schedule summary pill */}
              {pin.scheduled_date && pin.schedule_status === "scheduled" && (
                <button onClick={() => setSchedulingPin(pin)} className="w-full text-left rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] text-blue-700 flex items-center gap-1.5 hover:bg-blue-100 transition-colors">
                  <CalendarClock className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    Scheduled {pin.scheduled_date}{pin.scheduled_start_time ? ` · ${pin.scheduled_start_time}` : ""}{pin.scheduled_location_label ? ` — ${pin.scheduled_location_label}` : ""}
                  </span>
                </button>
              )}
              <Button size="sm" onClick={() => navigate(`/VendorPinPreview?pinId=${pin.id}&accountId=${vendorAccount.id}`)} disabled={!canCurrentUserCheckIn(pin.id)} className="w-full h-9 rounded-xl gap-1.5 text-xs"><MapPin className="w-3.5 h-3.5" />{canCurrentUserCheckIn(pin.id) ? (status === "Live Now" || status === "Paused" ? "Update Pin" : "Drop Pin") : "Not Assigned"}</Button>
              {(status === "Live Now" || status === "Paused") && <div className="flex gap-1.5">{status === "Live Now" ? <Button size="sm" variant="outline" onClick={() => handlePause(lastCheckIn)} className="h-8 flex-1 rounded-xl text-xs"><PauseCircle className="w-3.5 h-3.5" /> Pause</Button> : <Button size="sm" variant="outline" onClick={() => handleResume(lastCheckIn)} className="h-8 flex-1 rounded-xl text-xs"><PlayCircle className="w-3.5 h-3.5" /> Resume</Button>}<Button size="sm" variant="outline" onClick={() => handleTakeOffline(lastCheckIn)} className="h-8 flex-1 rounded-xl text-xs"><XCircle className="w-3.5 h-3.5" /> Offline</Button></div>}
              {assignedUsers.length > 0 && <p className="text-[11px] text-muted-foreground truncate">Assigned: {assignedUsers.map((u) => u.authorized_email).join(", ")}</p>}
            </div>;
          })}
        </div>
      )}

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}><DialogContent className="rounded-2xl max-w-md"><DialogHeader><DialogTitle>{editingPin ? "Edit Truck Profile" : "Create Truck Profile"}</DialogTitle></DialogHeader><div className="space-y-4"><Input value={formData.pin_name} onChange={(e) => setFormData({ ...formData, pin_name: e.target.value })} placeholder="Truck/Pin name" />{!formData.pin_logo_url && <Input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleLogoUpload} disabled={logoUploading} />}{logoUploading && <p className="text-xs text-muted-foreground">Uploading edited photo...</p>}{formData.pin_logo_url && <div className="relative w-fit"><img src={formData.pin_logo_url} alt="Truck logo preview" className="h-16 w-16 rounded-xl object-contain border bg-white p-1" /><button type="button" onClick={() => setFormData({ ...formData, pin_logo_url: "" })} className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-600 text-white text-xs font-bold shadow-md hover:bg-red-700">×</button></div>}<Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description" /><div className="rounded-2xl border p-3 space-y-2"><p className="text-sm font-semibold">Assigned authorized users</p>{accessibleAuthorizedUsers.length ? accessibleAuthorizedUsers.map((authorizedUser) => <label key={authorizedUser.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.assigned_users.includes(authorizedUser.id)} onChange={(e) => setFormData({ ...formData, assigned_users: e.target.checked ? [...formData.assigned_users, authorizedUser.id] : formData.assigned_users.filter((id) => id !== authorizedUser.id) })} />{authorizedUser.first_name || authorizedUser.last_name ? `${authorizedUser.first_name || ""} ${authorizedUser.last_name || ""}`.trim() : authorizedUser.authorized_email}<span className="text-xs text-muted-foreground">{authorizedUser.authorized_email}</span></label>) : <p className="text-xs text-muted-foreground">Add authorized users before assigning them to this truck.</p>}</div><div className="flex items-center justify-between"><span className="text-sm">Active</span><Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} /></div><Button onClick={handleSavePin} disabled={saving} className="w-full">{saving ? "Saving..." : "Save"}</Button></div></DialogContent></Dialog>
      <TruckLogoEditor imageUrl={logoEditorUrl} open={!!logoEditorUrl} onClose={() => setLogoEditorUrl("")} onApply={handleEditedLogoUpload} />
      {schedulingPin && (
        <VendorPinScheduleDrawer
          open={!!schedulingPin}
          onOpenChange={(open) => !open && setSchedulingPin(null)}
          pin={schedulingPin}
          user={currentUser}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["vendorPins"] })}
        />
      )}
      {selectedPinHistory && <Dialog open onOpenChange={() => setSelectedPinHistory(null)}><DialogContent className="rounded-2xl max-w-md"><DialogHeader><DialogTitle>Check-In History: {selectedPinHistory.pin_name}</DialogTitle></DialogHeader>{allCheckIns.filter((c) => c.vendor_pin_id === selectedPinHistory.id).map((checkIn) => <div key={checkIn.id} className="bg-muted/30 rounded-xl p-3 text-xs"><Clock className="w-4 h-4 inline mr-1" /> {checkIn.status} • {checkIn.checkin_display_address || `${checkIn.checkin_latitude}, ${checkIn.checkin_longitude}`}</div>)}</DialogContent></Dialog>}
    </div>
  );
}