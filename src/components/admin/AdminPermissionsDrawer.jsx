import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { AVAILABLE_ADMIN_CAPABILITIES } from "./adminCapabilities";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminPermissionsDrawer({ open, onClose, admin, currentUserProfile, onSaved }) {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const isMaster = currentUserProfile?.role_label === "master";

  useEffect(() => {
    if (!open || !admin) return;
    setSelected(Array.isArray(admin.capabilities) ? admin.capabilities : []);
  }, [open, admin]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggleCapability = (capability) => {
    setSelected((prev) => prev.includes(capability)
      ? prev.filter((item) => item !== capability)
      : [...prev, capability]
    );
  };

  const handleSave = async () => {
    if (!isMaster) {
      toast.error("Only Master Admins can edit permissions.");
      return;
    }

    const before = Array.isArray(admin.capabilities) ? admin.capabilities : [];
    const added = selected.filter((capability) => !before.includes(capability));
    const removed = before.filter((capability) => !selected.includes(capability));

    if (added.length === 0 && removed.length === 0) {
      toast.info("No permission changes to save.");
      return;
    }

    setSaving(true);
    await base44.entities.AdminProfile.update(admin.id, { capabilities: selected });
    await base44.entities.AdminAuditLog.create({
      user_id: currentUserProfile?.user_id || "",
      admin_employee_id: currentUserProfile?.employee_id || "",
      action_type: "admin_permissions_updated",
      target_type: "admin",
      target_id: admin.employee_id,
      success: true,
      metadata: JSON.stringify({
        edited_admin_profile_id: admin.id,
        edited_employee_id: admin.employee_id,
        edited_employee_name: `${admin.first_name || ""} ${admin.last_name || ""}`.trim(),
        before,
        after: selected,
        added,
        removed,
      }),
    });

    toast.success("Permissions updated.");
    setSaving(false);
    onSaved?.();
    onClose();
  };

  if (!admin) return null;

  return (
    <Sheet open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Permissions</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="rounded-xl border bg-slate-50 p-4 space-y-2 text-sm">
            <div className="font-semibold text-slate-900">{admin.first_name} {admin.last_name}</div>
            <div className="text-slate-600">Employee ID: <span className="font-mono">{admin.employee_id}</span></div>
            <div className="flex items-center gap-2 text-slate-600">
              Current role: <Badge variant="outline" className="capitalize">{admin.role_label}</Badge>
            </div>
          </div>

          {!isMaster && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Only Master Admins can edit permissions.
            </div>
          )}

          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-slate-900">Available Capabilities</h3>
              <p className="text-xs text-slate-500">Checked permissions are currently assigned to this employee.</p>
            </div>

            <div className="grid gap-2">
              {AVAILABLE_ADMIN_CAPABILITIES.map((capability) => (
                <label key={capability.key} className="flex items-start gap-3 rounded-xl border bg-white p-3">
                  <Checkbox
                    checked={selectedSet.has(capability.key)}
                    disabled={!isMaster || saving}
                    onCheckedChange={() => toggleCapability(capability.key)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{capability.label}</span>
                    <span className="block text-xs text-slate-500">{capability.description}</span>
                    <span className="block text-[11px] font-mono text-slate-400 mt-1">{capability.key}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2 border-t pt-4">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="flex-1 bg-[#5DADA5] hover:bg-[#4A9B93]" onClick={handleSave} disabled={!isMaster || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}