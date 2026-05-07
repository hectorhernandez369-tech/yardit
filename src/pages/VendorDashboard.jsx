import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Truck, Plus, Loader2, Trash2, MapPin, AlertCircle, Edit2, Clock, History, PauseCircle, PlayCircle, XCircle } from "lucide-react";
import PinCheckInFlow from "./PinCheckInFlow";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { getTierLimits, TIER_CONFIG } from "@/lib/tierConfig";

export default function MyTrucksSection({ vendorAccount }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPin, setEditingPin] = useState(null);
  const [selectedPinHistory, setSelectedPinHistory] = useState(null);
  const [checkingInPin, setCheckingInPin] = useState(null);
  const [formData, setFormData] = useState({ pin_name: "", description: "", is_active: true, pin_logo_url: "", assigned_users: [] });
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const queryClient = useQueryClient();

  const tierConfig = TIER_CONFIG[vendorAccount.vendor_tier];
  const { max_pins } = getTierLimits(vendorAccount.vendor_tier, vendorAccount.extra_pins_count || 0);

  // Fetch truck pin profiles
  const { data: pins = [] } = useQuery({
    queryKey: ["vendorPins", vendorAccount.id],
    queryFn: () => base44.entities.VendorPin.filter({ vendor_account_id: vendorAccount.id }),
    enabled: !!vendorAccount?.id,
  });

  // Fetch all check-ins for all pins
  const { data: allCheckIns = [] } = useQuery({
    queryKey: ["vendorPinCheckIns", vendorAccount.id],
    queryFn: () => base44.entities.VendorPinCheckIn.filter({ vendor_account_id: vendorAccount.id }, "-created_date"),
    enabled: !!vendorAccount?.id,
  });

  // Fetch authorized users
  const { data: authorizedUsers = [] } = useQuery({
    queryKey: ["authorizedUsers", vendorAccount.id],
    queryFn: () => base44.entities.VendorAuthorizedUser.filter({ vendor_account_id: vendorAccount.id, status: "active" }),
    enabled: !!vendorAccount?.id,
  });

  const activePins = pins.filter((p) => p.is_active);
  const canAddPin = activePins.length < max_pins;

  // Get assigned users for a pin
  const getAssignedUsers = (pinId) => {
    return authorizedUsers.filter((u) => u.assigned_pin_ids?.includes(pinId));
  };

  // Get current status and last check-in for a pin
  const getPinStatus = (pinId) => {
    const checkIns = allCheckIns.filter((c) => c.vendor_pin_id === pinId);
    if (checkIns.length === 0) return { status: "Offline", lastCheckIn: null };

    const sortedByDate = [...checkIns].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    const latest = sortedByDate[0];
    const now = new Date();
    const endTime = latest.checkin_end_time ? new Date(latest.checkin_end_time) : null;

    if (latest.status === "paused" && endTime && endTime > now) {
      return { status: "Paused", lastCheckIn: latest };
    } else if (latest.status === "live" && endTime && endTime > now) {
      return { status: "Live Now", lastCheckIn: latest };
    } else if (latest.status === "live" && endTime && endTime <= now) {
      base44.entities.VendorPinCheckIn.update(latest.id, { status: "expired" }).then(() => syncCheckInToPublicMap(latest.id));
      return { status: "Expired", lastCheckIn: latest };
    } else if (latest.status === "expired" || latest.status === "ended") {
      return { status: "Offline", lastCheckIn: latest };
    } else {
      return { status: "Offline", lastCheckIn: latest };
    }
  };

  const syncCheckInToPublicMap = async (checkInId) => {
    await base44.functions.invoke("syncPublicMapRecord", {
      recordType: "vendor_pin_checkin",
      recordId: checkInId,
    });
  };

  const handlePause = async (checkIn) => {
    await base44.entities.VendorPinCheckIn.update(checkIn.id, { status: "paused" });
    await syncCheckInToPublicMap(checkIn.id);
    queryClient.invalidateQueries({ queryKey: ["vendorPinCheckIns"] });
    queryClient.invalidateQueries({ queryKey: ["activePinCheckIns"] });
  };

  const handleResume = async (checkIn) => {
    await base44.entities.VendorPinCheckIn.update(checkIn.id, { status: "live" });
    await syncCheckInToPublicMap(checkIn.id);
    queryClient.invalidateQueries({ queryKey: ["vendorPinCheckIns"] });
    queryClient.invalidateQueries({ queryKey: ["activePinCheckIns"] });
  };

  const handleTakeOffline = async (checkIn) => {
    await base44.entities.VendorPinCheckIn.update(checkIn.id, { status: "ended" });
    await syncCheckInToPublicMap(checkIn.id);
    queryClient.invalidateQueries({ queryKey: ["vendorPinCheckIns"] });
    queryClient.invalidateQueries({ queryKey: ["activePinCheckIns"] });
  };

  const handleOpenAdd = () => {
    setEditingPin(null);
    setFormData({ pin_name: "", description: "", is_active: true, pin_logo_url: "" });
    setShowAddForm(true);
  };

  const handleOpenEdit = (pin) => {
    setEditingPin(pin);
    const assignedUserIds = authorizedUsers
      .filter((u) => u.assigned_pin_ids?.includes(pin.id))
      .map((u) => u.id);
    setFormData({
      pin_name: pin.pin_name || "",
      description: pin.description || "",
      is_active: pin.is_active !== false,
      pin_logo_url: pin.pin_logo_url || "",
      assigned_users: assignedUserIds,
    });
    setShowAddForm(true);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      toast.error("Only PNG, JPG, or WebP allowed");
      return;
    }

    setLogoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData({ ...formData, pin_logo_url: file_url });
    setLogoUploading(false);
    toast.success("Logo uploaded");
  };

  const handleSavePin = async () => {
    if (!formData.pin_name.trim()) {
      toast.error("Truck/pin name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingPin) {
        await base44.entities.VendorPin.update(editingPin.id, {
          pin_name: formData.pin_name.trim(),
          description: formData.description.trim(),
          is_active: formData.is_active,
          pin_logo_url: formData.pin_logo_url,
        });

        // Update user assignments
        for (const user of authorizedUsers) {
          const isAssigned = formData.assigned_users.includes(user.id);
          const wasAssigned = user.assigned_pin_ids?.includes(editingPin.id);
          if (isAssigned !== wasAssigned) {
            const updatedPinIds = isAssigned
              ? [...(user.assigned_pin_ids || []), editingPin.id]
              : (user.assigned_pin_ids || []).filter((id) => id !== editingPin.id);
            await base44.entities.VendorAuthorizedUser.update(user.id, {
              assigned_pin_ids: updatedPinIds,
            });
          }
        }

        toast.success("Truck profile updated!");
      } else {
        if (!canAddPin) {
          toast.error(`You've reached your limit of ${max_pins} truck pin(s). Upgrade your plan to add more.`);
          setSaving(false);
          return;
        }

        const newPin = await base44.entities.VendorPin.create({
          vendor_account_id: vendorAccount.id,
          pin_name: formData.pin_name.trim(),
          description: formData.description.trim(),
          is_active: true,
          pin_logo_url: formData.pin_logo_url,
        });

        // Assign users to new pin
        for (const userId of formData.assigned_users) {
          const user = authorizedUsers.find((u) => u.id === userId);
          if (user) {
            await base44.entities.VendorAuthorizedUser.update(user.id, {
              assigned_pin_ids: [...(user.assigned_pin_ids || []), newPin.id],
            });
          }
        }

        toast.success("Truck profile created!");
      }
      queryClient.invalidateQueries({ queryKey: ["vendorPins"] });
      queryClient.invalidateQueries({ queryKey: ["authorizedUsers"] });
      setShowAddForm(false);
    } catch (error) {
      toast.error(error.message || "Error saving truck profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePin = async (pinId) => {
    if (confirm("Delete this truck profile?")) {
      await base44.entities.VendorPin.update(pinId, { is_active: false });
      queryClient.invalidateQueries({ queryKey: ["vendorPins"] });
      toast.success("Truck profile deleted");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-bold text-lg">My Truck Pins</h2>
        <p className="text-sm text-muted-foreground">
          Customize each truck/pin profile. Locations are set when the truck checks in.
        </p>
      </div>

      {!canAddPin && (
        <div className="bg-destructive/10 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-heading font-semibold text-destructive mb-1">Truck Limit Reached</p>
            <p className="text-xs text-destructive/80">
              You've reached your limit of {max_pins} truck pin{max_pins > 1 ? "s" : ""} for {tierConfig.name} tier.
              {vendorAccount.vendor_tier !== "growth" && " Add extra trucks at +$10/month each."}
            </p>
          </div>
        </div>
      )}

      <Button onClick={handleOpenAdd} disabled={!canAddPin} className="w-full gap-2 rounded-xl font-heading">
        <Plus className="w-4 h-4" />
        Add Truck Pin
      </Button>

      {activePins.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 px-5 py-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Truck className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-heading font-semibold text-sm">No truck pins yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first truck profile to manage check-ins.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activePins.map((pin) => {
            const { status, lastCheckIn } = getPinStatus(pin.id);
            const assignedUsers = getAssignedUsers(pin.id);
            const statusColor = status === "Live Now" ? "text-green-600" : status === "Paused" ? "text-amber-500" : status === "Expired" ? "text-destructive" : "text-muted-foreground";

            return (
              <div key={pin.id} className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                <div className="p-4 space-y-3">
                  {/* Header with logo and name */}
                  <div className="flex items-start gap-3">
                    {pin.pin_logo_url ? (
                      <img
                        src={pin.pin_logo_url}
                        alt="Truck logo"
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Truck className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-bold text-sm">{pin.pin_name}</p>
                      {pin.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pin.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Status and actions row */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${status === "Live Now" ? "bg-green-600" : status === "Paused" ? "bg-amber-500" : "bg-muted"}`} />
                      <span className={`text-xs font-heading font-semibold ${statusColor}`}>{status}</span>
                      {lastCheckIn && (
                        <span className="text-xs text-muted-foreground ml-2">
                          • {formatDistanceToNow(new Date(lastCheckIn.created_date), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelectedPinHistory(pin)}
                        className="rounded-lg text-muted-foreground hover:bg-muted/50 h-8 w-8"
                        title="View check-in history"
                      >
                        <History className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEdit(pin)}
                        className="rounded-lg text-primary hover:bg-primary/10 h-8 w-8"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeletePin(pin.id)}
                        className="rounded-lg text-destructive hover:bg-destructive/10 h-8 w-8"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Drop Pin button */}
                  <Button
                    onClick={() => setCheckingInPin(pin)}
                    className={`w-full rounded-xl font-heading text-xs h-9 gap-1.5 ${
                      status === "Live Now" || status === "Paused"
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {status === "Live Now" || status === "Paused" ? "Update Pin Location" : "Drop Your Pin"}
                  </Button>

                  {/* Pause / Resume / Take Offline buttons */}
                  {(status === "Live Now" || status === "Paused") && (
                    <div className="flex gap-2">
                      {status === "Live Now" ? (
                        <Button
                          variant="outline"
                          onClick={() => handlePause(lastCheckIn)}
                          className="flex-1 rounded-xl font-heading text-xs h-9 gap-1.5 border-amber-400 text-amber-600 hover:bg-amber-50"
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                          Pause
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => handleResume(lastCheckIn)}
                          className="flex-1 rounded-xl font-heading text-xs h-9 gap-1.5 border-green-500 text-green-600 hover:bg-green-50"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          Resume
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => handleTakeOffline(lastCheckIn)}
                        className="flex-1 rounded-xl font-heading text-xs h-9 gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Take Offline
                      </Button>
                    </div>
                  )}

                  {/* Assigned users */}
                  {assignedUsers.length > 0 && (
                    <div className="text-xs space-y-1 pt-2 border-t">
                      <p className="text-muted-foreground font-heading">Assigned Users</p>
                      {assignedUsers.map((user) => (
                        <div key={user.id} className="flex items-center gap-1.5 text-muted-foreground">
                          <div className="w-1 h-1 rounded-full bg-primary" />
                          {user.authorized_email}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Truck Profile Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingPin ? "Edit Truck Profile" : "Create Truck Profile"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-heading text-muted-foreground mb-2 block">Truck/Pin Name *</label>
              <Input
                value={formData.pin_name}
                onChange={(e) => setFormData({ ...formData, pin_name: e.target.value })}
                placeholder="e.g. Truck 1, Taco Truck"
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-heading text-muted-foreground mb-2 block">Logo/Icon</label>
              <div className="flex items-center gap-3">
                {formData.pin_logo_url && (
                  <img
                    src={formData.pin_logo_url}
                    alt="Logo"
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                  className="rounded-xl flex-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-heading text-muted-foreground mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Short description of this truck/pin"
                className="rounded-xl resize-none min-h-[80px]"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
              <span className="text-sm font-heading">Active</span>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div>
              <label className="text-xs font-heading text-muted-foreground mb-2 block">Assign Authorized Users</label>
              <p className="text-xs text-muted-foreground mb-2">Select users who can check in this truck (leave empty to allow any authorized user)</p>
              <div className="space-y-2 max-h-[180px] overflow-y-auto border border-border/50 rounded-xl p-2">
                {authorizedUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No authorized users yet</p>
                ) : (
                  authorizedUsers.map((user) => (
                    <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-muted/30 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.assigned_users.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              assigned_users: [...formData.assigned_users, user.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              assigned_users: formData.assigned_users.filter((id) => id !== user.id),
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-xs">{user.authorized_email}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <Button onClick={handleSavePin} disabled={saving} className="w-full rounded-xl font-heading">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : editingPin ? (
                "Update Profile"
              ) : (
                "Create Profile"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pin Check-In Flow */}
      {checkingInPin && (
        <PinCheckInFlow
          pin={checkingInPin}
          vendorAccount={vendorAccount}
          existingCheckIn={(() => {
            const { status, lastCheckIn } = getPinStatus(checkingInPin.id);
            return status === "Live Now" ? lastCheckIn : null;
          })()}
          onClose={() => setCheckingInPin(null)}
          onSuccess={() => {
            setCheckingInPin(null);
            queryClient.invalidateQueries({ queryKey: ["vendorPinCheckIns"] });
          }}
        />
      )}

      {/* Check-In History Dialog */}
      {selectedPinHistory && (
        <Dialog open={!!selectedPinHistory} onOpenChange={() => setSelectedPinHistory(null)}>
          <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">
                Check-In History: {selectedPinHistory.pin_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {allCheckIns.filter((c) => c.vendor_pin_id === selectedPinHistory.id).length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No check-ins yet</p>
                </div>
              ) : (
                allCheckIns
                  .filter((c) => c.vendor_pin_id === selectedPinHistory.id)
                  .map((checkIn) => (
                    <div key={checkIn.id} className="bg-muted/30 rounded-xl p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Checked in by</span>
                        <span className="font-medium">{checkIn.checked_in_by_email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className={`font-medium ${checkIn.status === "live" ? "text-green-600" : "text-muted-foreground"}`}>
                          {checkIn.status}
                        </span>
                      </div>
                      {checkIn.checkin_display_address && (
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-muted-foreground">Location</span>
                          <span className="font-medium text-right">{checkIn.checkin_display_address}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-muted-foreground">Started</span>
                        <span className="font-medium">{new Date(checkIn.checkin_start_time).toLocaleString()}</span>
                      </div>
                      {checkIn.checkin_end_time && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Ended</span>
                          <span className="font-medium">{new Date(checkIn.checkin_end_time).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}