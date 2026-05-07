import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Truck, Plus, Loader2, Trash2, MapPin, AlertCircle, Edit2, Clock, History, PauseCircle, PlayCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { getTierLimits, TIER_CONFIG } from "@/lib/tierConfig";

export default function MyTrucksSection({ vendorAccount: providedVendorAccount, currentUser: providedCurrentUser }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPin, setEditingPin] = useState(null);
  const [selectedPinHistory, setSelectedPinHistory] = useState(null);
  const [formData, setFormData] = useState({ pin_name: "", description: "", is_active: true, pin_logo_url: "", pin_icon_style: "default", assigned_users: [] });
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
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
  const vendorTier = vendorAccount?.vendor_tier || "starter";
  const tierConfig = TIER_CONFIG[vendorTier] || TIER_CONFIG.starter;
  const { max_pins } = getTierLimits(vendorTier, vendorAccount?.extra_pins_count || 0);

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
    queryFn: () => base44.entities.VendorAuthorizedUser.filter({ vendor_account_id: vendorAccount.id, status: "active" }),
    enabled: hasVendorAccount,
  });

  const activePins = pins.filter((p) => p.is_active);
  const canAddPin = hasVendorAccount && activePins.length < max_pins;
  const isOwner = currentUser?.id === vendorAccount?.owner_user_id || currentUser?.email === vendorAccount?.owner_user_id;
  const currentAuthorizedUser = authorizedUsers.find((u) => u.authorized_email?.toLowerCase() === currentUser?.email?.toLowerCase());
  const getAssignedUsers = (pinId) => authorizedUsers.filter((u) => u.assigned_pin_ids?.includes(pinId));
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
      assigned_users: authorizedUsers.filter((u) => u.assigned_pin_ids?.includes(pin.id)).map((u) => u.id),
    });
    setShowAddForm(true);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Image must be under 2MB");
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) return toast.error("Only PNG, JPG, or WebP allowed");
    setLogoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData({ ...formData, pin_logo_url: file_url });
    setLogoUploading(false);
  };

  const syncPinAssignments = async (pinId, selectedUserIds) => {
    await Promise.all(authorizedUsers.map((authorizedUser) => {
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
        assigned_users: authorizedUsers.filter((u) => formData.assigned_users.includes(u.id)).map((u) => u.authorized_email),
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
        assigned_users: authorizedUsers.filter((u) => formData.assigned_users.includes(u.id)).map((u) => u.authorized_email),
      });
      await syncPinAssignments(newPin.id, formData.assigned_users);
      toast.success("Truck profile created!");
    }
    queryClient.invalidateQueries({ queryKey: ["vendorPins"] });
    queryClient.invalidateQueries({ queryKey: ["authorizedUsers"] });
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
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-bold text-lg">My Truck Pins</h2>
        <p className="text-sm text-muted-foreground">Customize each truck/pin profile. Locations are set when the truck checks in.</p>
      </div>

      {!canAddPin && <div className="bg-destructive/10 rounded-2xl p-4 flex gap-3"><AlertCircle className="w-5 h-5 text-destructive" /><p className="text-xs text-destructive/80">You've reached your limit of {max_pins} truck pin{max_pins > 1 ? "s" : ""} for {tierConfig.name} tier.</p></div>}
      <Button onClick={handleOpenAdd} disabled={!canAddPin} className="w-full gap-2 rounded-xl font-heading"><Plus className="w-4 h-4" /> Add Truck Pin</Button>

      {activePins.length === 0 ? <div className="bg-card rounded-2xl border px-5 py-10 text-center"><Truck className="w-6 h-6 mx-auto text-muted-foreground mb-2" /><p className="font-heading font-semibold text-sm">No truck pins yet</p></div> : (
        <div className="space-y-3">
          {activePins.map((pin) => {
            const { status, lastCheckIn } = getPinStatus(pin.id);
            const assignedUsers = getAssignedUsers(pin.id);
            return <div key={pin.id} className="bg-card rounded-2xl border shadow-sm p-4 space-y-3">
              <div className="flex items-start gap-3">
                {pin.pin_logo_url ? <img src={pin.pin_logo_url} alt="Truck logo" className="w-12 h-12 rounded-lg object-cover" /> : <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center"><Truck className="w-6 h-6 text-muted-foreground" /></div>}
                <div className="flex-1"><p className="font-heading font-bold text-sm">{pin.pin_name}</p>{pin.description && <p className="text-xs text-muted-foreground mt-1">{pin.description}</p>}</div>
                <Button size="icon" variant="ghost" onClick={() => setSelectedPinHistory(pin)}><History className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(pin)}><Edit2 className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => handleDeletePin(pin.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
              <Button onClick={() => navigate(`/VendorPinPreview?pinId=${pin.id}&accountId=${vendorAccount.id}`)} disabled={!canCurrentUserCheckIn(pin.id)} className="w-full rounded-xl gap-2"><MapPin className="w-4 h-4" />{canCurrentUserCheckIn(pin.id) ? (status === "Live Now" || status === "Paused" ? "Update Pin Location" : "Drop Your Pin") : "Not Assigned To You"}</Button>
              {(status === "Live Now" || status === "Paused") && <div className="flex gap-2">{status === "Live Now" ? <Button variant="outline" onClick={() => handlePause(lastCheckIn)} className="flex-1"><PauseCircle className="w-4 h-4" /> Pause</Button> : <Button variant="outline" onClick={() => handleResume(lastCheckIn)} className="flex-1"><PlayCircle className="w-4 h-4" /> Resume</Button>}<Button variant="outline" onClick={() => handleTakeOffline(lastCheckIn)} className="flex-1"><XCircle className="w-4 h-4" /> Offline</Button></div>}
              <p className="text-xs text-muted-foreground">Status: {status}{lastCheckIn ? ` • ${formatDistanceToNow(new Date(lastCheckIn.created_date), { addSuffix: true })}` : ""}</p>
              {assignedUsers.length > 0 && <p className="text-xs text-muted-foreground">Assigned: {assignedUsers.map((u) => u.authorized_email).join(", ")}</p>}
            </div>;
          })}
        </div>
      )}

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}><DialogContent className="rounded-2xl max-w-md"><DialogHeader><DialogTitle>{editingPin ? "Edit Truck Profile" : "Create Truck Profile"}</DialogTitle></DialogHeader><div className="space-y-4"><Input value={formData.pin_name} onChange={(e) => setFormData({ ...formData, pin_name: e.target.value })} placeholder="Truck/Pin name" /><Input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleLogoUpload} disabled={logoUploading} />{formData.pin_logo_url && <div className="rounded-2xl border p-3 space-y-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Use truck logo as map icon</p><p className="text-xs text-muted-foreground">No background will be added when enabled.</p></div><Switch checked={formData.pin_icon_style === "truck_logo"} onCheckedChange={(checked) => setFormData({ ...formData, pin_icon_style: checked ? "truck_logo" : "default" })} /></div><div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">Preview:</span>{formData.pin_icon_style === "truck_logo" ? <img src={formData.pin_logo_url} alt="Truck icon preview" className="h-12 w-12 object-contain drop-shadow-md" /> : <div className="h-12 w-12 rounded-full bg-[#F4A849] border-2 border-[#2C4F4E] flex items-center justify-center">🚚</div>}</div></div>}<Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description" /><div className="rounded-2xl border p-3 space-y-2"><p className="text-sm font-semibold">Assigned authorized users</p>{authorizedUsers.length ? authorizedUsers.map((authorizedUser) => <label key={authorizedUser.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.assigned_users.includes(authorizedUser.id)} onChange={(e) => setFormData({ ...formData, assigned_users: e.target.checked ? [...formData.assigned_users, authorizedUser.id] : formData.assigned_users.filter((id) => id !== authorizedUser.id) })} />{authorizedUser.first_name || authorizedUser.last_name ? `${authorizedUser.first_name || ""} ${authorizedUser.last_name || ""}`.trim() : authorizedUser.authorized_email}<span className="text-xs text-muted-foreground">{authorizedUser.authorized_email}</span></label>) : <p className="text-xs text-muted-foreground">Add authorized users before assigning them to this truck.</p>}</div><div className="flex items-center justify-between"><span className="text-sm">Active</span><Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} /></div><Button onClick={handleSavePin} disabled={saving} className="w-full">{saving ? "Saving..." : "Save"}</Button></div></DialogContent></Dialog>
      {selectedPinHistory && <Dialog open onOpenChange={() => setSelectedPinHistory(null)}><DialogContent className="rounded-2xl max-w-md"><DialogHeader><DialogTitle>Check-In History: {selectedPinHistory.pin_name}</DialogTitle></DialogHeader>{allCheckIns.filter((c) => c.vendor_pin_id === selectedPinHistory.id).map((checkIn) => <div key={checkIn.id} className="bg-muted/30 rounded-xl p-3 text-xs"><Clock className="w-4 h-4 inline mr-1" /> {checkIn.status} • {checkIn.checkin_display_address || `${checkIn.checkin_latitude}, ${checkIn.checkin_longitude}`}</div>)}</DialogContent></Dialog>}
    </div>
  );
}