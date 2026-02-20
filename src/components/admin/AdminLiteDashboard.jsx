import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReportsQueue from "./ReportsQueue";
import ListingManagement from "./ListingManagement";
import UserManagement from "./UserManagement";

export default function AdminLiteDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("reports");

  return (
    <div className="mt-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="reports">Reports Queue</TabsTrigger>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <ReportsQueue />
        </TabsContent>
        <TabsContent value="listings">
          <ListingManagement />
        </TabsContent>
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}