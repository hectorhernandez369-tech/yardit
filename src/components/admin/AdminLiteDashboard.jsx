import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReportsQueue from "./ReportsQueue";
import ListingManagement from "./ListingManagement";
import UserManagement from "./UserManagement";
import SystemSettings from "./SystemSettings";
import SupportTicketQueue from "./SupportTicketQueue";

export default function AdminLiteDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("reports");

  return (
    <div className="mt-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-4xl grid-cols-5 h-auto min-h-10">
          <TabsTrigger value="reports" className="whitespace-normal h-full">Reports Queue</TabsTrigger>
          <TabsTrigger value="support" className="whitespace-normal h-full">Support Tickets</TabsTrigger>
          <TabsTrigger value="listings" className="whitespace-normal h-full">Listings</TabsTrigger>
          <TabsTrigger value="users" className="whitespace-normal h-full">Users</TabsTrigger>
          <TabsTrigger value="settings" className="whitespace-normal h-full">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <ReportsQueue />
        </TabsContent>
        <TabsContent value="support">
          <SupportTicketQueue />
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