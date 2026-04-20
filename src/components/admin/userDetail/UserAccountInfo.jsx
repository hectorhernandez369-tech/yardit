import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Save, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PromotionModal from "../promotions/PromotionModal";

const statusColors = {
  active: "bg-green-600",
  warned: "bg-yellow-600",
  suspended: "bg-red-600",
  banned: "bg-black",
};

function deriveNames(user) {
  if (user.first_name || user.last_name) {
    return { first: user.first_name || "", last: user.last_name || "" };
  }

  const rawName = (user.full_name || "").trim();
  if (!rawName || !rawName.includes(" ")) {
    return { first: "", last: "" };
  }

  const parts = rawName.split(/\s+/);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") || "" };
}

export default function UserAccountInfo({ user, onUserUpdated }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const { first, last } = deriveNames(user);

  const [form, setForm] = useState({
    first_name: first,
    last_name: last,
    phone: user.phone || "",
    address: user.address || "",
    accountStatus: user.accountStatus || "active",
  });

  const startEdit = () => {
    const names = deriveNames(user);
    setForm({
      first_name: names.first,
      last_name: names.last,
      phone: user.phone || "",
      address: user.address || "",
      accountStatus: user.accountStatus || "active",
    });
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      accountStatus: form.accountStatus,
    };
    await base44.entities.User.update(user.id, payload);
    // Re-fetch fresh user data
    const allUsers = await base44.entities.User.list();
    const freshUser = allUsers.find(u => u.id === user.id);
    toast.success("User info updated.");
    setSaving(false);
    setEditing(false);
    if (onUserUpdated && freshUser) onUserUpdated(freshUser);
  };

  const status = user.accountStatus || "active";

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Edit Account Info</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={cancelEdit} className="gap-1 text-xs h-7">
              <X className="w-3 h-3" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1 text-xs h-7">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">First Name</label>
            <Input
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              placeholder="First name"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Last Name</label>
            <Input
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              placeholder="Last name"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Phone</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone number"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Account Status</label>
            <Select value={form.accountStatus} onValueChange={(v) => setForm({ ...form, accountStatus: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="warned">Warned</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Address</label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Address"
            />
          </div>
        </div>

        <div className="text-xs text-gray-400">
          Email and Role cannot be edited here. User ID: <span className="font-mono">{user.id}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Account Holder Info</h3>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowPromoModal(true)} className="gap-1 text-xs h-7 bg-purple-600 hover:bg-purple-700 text-white">
            PROMOTIONAL
          </Button>
          <Button size="sm" variant="outline" onClick={startEdit} className="gap-1 text-xs h-7">
            <Pencil className="w-3 h-3" /> Edit
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="text-gray-500">First Name</span>
          <p className="font-medium">{first || "—"}</p>
        </div>
        <div>
          <span className="text-gray-500">Last Name</span>
          <p className="font-medium">{last || "—"}</p>
        </div>
        <div>
          <span className="text-gray-500">Email</span>
          <p className="font-medium break-all">{user.email || "—"}</p>
        </div>
        <div>
          <span className="text-gray-500">Phone</span>
          <p className="font-medium">{user.phone || "—"}</p>
        </div>
        <div>
          <span className="text-gray-500">Address</span>
          <p className="font-medium">{user.address || "—"}</p>
        </div>
        <div>
          <span className="text-gray-500">User ID</span>
          <p className="font-medium font-mono text-xs">{user.id}</p>
        </div>
        <div>
          <span className="text-gray-500">Account Status</span>
          <div className="mt-0.5">
            <Badge className={statusColors[status]}>{status.toUpperCase()}</Badge>
          </div>
        </div>
        <div>
          <span className="text-gray-500">Role</span>
          <p className="font-medium capitalize">{user.role || "user"}</p>
        </div>
      </div>
      {showPromoModal && (
        <PromotionModal
          open={showPromoModal}
          onClose={() => setShowPromoModal(false)}
          user={user}
        />
      )}
    </div>
  );
}