import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ListingManagement from "./ListingManagement";
import UserManagement from "./UserManagement";
import SystemSettings from "./SystemSettings";
import SupportTicketQueue from "./SupportTicketQueue";
import InQueueTab from "../caseManagement/ui/InQueueTab";

export default function AdminLiteDashboard({ user, allAdminUsers, onOpenCase, refreshKey, triggerRefresh, counts }) {
  const [activeTab, setActiveTab] = useState("reports");

  return (
    <div className="mt-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-5xl grid-cols-5 h-auto min-h-10">
          <TabsTrigger value="reports" className="whitespace-normal h-full">Admin Lite Queue {counts?.in_queue > 0 ? `(${counts.in_queue})` : ""}</TabsTrigger>
          <TabsTrigger value="support" className="whitespace-normal h-full">Support Tickets</TabsTrigger>
          <TabsTrigger value="listings" className="whitespace-normal h-full">Listings</TabsTrigger>
          <TabsTrigger value="users" className="whitespace-normal h-full">Users</TabsTrigger>
          <TabsTrigger value="settings" className="whitespace-normal h-full">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <InQueueTab 
            user={user} 
            allAdminUsers={allAdminUsers} 
            onOpenCase={onOpenCase} 
            refreshKey={refreshKey} 
            onRefresh={triggerRefresh} 
          />
        </TabsContent>
        <TabsContent value="support">
          <SupportTicketQueue user={user} />
        </TabsContent>
        <TabsContent value="listings">
          <ListingManagement />
        </TabsContent>
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
        <TabsContent value="settings">
          <SystemSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}