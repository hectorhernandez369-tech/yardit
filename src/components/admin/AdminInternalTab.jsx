import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CreateAdminTab from "./CreateAdminTab";
import AdminLogsTab from "./AdminLogsTab";
import EmployeeUsersTab from "./EmployeeUsersTab";
import MySettingsTab from "./MySettingsTab";
import SystemHealthDashboard from "./system-health/SystemHealthDashboard";
import AdminAssistedListingsTab from "./assisted/AdminAssistedListingsTab";
import { hasCapability } from "./adminCapabilities";

export default function AdminInternalTab({ user, adminSession }) {
  const canManageAdmins = hasCapability(user, "admins.manage");
  const canViewLogs = hasCapability(user, "logs.view");
  const isMaster = user?.role === "master" || user?.role_label === "master";

  return (
    <div className="mt-4">
      <div className="rounded-xl bg-gradient-to-r from-slate-700 to-slate-500 p-4 text-white mb-4">
        <h2 className="text-lg font-bold">Admin Internal Tools</h2>
        <p className="text-sm text-white/75 mt-0.5">
          Employee management, roles, permissions, logs, and system administration.
        </p>
      </div>

      <Tabs defaultValue={canManageAdmins ? "create-admin" : canViewLogs ? "logs" : "settings"}>
        <TabsList className="flex flex-wrap gap-1 h-auto w-full p-1">
          {canManageAdmins && <TabsTrigger value="create-admin" className="whitespace-nowrap">Create Admin</TabsTrigger>}
          {canManageAdmins && <TabsTrigger value="employee-users" className="whitespace-nowrap">Employee Users</TabsTrigger>}
          {canViewLogs && <TabsTrigger value="logs" className="whitespace-nowrap">Logs</TabsTrigger>}
          {isMaster && <TabsTrigger value="system-health" className="whitespace-nowrap">System Health</TabsTrigger>}
          <TabsTrigger value="assisted" className="whitespace-nowrap">Assisted Listings</TabsTrigger>
          <TabsTrigger value="settings" className="whitespace-nowrap">My Settings</TabsTrigger>
        </TabsList>

        {canManageAdmins && (
          <TabsContent value="create-admin">
            <CreateAdminTab />
          </TabsContent>
        )}

        {canManageAdmins && (
          <TabsContent value="employee-users">
            <EmployeeUsersTab currentUser={user} />
          </TabsContent>
        )}

        {canViewLogs && (
          <TabsContent value="logs">
            <AdminLogsTab />
          </TabsContent>
        )}

        {isMaster && (
          <TabsContent value="system-health">
            <SystemHealthDashboard user={user} />
          </TabsContent>
        )}


        <TabsContent value="assisted">
          <AdminAssistedListingsTab adminUser={user} />
        </TabsContent>

        <TabsContent value="settings">
          <MySettingsTab user={user} session={adminSession} />
        </TabsContent>
      </Tabs>
    </div>
  );
}