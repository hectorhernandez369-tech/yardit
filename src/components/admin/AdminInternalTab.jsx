import React from "react";
import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
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
          <TabsTrigger value="launch-checklist" className="whitespace-nowrap">Launch Checklist</TabsTrigger>
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

        <TabsContent value="launch-checklist">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mt-4">
            <div className="flex items-start gap-3">
              <ClipboardList className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-bold text-[#2C4F4E]">Launch Checklist</h3>
                <p className="text-sm text-slate-600 mt-1 mb-4">Review the final launch readiness items for payments, listings, vendors, and events.</p>
                <Link to="/LaunchChecklist">
                  <Button className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">
                    Open Launch Checklist
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </TabsContent>

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