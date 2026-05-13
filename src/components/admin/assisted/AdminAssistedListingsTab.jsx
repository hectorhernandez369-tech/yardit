import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminAssistedListingForm from "@/components/admin/assisted/AdminAssistedListingForm";
import AdminAssistedListingHistory from "@/components/admin/assisted/AdminAssistedListingHistory";

export default function AdminAssistedListingsTab({ adminUser }) {
  const [subTab, setSubTab] = useState("create");

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-[#2C4F4E]">Assisted Yard Sale Listings</h2>
        <p className="text-sm text-gray-500 mt-1">Create a promotional listing on behalf of a seller and generate a QR code for them to approve and claim.</p>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="create">Create Assisted Listing</TabsTrigger>
          <TabsTrigger value="history">Listing History</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <AdminAssistedListingForm adminUser={adminUser} />
        </TabsContent>
        <TabsContent value="history">
          <AdminAssistedListingHistory adminUser={adminUser} />
        </TabsContent>
      </Tabs>
    </div>
  );
}