import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ListingManagement from "./ListingManagement";
import UserManagement from "./UserManagement";
import SystemSettings from "./SystemSettings";
import JTHTab from "./JTHTab";
import RewardsAdminHub from "./vouchers/RewardsAdminHub";

// Pure Residential Admin Dashboard — no vendor data mixed in
export default function AdminLiteDashboard({ user }) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("listings");

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const liteTab = urlParams.get("liteTab");
    if (liteTab) setActiveTab(liteTab);
  }, [location.search]);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="flex flex-wrap gap-1 h-auto w-full p-1">
            <TabsTrigger value="listings" className="whitespace-nowrap">Listings</TabsTrigger>
            <TabsTrigger value="users" className="whitespace-nowrap">Users</TabsTrigger>
            <TabsTrigger value="promos" className="whitespace-nowrap">Promotions & Rewards</TabsTrigger>
            <TabsTrigger value="jth" className="whitespace-nowrap">Join the Hunt</TabsTrigger>
            <TabsTrigger value="settings" className="whitespace-nowrap">Settings</TabsTrigger>
          </TabsList>

        <TabsContent value="listings">
          <ListingManagement mode="residential" adminUser={user} />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="promos">
          <div className="mt-4">
            <RewardsAdminHub adminUser={user} />
          </div>
        </TabsContent>

        <TabsContent value="jth">
          <JTHTab user={user} />
        </TabsContent>

        <TabsContent value="settings">
          <SystemSettings />
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}