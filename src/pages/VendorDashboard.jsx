import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import VendorSummaryCards from "@/components/vendor/VendorSummaryCards";
import VendorBusinessPage from "@/components/vendor/VendorBusinessPage";
import VendorPinsTab from "@/components/vendor/VendorPinsTab";
import VendorUsersTab from "@/components/vendor/VendorUsersTab";
import VendorCheckInDialog from "@/components/vendor/VendorCheckInDialog";
import VendorCheckInHistory from "@/components/vendor/VendorCheckInHistory";
import VendorBillingTab from "@/components/vendor/VendorBillingTab";
import { isLiveVendorCheckIn } from "@/lib/vendorTiers";

export default function VendorDashboard() {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [pins, setPins] = useState([]);
  const [users, setUsers] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [selectedPin, setSelectedPin] = useState(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadVendorData = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    const accounts = await base44.entities.VendorAccount.filter({ owner_user_id: currentUser.id });
    const activeAccount = accounts.find((item) => item.is_active !== false) || null;
    setAccount(activeAccount);

    if (activeAccount) {
      const [pinRows, userRows, checkInRows, updateRows] = await Promise.all([
        base44.entities.VendorPin.filter({ vendor_account_id: activeAccount.id }, "-created_date"),
        base44.entities.VendorAuthorizedUser.filter({ vendor_account_id: activeAccount.id }, "-created_date"),
        base44.entities.VendorPinCheckIn.filter({ vendor_account_id: activeAccount.id }, "-created_date"),
        base44.entities.VendorUpdate.filter({ vendor_account_id: activeAccount.id }, "-created_date"),
      ]);
      setPins(pinRows.filter((item) => item.is_active !== false));
      setUsers(userRows.filter((item) => item.status !== "removed"));
      setCheckIns(checkInRows);
      setUpdates(updateRows);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadVendorData().catch(() => {
      setLoading(false);
      toast.error("Unable to load vendor dashboard");
    });
  }, []);

  const liveCheckIns = useMemo(() => checkIns.filter(isLiveVendorCheckIn), [checkIns]);

  const openCheckIn = (pin) => {
    setSelectedPin(pin);
    setCheckInOpen(true);
  };

  if (loading) {
    return <div className="min-h-[60vh] bg-[#F3E6CF] p-6 flex items-center justify-center">Loading vendor dashboard...</div>;
  }

  if (!account) {
    return (
      <div className="min-h-[60vh] bg-[#F3E6CF] p-6">
        <Card className="max-w-xl mx-auto border-[#2C4F4E]/20">
          <CardContent className="p-8 text-center space-y-3">
            <h1 className="text-2xl font-bold text-[#2C4F4E]">Vendor Dashboard</h1>
            <p className="text-slate-600">No active vendor account is connected to this login yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3E6CF] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[#2C4F4E]">Vendor Dashboard</h1>
            <p className="text-slate-600">Manage vendor pins, check-ins, users, billing, and updates.</p>
          </div>
          <Button onClick={() => openCheckIn(pins[0])} disabled={!pins.length} className="bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E]">Quick Check-In</Button>
        </div>

        <VendorSummaryCards account={account} pins={pins} users={users} liveCheckIns={liveCheckIns} />

        <Tabs defaultValue="business" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto justify-start bg-white/70">
            <TabsTrigger value="business">Vendor My Page</TabsTrigger>
            <TabsTrigger value="pins">My Truck Pins</TabsTrigger>
            <TabsTrigger value="users">Authorized Users</TabsTrigger>
            <TabsTrigger value="history">Check-In History</TabsTrigger>
            <TabsTrigger value="billing">Tier / Billing</TabsTrigger>
            <TabsTrigger value="events">Events later</TabsTrigger>
          </TabsList>

          <TabsContent value="business"><VendorBusinessPage account={account} pins={pins} checkIns={checkIns} updates={updates} onRefresh={loadVendorData} /></TabsContent>
          <TabsContent value="pins"><VendorPinsTab account={account} pins={pins} users={users} onRefresh={loadVendorData} onCheckIn={openCheckIn} /></TabsContent>
          <TabsContent value="users"><VendorUsersTab account={account} users={users} user={user} onRefresh={loadVendorData} /></TabsContent>
          <TabsContent value="history"><VendorCheckInHistory checkIns={checkIns} pins={pins} /></TabsContent>
          <TabsContent value="billing"><VendorBillingTab account={account} /></TabsContent>
          <TabsContent value="events"><Card><CardContent className="p-6 text-slate-600">Event tools will be added later.</CardContent></Card></TabsContent>
        </Tabs>
      </div>

      <VendorCheckInDialog open={checkInOpen} onOpenChange={setCheckInOpen} account={account} pin={selectedPin} user={user} checkIns={checkIns} onRefresh={loadVendorData} />
    </div>
  );
}