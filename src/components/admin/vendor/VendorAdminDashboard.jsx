import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import VendorAdminSummaryCards from "./VendorAdminSummaryCards";
import VendorAccountsTable from "./VendorAccountsTable";
import VendorPinsTable from "./VendorPinsTable";
import VendorEventsTable from "./VendorEventsTable";
import SupportTicketQueue from "../SupportTicketQueue";
import VendorPromosAdminList from "./promos/VendorPromosAdminList";
import VendorPromoCodesTab from "./promoCodes/VendorPromoCodesTab";

export default function VendorAdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("summary");

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-xl bg-gradient-to-r from-[#2C4F4E] to-[#5DADA5] p-4 text-white">
        <h2 className="text-lg font-bold">Vendor &amp; Event Admin Dashboard</h2>
        <p className="text-sm text-white/75 mt-0.5">
          Manage vendor accounts, pins, events, and vendor-related support.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto w-full p-1">
          <TabsTrigger value="summary" className="whitespace-nowrap">Overview</TabsTrigger>
          <TabsTrigger value="accounts" className="whitespace-nowrap">Vendor Accounts</TabsTrigger>
          <TabsTrigger value="pins" className="whitespace-nowrap">Vendor Pins</TabsTrigger>
          <TabsTrigger value="events" className="whitespace-nowrap">Vendor Events</TabsTrigger>
          <TabsTrigger value="promotions" className="whitespace-nowrap">Vendor Promos</TabsTrigger>
          <TabsTrigger value="promo_codes" className="whitespace-nowrap">Promo Codes</TabsTrigger>
          <TabsTrigger value="tickets" className="whitespace-nowrap">Support Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <VendorAdminSummaryCards />
        </TabsContent>

        <TabsContent value="accounts">
          <VendorAccountsTable user={user} />
        </TabsContent>

        <TabsContent value="pins">
          <VendorPinsTable user={user} />
        </TabsContent>

        <TabsContent value="events">
          <VendorEventsTable user={user} />
        </TabsContent>

        <TabsContent value="promotions">
          <VendorPromosAdminList user={user} />
        </TabsContent>

        <TabsContent value="promo_codes">
          <VendorPromoCodesTab user={user} />
        </TabsContent>

        <TabsContent value="tickets">
          <SupportTicketQueue user={user} mode="vendor" />
        </TabsContent>
      </Tabs>
    </div>
  );
}