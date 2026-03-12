import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ListingManagement from "./ListingManagement";
import UserManagement from "./UserManagement";
import SystemSettings from "./SystemSettings";
import SupportTicketQueue from "./SupportTicketQueue";
import InQueueTab from "../caseManagement/ui/InQueueTab";

export default function AdminLiteDashboard({ user, counts, allAdminUsers, searchResults, onOpenCase, refreshKey, triggerRefresh }) {
  const [activeTab, setActiveTab] = useState("admin_lite_queue");

  return (
    <div className="mt-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-5xl grid-cols-5 h-auto min-h-10">
          <TabsTrigger value="admin_lite_queue" className="whitespace-normal h-full">
            Queue {counts?.in_queue !== undefined ? `(${counts.in_queue})` : ""}
          </TabsTrigger>
          <TabsTrigger value="support" className="whitespace-normal h-full">Support Tickets</TabsTrigger>
          <TabsTrigger value="listings" className="whitespace-normal h-full">Listings</TabsTrigger>
          <TabsTrigger value="users" className="whitespace-normal h-full">Users</TabsTrigger>
          <TabsTrigger value="settings" className="whitespace-normal h-full">Settings</TabsTrigger>
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