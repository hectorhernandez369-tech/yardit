import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, XCircle, Send, ToggleLeft, ToggleRight, Users, Activity, Pencil, Trash2 } from "lucide-react";
import { logUserActivity } from "@/lib/logUserActivity";
import EmployeeActivityDrawer from "./EmployeeActivityDrawer";
import EditEmployeeDrawer from "./EditEmployeeDrawer";
import { format } from "date-fns";

function PendingInvitesTable({ invites, onResend, onCancel, acting }) {
  if (invites.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">No pending invites.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-600">
            <th className="py-2 px-2">Employee ID</th>
            <th className="py-2 px-2">First</th>
            <th className="py-2 px-2">Last</th>
            <th className="py-2 px-2">Email</th>
            <th className="py-2 px-2">Role</th>
            <th className="py-2 px-2">Supervisor</th>
            <th className="py-2 px-2">Invited</th>
            <th className="py-2 px-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invites.map((inv) => (
            <tr key={inv.id} className="border-b hover:bg-gray-50/50">
              <td className="py-2 px-2 font-mono text-xs">{inv.employee_id}</td>
              <td className="py-2 px-2">{inv.first_name}</td>
              <td className="py-2 px-2">{inv.last_name}</td>
              <td className="py-2 px-2 text-xs">{inv.email}</td>
              <td className="py-2 px-2">
                <Badge variant="outline" className="capitalize text-xs">{inv.role_label}</Badge>
              </td>
              <td className="py-2 px-2 text-xs">{inv.supervisor_employee_id || "—"}</td>
              <td className="py-2 px-2 text-xs">
                {inv.invited_at ? format(new Date(inv.invited_at), "MMM d, yyyy") : "—"}
              </td>
              <td className="py-2 px-2">
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    disabled={acting === inv.id}
                    onClick={() => onResend(inv)}
                  >
                    {acting === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Resend
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                    disabled={acting === inv.id}
                    onClick={() => onCancel(inv)}
                  >
                    {acting === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                    Cancel
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActiveAdminsTable({ admins, onToggleActive, onDeleteAdmin, acting, onViewActivity, onEditUser, isMaster }) {
  if (admins.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">No admin profiles found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-600">
            <th className="py-2 px-2">Employee ID</th>
            <th className="py-2 px-2">First</th>
            <th className="py-2 px-2">Last</th>
            <th className="py-2 px-2">Email</th>
            <th className="py-2 px-2">Role</th>
            <th className="py-2 px-2">Supervisor</th>
            <th className="py-2 px-2">Active</th>
            <th className="py-2 px-2">Last Login</th>
            <th className="py-2 px-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((adm) => (
            <tr key={adm.id} className="border-b hover:bg-gray-50/50">
              <td className="py-2 px-2 font-mono text-xs">{adm.employee_id}</td>
              <td className="py-2 px-2">{adm.first_name}</td>
              <td className="py-2 px-2">{adm.last_name}</td>
              <td className="py-2 px-2 text-xs">{adm.email}</td>
              <td className="py-2 px-2">
                <Badge variant="outline" className="capitalize text-xs">{adm.role_label}</Badge>
              </td>
              <td className="py-2 px-2 text-xs">{adm.supervisor_employee_id || "—"}</td>
              <td className="py-2 px-2">
                <Badge className={adm.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {adm.is_active ? "Yes" : "No"}
                </Badge>
              </td>
              <td className="py-2 px-2 text-xs">
                {adm.last_login_at ? format(new Date(adm.last_login_at), "MMM d, yyyy h:mm a") : "Never"}
              </td>
              <td className="py-2 px-2">
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-7 text-xs gap-1 ${adm.is_active ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}
                  disabled={acting === adm.id}
                  onClick={() => onToggleActive(adm)}
                >
                  {acting === adm.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : adm.is_active ? (
                    <ToggleLeft className="w-3 h-3" />
                  ) : (
                    <ToggleRight className="w-3 h-3" />
                  )}
                  {adm.is_active ? "Deactivate" : "Reactivate"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => onViewActivity(adm)}
                >
                  <Activity className="w-3 h-3" />
                  Activity
                </Button>
                {isMaster && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => onEditUser(adm)}
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                      disabled={acting === `delete-${adm.id}`}
                      onClick={() => onDeleteAdmin(adm)}
                    >
                      {acting === `delete-${adm.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Delete
                    </Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EmployeeUsersTab({ currentUser }) {
  const [invites, setInvites] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [activityAdmin, setActivityAdmin] = useState(null);
  const [editAdmin, setEditAdmin] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);

  const isMaster = currentUser?.role === "master";

  const loadData = useCallback(async () => {
    setLoading(true);
    const [inv, prof] = await Promise.all([
      base44.entities.AdminInviteProfile.filter({ status: "pending" }),
      base44.entities.AdminProfile.list(),
    ]);
    setInvites(inv);
    setAdmins(prof);
    if (currentUser) {
      const mine = prof.find(p => p.email === currentUser.email?.toLowerCase() || p.user_id === currentUser.id);
      if (mine) setCurrentProfile(mine);
    }
    setLoading(false);
  }, [currentUser]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleResend = async (inv) => {
    setActing(inv.id);
    try {
      // Keep Base44 platform role as "user" and preserve internal admin permissions in AdminInviteProfile.
      await base44.users.inviteUser(inv.email, "user");
      if (currentUser?.id) {
        await logUserActivity({
          user_id: currentUser.id,
          event_type: "admin_invite_resent",
          event_label: "Admin Invite Resent",
          target_type: "admin_invite",
          target_id: inv.employee_id,
          source_page: window.location.pathname,
          details_json: {
            email: inv.email,
            employee_id: inv.employee_id,
            role_label: inv.role_label,
            metadata_preserved: true,
          },
        }).catch(() => null);
      }
      toast.success(`Invite resent to ${inv.email}`);
    } catch (e) {
      console.error("Resend failed:", e);
      toast.error("Failed to resend invite.");
    }
    setActing(null);
  };

  const handleCancel = async (inv) => {
    setActing(inv.id);
    await base44.entities.AdminInviteProfile.update(inv.id, { status: "canceled" });
    if (currentUser?.id) {
      await logUserActivity({
        user_id: currentUser.id,
        event_type: "admin_invite_canceled",
        event_label: "Admin Invite Canceled",
        target_type: "admin_invite",
        target_id: inv.employee_id,
        source_page: window.location.pathname,
        details_json: { email: inv.email, employee_id: inv.employee_id },
      }).catch(() => null);
    }
    toast.success(`Invite for ${inv.email} canceled.`);
    setInvites((prev) => prev.filter((i) => i.id !== inv.id));
    setActing(null);
  };

  const handleToggleActive = async (adm) => {
    setActing(adm.id);
    const newVal = !adm.is_active;
    await base44.entities.AdminProfile.update(adm.id, { is_active: newVal });

    if (currentUser?.id) {
      await base44.entities.AdminAction.create({
        admin_id: currentUser.id,
        action_type: newVal ? "admin_reactivated" : "admin_deactivated",
        old_value: String(adm.is_active),
        new_value: String(newVal),
        comment: `${adm.first_name} ${adm.last_name} (${adm.employee_id}) ${newVal ? "reactivated" : "deactivated"}`,
        page: window.location.pathname,
      }).catch(() => null);

      await logUserActivity({
        user_id: currentUser.id,
        event_type: newVal ? "admin_reactivated" : "admin_deactivated",
        event_label: newVal ? "Admin Reactivated" : "Admin Deactivated",
        target_type: "admin_profile",
        target_id: adm.employee_id,
        source_page: window.location.pathname,
        before_value: String(adm.is_active),
        after_value: String(newVal),
        details_json: { email: adm.email, employee_id: adm.employee_id },
      }).catch(() => null);
    }
    toast.success(`${adm.first_name} ${adm.last_name} ${newVal ? "reactivated" : "deactivated"}.`);
    setAdmins((prev) => prev.map((a) => (a.id === adm.id ? { ...a, is_active: newVal } : a)));
    setActing(null);
  };

  const handleDeleteAdmin = async (adm) => {
    const confirmed = window.confirm(`Delete ${adm.first_name} ${adm.last_name}? This will fully remove their admin access records.`);
    if (!confirmed) return;

    setActing(`delete-${adm.id}`);

    const normalizedEmail = adm.email?.toLowerCase?.() || "";
    const userId = adm.user_id && typeof adm.user_id === "object" ? adm.user_id.id : adm.user_id;

    const [matchingInvites, matchingAccessKeys, allAdmins] = await Promise.all([
      normalizedEmail ? base44.entities.AdminInviteProfile.filter({ email: normalizedEmail }) : Promise.resolve([]),
      adm.employee_id ? base44.entities.AdminAccessKey.filter({ employee_id: adm.employee_id }) : Promise.resolve([]),
      base44.entities.AdminProfile.list(),
    ]);

    const dependentAdmins = allAdmins.filter((profile) => {
      const supervisorUserId = profile.supervisor_user_id && typeof profile.supervisor_user_id === "object" ? profile.supervisor_user_id.id : profile.supervisor_user_id;
      return profile.id !== adm.id && (supervisorUserId === userId || profile.supervisor_employee_id === adm.employee_id);
    });

    await Promise.all([
      ...dependentAdmins.map((profile) =>
        base44.entities.AdminProfile.update(profile.id, {
          supervisor_user_id: "",
          supervisor_employee_id: "",
        })
      ),
      ...matchingInvites.map((invite) => base44.entities.AdminInviteProfile.delete(invite.id)),
      ...matchingAccessKeys.map((key) => base44.entities.AdminAccessKey.delete(key.id)),
      base44.entities.AdminProfile.delete(adm.id),
    ]);

    if (currentUser?.id) {
      await base44.entities.AdminAction.create({
        admin_id: currentUser.id,
        action_type: "admin_deleted",
        old_value: JSON.stringify({ email: adm.email, employee_id: adm.employee_id, user_id: userId || "" }),
        new_value: "",
        comment: `${adm.first_name} ${adm.last_name} (${adm.employee_id}) deleted`,
        page: window.location.pathname,
      }).catch(() => null);

      await logUserActivity({
        user_id: currentUser.id,
        event_type: "admin_deleted",
        event_label: "Admin Deleted",
        target_type: "admin_profile",
        target_id: adm.employee_id,
        source_page: window.location.pathname,
        details_json: {
          email: adm.email,
          employee_id: adm.employee_id,
          deleted_user_id: userId || "",
          cleared_supervisor_assignments: dependentAdmins.map((profile) => profile.employee_id),
        },
      }).catch(() => null);
    }

    toast.success(`${adm.first_name} ${adm.last_name} was deleted.`);
    setAdmins((prev) => prev
      .filter((a) => a.id !== adm.id)
      .map((a) => {
        const supervisorUserId = a.supervisor_user_id && typeof a.supervisor_user_id === "object" ? a.supervisor_user_id.id : a.supervisor_user_id;
        if (supervisorUserId === userId || a.supervisor_employee_id === adm.employee_id) {
          return { ...a, supervisor_user_id: "", supervisor_employee_id: "" };
        }
        return a;
      }));
    setActing(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mt-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" /> Employee Users
        </h2>
        <Button size="sm" variant="outline" onClick={loadData} className="gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pending Invites ({invites.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <PendingInvitesTable invites={invites} onResend={handleResend} onCancel={handleCancel} acting={acting} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active Admins ({admins.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ActiveAdminsTable admins={admins} onToggleActive={handleToggleActive} onDeleteAdmin={handleDeleteAdmin} acting={acting} onViewActivity={setActivityAdmin} onEditUser={setEditAdmin} isMaster={isMaster} />
        </CardContent>
      </Card>

      <EmployeeActivityDrawer
        open={!!activityAdmin}
        onClose={() => setActivityAdmin(null)}
        admin={activityAdmin}
      />

      <EditEmployeeDrawer
        open={!!editAdmin}
        onClose={() => setEditAdmin(null)}
        admin={editAdmin}
        currentUserProfile={currentProfile}
        onSaved={loadData}
      />
    </div>
  );
}