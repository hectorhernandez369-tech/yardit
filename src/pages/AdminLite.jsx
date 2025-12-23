import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReportsQueue from "../components/admin/ReportsQueue";
import ListingManagement from "../components/admin/ListingManagement";
import UserManagement from "../components/admin/UserManagement";

export default function AdminLitePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("reports");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser.isAdmin) {
          navigate(createPageUrl("Home"));
          return;
        }
        setUser(currentUser);
      } catch (error) {
        navigate(createPageUrl("Home"));
      }
    };
    fetchUser();
  }, []);

  if (!user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          🛡️ Admin Lite
        </h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
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
    </div>
  );
}