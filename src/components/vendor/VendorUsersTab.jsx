import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getVendorUsageLimitStatus } from "@/lib/vendorUsage";
import { getVendorAccountCapabilities } from "@/lib/getVendorAccountCapabilities";
import { hashVendorPasscode } from "@/lib/vendorPasscode";
import TransferOwnershipCard from "./TransferOwnershipCard";
import { toast } from "sonner";

export default function VendorUsersTab({ account, users, user, pins = [], isOwner, onRefresh }) {
  const [form, setForm] = useState({ authorized_email: "", first_name: "", last_name: "", phone: "" });
  const [passcode, setPasscode] = useState("");
  const [savingPasscode, setSavingPasscode] = useState(false);
  // Capabilities always come from the selected business account — never from a user-level tier.
  const caps = getVendorAccountCapabilities(account);
  const activeUserCount = users.filter((u) => u.status === "active" || u.status === "accepted").length;
  const canTransferOwnership = isOwner || ["master", "super_master"].includes(user?.role);
  const canAddUser = isOwner && activeUserCount < caps.maxUsers;

  const addUser = async () => {
    if (!form.authorized_email.trim()) return;
    if (!canAddUser) {
      toast.error("You reached your user limit. Upgrade or add extra users.");
      return;
    }
    const now = new Date().toISOString();
    const authUser = await base44.entities.VendorAuthorizedUser.create({
      ...form,
      authorized_email: form.authorized_email.trim().toLowerCase(),
      vendor_account_id: account.id,
      assigned_pin_ids: [],
      status: "pending",
      added_by_owner_user_id: user?.id,
      invited_at: now,
    });
    // Send invite notification to the invited user
    const notif = await base44.entities.Notification.create({
      user_email: form.authorized_email.trim().toLowerCase(),
      title: "Vendor Dashboard Invitation",
      message: `You've been invited to access ${account.business_name} on Yardit.`,
      type: "vendor_access_invite",
      related_entity_type: "VendorAuthorizedUser",
      related_entity_id: authUser.id,
      read: false,
      is_read: false,
      metadata: {
        authorized_user_id: authUser.id,
        vendor_account_id: account.id,
        business_name: account.business_name,
      },
    });
    // Store notification ID on the record for reference
    await base44.entities.VendorAuthorizedUser.update(authUser.id, { invite_notification_id: notif.id });
    setForm({ authorized_email: "", first_name: "", last_name: "", phone: "" });
    toast.success("Invite sent — user must accept before gaining access.");
    onRefresh();
  };

  const removeUser = async (item) => {
    await base44.entities.VendorAuthorizedUser.update(item.id, { status: "removed", removed_at: new Date().toISOString() });
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
    <div className="space-y-3 sm:space-y-4 min-w-0">
      <div className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
      <div className="space-y-3 sm:space-y-4 min-w-0">
        <Card className="rounded-2xl overflow-hidden bg-white shadow-sm"><CardHeader className="p-3 sm:p-5 pb-2"><CardTitle className="text-base sm:text-lg">Vendor Portal Passcode</CardTitle></CardHeader><CardContent className="space-y-2.5 p-3 pt-0 sm:p-5 sm:pt-0">
          <p className="text-sm text-slate-600">Authorized users must enter this shared passcode before accessing the Vendor Dashboard. The current passcode is never shown.</p>
          <Input type="password" placeholder={account.vendor_dashboard_passcode_hash ? "New passcode" : "Create passcode"} value={passcode} onChange={(e) => setPasscode(e.target.value)} disabled={!isOwner} />
          <Button onClick={savePasscode} disabled={!isOwner || savingPasscode} className="w-full bg-[#5DADA5] hover:bg-[#4A9B93]">{savingPasscode ? "Saving..." : account.vendor_dashboard_passcode_hash ? "Reset Passcode" : "Create Passcode"}</Button>
          {!isOwner && <p className="text-xs text-muted-foreground">Only the business owner can change this passcode.</p>}
        </CardContent></Card>

        <Card className="rounded-2xl overflow-hidden bg-white shadow-sm"><CardHeader className="p-3 sm:p-5 pb-2"><CardTitle className="text-base sm:text-lg">Add Authorized User</CardTitle></CardHeader><CardContent className="space-y-2.5 p-3 pt-0 sm:p-5 sm:pt-0">
          <p className="text-sm text-slate-600">Employees must create their own Yardit account first. This only grants access to this business portal.</p>
          <Input placeholder="Email" value={form.authorized_email} onChange={(e) => setForm({ ...form, authorized_email: e.target.value })} disabled={!isOwner} />
          <Input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} disabled={!isOwner} />
          <Input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} disabled={!isOwner} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!isOwner} />
          <Button onClick={addUser} disabled={!canAddUser} className="w-full bg-[#5DADA5] hover:bg-[#4A9B93]">Add User</Button>
          {!isOwner && <p className="text-sm text-muted-foreground">Only the business owner can add users.</p>}
          {isOwner && !canAddUser && <p className="text-sm text-amber-700">User limit reached ({activeUserCount}/{caps.maxUsers}) for {caps.tierLabel} plan on this business.</p>}
        </CardContent></Card>

      </div>
      <div className="grid min-w-0 gap-2.5 sm:gap-3">
        {users.map((item) => {
          const statusColors = {
            pending: "bg-yellow-100 text-yellow-800",
            accepted: "bg-green-100 text-green-800",
            active: "bg-green-100 text-green-800",
            denied: "bg-red-100 text-red-700",
            removed: "bg-slate-100 text-slate-500",
            inactive: "bg-slate-100 text-slate-500",
          };
          const canAssignPins = item.status === "accepted" || item.status === "active";
          const canRemove = item.status !== "removed";
          return (
            <Card key={item.id} className="rounded-2xl overflow-hidden bg-white shadow-sm">
              <CardContent className="p-3 space-y-2.5">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold break-words">{item.first_name} {item.last_name}</p>
                    <p className="text-xs text-slate-600 break-all">{item.authorized_email}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <Badge className={`text-[11px] capitalize ${statusColors[item.status] || ""}`}>{item.status}</Badge>
                    {canRemove && (
                      <Button variant="outline" size="sm" disabled={!isOwner} onClick={() => removeUser(item)} className="h-7 rounded-full px-2 text-[11px]">Remove</Button>
                    )}
                  </div>
                </div>
                {pins.length > 0 && canAssignPins && (
                  <div className="border-t pt-2">
                    <p className="mb-1.5 text-[11px] font-semibold text-slate-500 uppercase">Assigned trucks</p>
                    <div className="flex flex-wrap gap-1.5">
                      {pins.filter((pin) => pin.is_active !== false).map((pin) => (
                        <label key={pin.id} className="flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-[11px]">
                          <input type="checkbox" disabled={!isOwner} checked={(item.assigned_pin_ids || []).includes(pin.id)} onChange={() => toggleAssignedPin(item, pin.id)} />
                          <span className="break-words">{pin.pin_name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      </div>
      <TransferOwnershipCard account={account} user={user} canTransfer={canTransferOwnership} onRefresh={onRefresh} />
    </div>
  );
}