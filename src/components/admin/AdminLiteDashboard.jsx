import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import ListingManagement from "./ListingManagement";
import UserManagement from "./UserManagement";
import JTHTab from "./JTHTab";
import RewardsAdminHub from "./vouchers/RewardsAdminHub";
import VendorAdminDashboard from "./vendor/VendorAdminDashboard";
import PaymentAuditDashboard from "./payments/PaymentAuditDashboard";
import AdminAssistedListingsTab from "./assisted/AdminAssistedListingsTab";

export default function AdminLiteDashboard({ user, selectedTab, onTabChange }) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("listings");

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const liteTab = urlParams.get("liteTab");
    const validTabs = ["listings", "users", "vendors", "assisted", "promos", "payments", "jth"];
    if (validTabs.includes(liteTab)) setActiveTab(liteTab);
  }, [location.search]);

  return (
    <div>
      <Tabs value={selectedTab || activeTab} onValueChange={onTabChange || setActiveTab}>
        <TabsContent value="listings">
          <ListingManagement mode="residential" adminUser={user} />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="vendors">
          <VendorAdminDashboard user={user} />
        </TabsContent>

        <TabsContent value="assisted">
          <AdminAssistedListingsTab adminUser={user} />
        </TabsContent>

        <TabsContent value="promos">
          <div className="mt-4">
            <RewardsAdminHub adminUser={user} />
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <PaymentAuditDashboard />
        </TabsContent>

        <TabsContent value="jth">
          <JTHTab user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}