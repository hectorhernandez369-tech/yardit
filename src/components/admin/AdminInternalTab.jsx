import React from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import CreateAdminTab from "./CreateAdminTab";
import AdminLogsTab from "./AdminLogsTab";
import EmployeeUsersTab from "./EmployeeUsersTab";
import MySettingsTab from "./MySettingsTab";
import SystemHealthDashboard from "./system-health/SystemHealthDashboard";
import SystemSettings from "./SystemSettings";
import ResourcesTrainingPanel from "./ResourcesTrainingPanel";
import { hasCapability } from "./adminCapabilities";

export default function AdminInternalTab({ user, adminSession, selectedTab, onTabChange }) {
  const canManageAdmins = hasCapability(user, "admins.manage");
  const canViewLogs = hasCapability(user, "logs.view");
  const isMaster = user?.role === "master" || user?.role_label === "master";

  return (
    <div>
      <Tabs value={selectedTab} onValueChange={onTabChange} defaultValue={canManageAdmins ? "admin-management" : canViewLogs ? "logs" : "settings"}>

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