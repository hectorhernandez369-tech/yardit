import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import UserAccountInfo from "./UserAccountInfo";
import UserListingHistory from "./UserListingHistory";
import UserReportHistory from "./UserReportHistory";
import UserAccountNotes from "./UserAccountNotes";
import UserSendMessage from "./UserSendMessage";
import UserPromotionHistory from "./UserPromotionHistory";
import UserActivityLogTab from "./UserActivityLogTab";

export default function UserDetailDrawer({ user, adminUser, open, onClose, onUserUpdated }) {
  const [tab, setTab] = useState("info");

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email}</SheetTitle>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1 w-full">
            <TabsTrigger value="info" className="flex-1 text-xs">Info</TabsTrigger>
            <TabsTrigger value="listings" className="flex-1 text-xs">Listings</TabsTrigger>
            <TabsTrigger value="reports" className="flex-1 text-xs">Reports</TabsTrigger>
            <TabsTrigger value="notes" className="flex-1 text-xs">Notes</TabsTrigger>
            <TabsTrigger value="promotions" className="flex-1 text-xs">Promotions</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 text-xs">Activity Log</TabsTrigger>
            <TabsTrigger value="message" className="flex-1 text-xs">Message</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <UserAccountInfo user={user} onUserUpdated={onUserUpdated} />
          </TabsContent>
          <TabsContent value="listings" className="mt-4">
            <UserListingHistory user={user} />
          </TabsContent>
          <TabsContent value="reports" className="mt-4">
            <UserReportHistory user={user} />
          </TabsContent>
          <TabsContent value="notes" className="mt-4">
            <UserAccountNotes user={user} adminUser={adminUser} />
          </TabsContent>
          <TabsContent value="promotions" className="mt-4">
            <UserPromotionHistory user={user} />
          </TabsContent>
          <TabsContent value="activity" className="mt-4">
            <UserActivityLogTab user={user} />
          </TabsContent>
          <TabsContent value="message" className="mt-4">
            <UserSendMessage user={user} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}