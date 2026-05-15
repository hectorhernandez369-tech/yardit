import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ListingManagement from "./ListingManagement";
import UserManagement from "./UserManagement";
import SystemSettings from "./SystemSettings";
import SupportTicketQueue from "./SupportTicketQueue";
import JTHTab from "./JTHTab";
import InQueueTab from "../caseManagement/ui/InQueueTab";
import SystemHealthDashboard from "./system-health/SystemHealthDashboard";
import VendorAdminDashboard from "./vendor/VendorAdminDashboard";
import { Home, Building2 } from "lucide-react";

export default function AdminLiteDashboard({ user, counts, allAdminUsers, searchResults, onOpenCase, refreshKey, triggerRefresh }) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("admin_lite_queue");
  const [dashboardMode, setDashboardMode] = useState("residential");

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const liteTab = urlParams.get("liteTab");
    if (liteTab) setActiveTab(liteTab);
    const mode = urlParams.get("dashMode");
    if (mode === "vendor") setDashboardMode("vendor");
  }, [location.search]);

  return (
    <div className="mt-4">
      {/* Dashboard Mode Selector */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-5 border border-slate-200">
        <button
          onClick={() => setDashboardMode("residential")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            dashboardMode === "residential"
              ? "bg-white text-[#2C4F4E] shadow-sm border border-slate-200"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Home className="w-4 h-4" />
          Residential
        </button>
        <button
          onClick={() => setDashboardMode("vendor")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            dashboardMode === "vendor"
              ? "bg-[#2C4F4E] text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Vendor / Events
        </button>
      </div>

      {/* Vendor Dashboard */}
      {dashboardMode === "vendor" && (
        <VendorAdminDashboard user={user} />
      )}

      {/* Residential Dashboard */}
      {dashboardMode === "residential" && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto w-full p-1">
            <TabsTrigger value="admin_lite_queue" className="whitespace-nowrap">
              Queue {counts?.in_queue !== undefined ? `(${counts.in_queue})` : ""}
            </TabsTrigger>
            <TabsTrigger value="support" className="whitespace-nowrap">Support Tickets</TabsTrigger>
            <TabsTrigger value="listings" className="whitespace-nowrap">Listings</TabsTrigger>
            <TabsTrigger value="users" className="whitespace-nowrap">Users</TabsTrigger>
            <TabsTrigger value="jth" className="whitespace-nowrap">Join the Hunt</TabsTrigger>
            {(user?.role === "master" || user?.role_label === "master") && (
              <TabsTrigger value="system_health" className="whitespace-nowrap">System Health</TabsTrigger>
            )}
            <TabsTrigger value="settings" className="whitespace-nowrap">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="admin_lite_queue">
            <InQueueTab
              user={user}
              allAdminUsers={allAdminUsers || []}
              searchResults={searchResults}
              onOpenCase={onOpenCase}
              onRefresh={triggerRefresh}
              refreshKey={refreshKey}
            />
          </TabsContent>

          <TabsContent value="support">
            <SupportTicketQueue user={user} mode="residential" />
          </TabsContent>

          <TabsContent value="listings">
            <ListingManagement mode="residential" />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="jth">
            <JTHTab user={user} />
          </TabsContent>

          {(user?.role === "master" || user?.role_label === "master") && (
            <TabsContent value="system_health">
              <SystemHealthDashboard user={user} />
            </TabsContent>
          )}

          <TabsContent value="settings">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}