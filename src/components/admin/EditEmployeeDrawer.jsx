import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EditEmployeeDrawer({ open, onClose, admin, currentUserProfile, onSaved }) {
  const [form, setForm] = useState({});
  const [supervisors, setSupervisors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [pinForm, setPinForm] = useState({ new_pin: "", confirm_pin: "" });
  const [savingPin, setSavingPin] = useState(false);

  const isSelf = admin && currentUserProfile && (admin.id === currentUserProfile.id);
  const isMaster = currentUserProfile?.role_label === "master";

  useEffect(() => {
    if (!open || !admin) return;
    setForm({
      first_name: admin.first_name || "",
      last_name: admin.last_name || "",
      phone: admin.phone || "",
      address: admin.address || "",
      role_label: admin.role_label || "basic",
      is_active: admin.is_active !== false,
      supervisor_user_id: admin.supervisor_user_id || "",
      supervisor_employee_id: admin.supervisor_employee_id || "",
    });
    // Load supervisors for assignment
    base44.entities.AdminProfile.filter({ role_label: "supervisor" }).then(sups => {
      const masters = [];
      base44.entities.AdminProfile.filter({ role_label: "master" }).then(m => {
        setSupervisors([...sups, ...m]);
      });
    });
  }, [open, admin]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSetPin = async () => {
    if (!pinForm.new_pin || !pinForm.confirm_pin) {
      toast.error("Please fill both PIN fields.");
      return;
    }
    if (pinForm.new_pin !== pinForm.confirm_pin) {
      toast.error("New PINs do not match.");
      return;
    }
    if (pinForm.new_pin.length < 4) {
      toast.error("New PIN must be at least 4 digits.");
      return;
    }
    setSavingPin(true);
    try {
      const response = await base44.functions.invoke("adminSetUserPin", {
        target_employee_id: admin.employee_id,
        new_pin: pinForm.new_pin,
        current_admin_employee_id: currentUserProfile?.employee_id || ""
      });
      if (response.data.ok) {
        toast.success("PIN updated successfully.");
        setPinForm({ new_pin: "", confirm_pin: "" });
      } else {
        toast.error(`Failed to update PIN: ${response.data.reason || "Unknown error"}`);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.reason || error.message || "Unknown error";
      toast.error(`Error updating PIN: ${errorMsg}`);
    } finally {
      setSavingPin(false);
    }
  };

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("First and last name are required.");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Phone is required.");
      return;
    }

    setSaving(true);

    // Build update payload, respecting self-edit restrictions
    const update = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
    };

    if (!isSelf) {
      update.role_label = form.role_label;
      update.is_active = form.is_active;
    }

    // Supervisor assignment (only relevant for basic role)
    if (update.role_label === "basic" || (!isSelf && form.role_label === "basic")) {
      update.supervisor_user_id = form.supervisor_user_id || "";
      update.supervisor_employee_id = form.supervisor_employee_id || "";
    } else if (!isSelf) {
      // Clearing supervisor if no longer basic
      update.supervisor_user_id = "";
      update.supervisor_employee_id = "";
    }

    // Build before/after for audit
    const before = {};
    const after = {};
    const fields = ["first_name", "last_name", "phone", "address", "role_label", "is_active", "supervisor_user_id", "supervisor_employee_id"];
    fields.forEach(f => {
      const oldVal = admin[f] ?? "";
      const newVal = update[f] ?? admin[f] ?? "";
      if (String(oldVal) !== String(newVal)) {
        before[f] = oldVal;
        after[f] = newVal;
      }
    });

    if (Object.keys(before).length === 0) {
      toast.info("No changes to save.");
      setSaving(false);
      return;
    }

    await base44.entities.AdminProfile.update(admin.id, update);

    // Audit log
    await base44.entities.AdminAuditLog.create({
      user_id: currentUserProfile?.user_id || "",
      admin_employee_id: currentUserProfile?.employee_id || "",
      action_type: "admin_employee_edit",
      target_type: "admin",
      target_id: admin.employee_id,
      success: true,
      metadata: JSON.stringify({ before, after, edited_admin_id: admin.id }),
    });

    toast.success(`${form.first_name} ${form.last_name} updated.`);
    setSaving(false);
    onSaved();
    onClose();
  };

  if (!admin) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">
            Edit Employee: {admin.first_name} {admin.last_name}
            <span className="text-xs font-mono text-gray-500 ml-2">({admin.employee_id})</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">First Name *</Label>
              <Input value={form.first_name || ""} onChange={e => set("first_name", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Last Name *</Label>
              <Input value={form.last_name || ""} onChange={e => set("last_name", e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Phone *</Label>
            <Input value={form.phone || ""} onChange={e => set("phone", e.target.value)} />
          </div>

          <div>
            <Label className="text-xs">Address</Label>
            <Input value={form.address || ""} onChange={e => set("address", e.target.value)} />
          </div>

          {/* Role - disabled for self */}
          <div>
            <Label className="text-xs">Role{isSelf && <span className="text-gray-400 ml-1">(cannot change own role)</span>}</Label>
            <Select value={form.role_label || "basic"} onValueChange={v => set("role_label", v)} disabled={isSelf}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="master">Master</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Supervisor assignment - only for basic */}
          {form.role_label === "basic" && (
            <div>
              <Label className="text-xs">Assigned Supervisor</Label>
              <Select
                value={form.supervisor_user_id || "none"}
                onValueChange={v => {
                  if (v === "none") {
                    set("supervisor_user_id", "");
                    set("supervisor_employee_id", "");
                  } else {
                    const sup = supervisors.find(s => s.user_id === v);
                    set("supervisor_user_id", v);
                    set("supervisor_employee_id", sup?.employee_id || "");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supervisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {supervisors.map(s => (
                    <SelectItem key={s.user_id || s.id} value={s.user_id || s.id}>
                      {s.first_name} {s.last_name} ({s.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Active toggle - disabled for self */}
          <div className="flex items-center justify-between py-2">
            <Label className="text-xs">Active{isSelf && <span className="text-gray-400 ml-1">(cannot change own status)</span>}</Label>
            <Switch checked={form.is_active ?? true} onCheckedChange={v => set("is_active", v)} disabled={isSelf} />
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="flex-1 bg-[#5DADA5] hover:bg-[#4A9B93]" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </div>

          {isMaster && (
            <div className="mt-8 pt-4 border-t border-red-100">
              <h4 className="text-sm font-semibold text-red-800 mb-3">Master Override: Set New PIN</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-red-700">New PIN</Label>
                    <Input type="password" value={pinForm.new_pin} onChange={e => setPinForm(p => ({...p, new_pin: e.target.value}))} />
                  </div>
                  <div>
                    <Label className="text-xs text-red-700">Confirm New PIN</Label>
                    <Input type="password" value={pinForm.confirm_pin} onChange={e => setPinForm(p => ({...p, confirm_pin: e.target.value}))} />
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full text-red-700 border-red-200 hover:bg-red-50"
                  onClick={handleSetPin}
                  disabled={savingPin}
                >
                  {savingPin ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Set New PIN
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}