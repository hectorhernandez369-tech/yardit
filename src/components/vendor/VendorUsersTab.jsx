import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getVendorUserLimit } from "@/lib/vendorTiers";
import { toast } from "sonner";

export default function VendorUsersTab({ account, users, user, onRefresh }) {
  const [form, setForm] = useState({ authorized_email: "", first_name: "", last_name: "", phone: "" });
  const canAddUser = users.length < getVendorUserLimit(account);

  const addUser = async () => {
    if (!form.authorized_email.trim()) return;
    if (!canAddUser) {
      toast.error("You reached your user limit. Upgrade or add extra users.");
      return;
    }
    await base44.entities.VendorAuthorizedUser.create({ ...form, vendor_account_id: account.id, assigned_pin_ids: [], status: "active", added_by_owner_user_id: user?.id });
    setForm({ authorized_email: "", first_name: "", last_name: "", phone: "" });
    toast.success("User added");
    onRefresh();
  };

  const removeUser = async (item) => {
    await base44.entities.VendorAuthorizedUser.update(item.id, { ...item, status: "removed" });
    onRefresh();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card><CardHeader><CardTitle>Add Authorized User</CardTitle></CardHeader><CardContent className="space-y-3">
        <Input placeholder="Email" value={form.authorized_email} onChange={(e) => setForm({ ...form, authorized_email: e.target.value })} />
        <Input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <Input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Button onClick={addUser} className="w-full bg-[#5DADA5] hover:bg-[#4A9B93]">Add User</Button>
        {!canAddUser && <p className="text-sm text-amber-700">User limit reached for your tier.</p>}
      </CardContent></Card>
      <div className="grid gap-3">
        {users.map((item) => <Card key={item.id}><CardContent className="p-4 flex items-center justify-between gap-3"><div><p className="font-semibold">{item.first_name} {item.last_name}</p><p className="text-sm text-slate-600">{item.authorized_email}</p></div><div className="flex items-center gap-2"><Badge>{item.status}</Badge><Button variant="outline" size="sm" onClick={() => removeUser(item)}>Remove</Button></div></CardContent></Card>)}
      </div>
    </div>
  );
}