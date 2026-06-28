import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ListingManagement from "./ListingManagement";
import UserManagement from "./UserManagement";
import JTHTab from "./JTHTab";
import RewardsAdminHub from "./vouchers/RewardsAdminHub";
import VendorAdminDashboard from "./vendor/VendorAdminDashboard";
import PaymentAuditDashboard from "./payments/PaymentAuditDashboard";
import AdminAssistedListingsTab from "./assisted/AdminAssistedListingsTab";

export default function AdminLiteDashboard({ user }) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("listings");

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const liteTab = urlParams.get("liteTab");
    const validTabs = ["listings", "users", "vendors", "assisted", "promos", "payments", "jth"];
    if (validTabs.includes(liteTab)) setActiveTab(liteTab);
  }, [location.search]);

  return (
    <div className="mt-4">
      <div className="rounded-xl bg-gradient-to-r from-[#2C4F4E] to-[#5DADA5] p-4 text-white mb-4">
        <h2 className="text-lg font-bold">Operations</h2>
        <p className="text-sm text-white/75 mt-0.5">Listings, users, vendors, events, assisted listings, promotions, vouchers, payments, and feature operations.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="-mx-3 overflow-x-auto px-3 touch-pan-x [scrollbar-width:thin]">
          <TabsList className="inline-flex h-auto w-max min-w-full flex-nowrap gap-1 p-1">
            <TabsTrigger value="listings" className="shrink-0 whitespace-nowrap">Listings & Neighborhood Sales</TabsTrigger>
            <TabsTrigger value="users" className="shrink-0 whitespace-nowrap">Users</TabsTrigger>
            <TabsTrigger value="vendors" className="shrink-0 whitespace-nowrap">Vendors & Events</TabsTrigger>
            <TabsTrigger value="assisted" className="shrink-0 whitespace-nowrap">Assisted Listings</TabsTrigger>
            <TabsTrigger value="promos" className="shrink-0 whitespace-nowrap">Promotions & Vouchers</TabsTrigger>
            <TabsTrigger value="payments" className="shrink-0 whitespace-nowrap">Payments</TabsTrigger>
            <TabsTrigger value="jth" className="shrink-0 whitespace-nowrap">Join the Hunt</TabsTrigger>
          </TabsList>
        </div>

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