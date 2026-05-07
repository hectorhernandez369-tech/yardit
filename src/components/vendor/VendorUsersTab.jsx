import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getVendorUserLimit } from "@/lib/vendorTiers";
import { hashVendorPasscode } from "@/lib/vendorPasscode";
import { toast } from "sonner";

export default function VendorUsersTab({ account, users, user, pins = [], isOwner, onRefresh }) {
  const [form, setForm] = useState({ authorized_email: "", first_name: "", last_name: "", phone: "" });
  const [passcode, setPasscode] = useState("");
  const [savingPasscode, setSavingPasscode] = useState(false);
  const canAddUser = isOwner && users.length < getVendorUserLimit(account);

  const addUser = async () => {
    if (!form.authorized_email.trim()) return;
    if (!canAddUser) {
      toast.error("You reached your user limit. Upgrade or add extra users.");
      return;
    }
    await base44.entities.VendorAuthorizedUser.create({ ...form, authorized_email: form.authorized_email.trim().toLowerCase(), vendor_account_id: account.id, assigned_pin_ids: [], status: "active", added_by_owner_user_id: user?.id });
    setForm({ authorized_email: "", first_name: "", last_name: "", phone: "" });
    toast.success("User added");
    onRefresh();
  };

  const removeUser = async (item) => {
    await base44.entities.VendorAuthorizedUser.update(item.id, { ...item, status: "removed" });
    onRefresh();
  };

  const toggleAssignedPin = async (item, pinId) => {
    const assigned = item.assigned_pin_ids || [];
    const nextAssigned = assigned.includes(pinId) ? assigned.filter((id) => id !== pinId) : [...assigned, pinId];
    await base44.entities.VendorAuthorizedUser.update(item.id, { assigned_pin_ids: nextAssigned });
    onRefresh();
  };

  const savePasscode = async () => {
    if (!isOwner) return toast.error("Only the business owner can change the passcode.");
    if (passcode.trim().length < 4) return toast.error("Use at least 4 characters for the passcode.");
    setSavingPasscode(true);
    const vendor_dashboard_passcode_hash = await hashVendorPasscode(passcode.trim());
    await base44.entities.VendorAccount.update(account.id, {
      vendor_dashboard_passcode_hash,
      passcode_updated_at: new Date().toISOString(),
      passcode_updated_by: user?.id,
    });
    setPasscode("");
    setSavingPasscode(false);
    toast.success("Vendor passcode updated");
    onRefresh();
  };

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
      <div className="space-y-4 min-w-0">
        <Card className="overflow-hidden bg-white shadow-sm"><CardHeader className="p-4 sm:p-6"><CardTitle>Vendor Portal Passcode</CardTitle></CardHeader><CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
          <p className="text-sm text-slate-600">Authorized users must enter this shared passcode before accessing the Vendor Dashboard. The current passcode is never shown.</p>
          <Input type="password" placeholder={account.vendor_dashboard_passcode_hash ? "New passcode" : "Create passcode"} value={passcode} onChange={(e) => setPasscode(e.target.value)} disabled={!isOwner} />
          <Button onClick={savePasscode} disabled={!isOwner || savingPasscode} className="w-full bg-[#5DADA5] hover:bg-[#4A9B93]">{savingPasscode ? "Saving..." : account.vendor_dashboard_passcode_hash ? "Reset Passcode" : "Create Passcode"}</Button>
          {!isOwner && <p className="text-xs text-muted-foreground">Only the business owner can change this passcode.</p>}
        </CardContent></Card>

        <Card className="overflow-hidden bg-white shadow-sm"><CardHeader className="p-4 sm:p-6"><CardTitle>Add Authorized User</CardTitle></CardHeader><CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
          <p className="text-sm text-slate-600">Employees must create their own Yardit account first. This only grants access to this business portal.</p>
          <Input placeholder="Email" value={form.authorized_email} onChange={(e) => setForm({ ...form, authorized_email: e.target.value })} disabled={!isOwner} />
          <Input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} disabled={!isOwner} />
          <Input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} disabled={!isOwner} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!isOwner} />
          <Button onClick={addUser} disabled={!canAddUser} className="w-full bg-[#5DADA5] hover:bg-[#4A9B93]">Add User</Button>
          {!isOwner && <p className="text-sm text-muted-foreground">Only the business owner can add users.</p>}
          {isOwner && !canAddUser && <p className="text-sm text-amber-700">User limit reached for your tier.</p>}
        </CardContent></Card>
      </div>
      <div className="grid min-w-0 gap-3">
        {users.map((item) => <Card key={item.id} className="overflow-hidden bg-white shadow-sm"><CardContent className="p-4 space-y-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-semibold break-words">{item.first_name} {item.last_name}</p><p className="text-sm text-slate-600 break-all">{item.authorized_email}</p></div><div className="flex flex-wrap items-center gap-2"><Badge>{item.status}</Badge><Button variant="outline" size="sm" disabled={!isOwner} onClick={() => removeUser(item)}>Remove</Button></div></div>{pins.length > 0 && <div className="border-t pt-3"><p className="mb-2 text-xs font-semibold text-slate-500 uppercase">Assigned trucks</p><div className="flex flex-wrap gap-2">{pins.filter((pin) => pin.is_active !== false).map((pin) => <label key={pin.id} className="flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs"><input type="checkbox" disabled={!isOwner} checked={(item.assigned_pin_ids || []).includes(pin.id)} onChange={() => toggleAssignedPin(item, pin.id)} /><span className="break-words">{pin.pin_name}</span></label>)}</div></div>}</CardContent></Card>)}
      </div>
    </div>
  );
}