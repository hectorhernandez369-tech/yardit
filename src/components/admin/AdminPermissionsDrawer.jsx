import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ADMIN_CAPABILITY_SECTIONS, AVAILABLE_ADMIN_CAPABILITIES, ROLE_DEFAULT_CAPABILITIES } from "./adminCapabilities";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminPermissionsDrawer({ open, onClose, admin, currentUserProfile, onSaved }) {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const isMaster = currentUserProfile?.role_label === "master";

  useEffect(() => {
    if (!open || !admin) return;
    setSelected(Array.isArray(admin.capabilities) ? admin.capabilities : []);
  }, [open, admin]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allKeys = useMemo(() => AVAILABLE_ADMIN_CAPABILITIES.map((permission) => permission.key), []);
  const filteredSections = useMemo(() => {
    const text = search.trim().toLowerCase();
    return ADMIN_CAPABILITY_SECTIONS
      .filter((section) => sectionFilter === "all" || section.title === sectionFilter)
      .map((section) => ({
        ...section,
        permissions: section.permissions.filter((permission) => !text || [permission.label, permission.description, permission.key].join(" ").toLowerCase().includes(text)),
      }))
      .filter((section) => section.permissions.length > 0);
  }, [search, sectionFilter]);

  const toggleCapability = (capability) => {
    setSelected((prev) => prev.includes(capability)
      ? prev.filter((item) => item !== capability)
      : [...prev, capability]
    );
  };

  const selectAll = () => setSelected(allKeys);
  const clearAll = () => setSelected([]);
  const applyRoleDefaults = () => setSelected(ROLE_DEFAULT_CAPABILITIES[admin?.role_label || "basic"] || []);

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

            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Search permissions" value={search} onChange={(event) => setSearch(event.target.value)} />
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger><SelectValue placeholder="Filter by section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {ADMIN_CAPABILITY_SECTIONS.map((section) => <SelectItem key={section.title} value={section.title}>{section.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={selectAll} disabled={!isMaster || saving}>Select All</Button>
              <Button type="button" size="sm" variant="outline" onClick={clearAll} disabled={!isMaster || saving}>Clear All</Button>
              <Button type="button" size="sm" variant="outline" onClick={applyRoleDefaults} disabled={!isMaster || saving}>Apply Role Defaults</Button>
            </div>

            <div className="space-y-4">
              {filteredSections.map((section) => (
                <div key={section.title} className="rounded-2xl border bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-black tracking-wide text-slate-700">{section.title}</h4>
                    <Badge variant="outline">{section.permissions.filter((permission) => selectedSet.has(permission.key)).length}/{section.permissions.length}</Badge>
                  </div>
                  <div className="grid gap-2">
                    {section.permissions.map((capability) => (
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
              ))}
              {filteredSections.length === 0 && <p className="rounded-xl border bg-white p-4 text-sm text-slate-500">No permissions match your search.</p>}
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