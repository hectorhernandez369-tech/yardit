import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CreateAdminTab from "./CreateAdminTab";
import AdminLogsTab from "./AdminLogsTab";
import EmployeeUsersTab from "./EmployeeUsersTab";
import MySettingsTab from "./MySettingsTab";
import SystemHealthDashboard from "./system-health/SystemHealthDashboard";
import SystemSettings from "./SystemSettings";
import ResourcesTrainingPanel from "./ResourcesTrainingPanel";
import { hasCapability } from "./adminCapabilities";

export default function AdminInternalTab({ user, adminSession }) {
  const canManageAdmins = hasCapability(user, "admins.manage");
  const canViewLogs = hasCapability(user, "logs.view");
  const isMaster = user?.role === "master" || user?.role_label === "master";

  return (
    <div className="mt-4">
      <div className="rounded-xl bg-gradient-to-r from-slate-700 to-slate-500 p-4 text-white mb-4">
        <h2 className="text-lg font-bold">Settings</h2>
        <p className="text-sm text-white/75 mt-0.5">Admin management, permissions, audit logs, resources, system configuration, and system health.</p>
      </div>

      <Tabs defaultValue={canManageAdmins ? "admin-management" : canViewLogs ? "logs" : "settings"}>
        <TabsList className="flex flex-wrap gap-1 h-auto w-full p-1">
          {canManageAdmins && <TabsTrigger value="admin-management" className="whitespace-nowrap">Admin Management & Permissions</TabsTrigger>}
          {canViewLogs && <TabsTrigger value="logs" className="whitespace-nowrap">Audit Logs</TabsTrigger>}
          <TabsTrigger value="resources" className="whitespace-nowrap">Resources / Training</TabsTrigger>
          {isMaster && <TabsTrigger value="system-config" className="whitespace-nowrap">System Configuration</TabsTrigger>}
          {isMaster && <TabsTrigger value="system-health" className="whitespace-nowrap">System Health</TabsTrigger>}
          <TabsTrigger value="settings" className="whitespace-nowrap">My Admin Settings</TabsTrigger>
        </TabsList>

        {canManageAdmins && (
          <TabsContent value="admin-management">
            <div className="space-y-4">
              <CreateAdminTab />
              <EmployeeUsersTab currentUser={user} />
            </div>
          </TabsContent>
        )}

        {canViewLogs && (
          <TabsContent value="logs">
            <AdminLogsTab />
          </TabsContent>
        )}

        <TabsContent value="resources">
          <ResourcesTrainingPanel />
        </TabsContent>

        {isMaster && (
          <TabsContent value="system-config">
            <SystemSettings />
          </TabsContent>
        )}

        {isMaster && (
          <TabsContent value="system-health">
            <SystemHealthDashboard user={user} />
          </TabsContent>
        )}

        <TabsContent value="settings">
          <MySettingsTab user={user} session={adminSession} />
        </TabsContent>
      </Tabs>
    </div>
  );
}