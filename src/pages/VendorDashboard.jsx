import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Store, MapPin, CreditCard, Users, MessageSquare } from "lucide-react";
import BusinessHero from "@/components/vendor/BusinessHero";
import MyTrucksSection from "@/components/vendor/MyTrucksSection";
import VendorBillingTab from "@/components/vendor/VendorBillingTab";
import VendorUsersTab from "@/components/vendor/VendorUsersTab";
import VendorPinStatusBar from "@/components/vendor/VendorPinStatusBar";
import VendorBusinessPage from "@/components/vendor/VendorBusinessPage";
import VendorUpdatesTab from "@/components/vendor/VendorUpdatesTab";

export default function VendorDashboard() {
  const queryClient = useQueryClient();

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ["vendorDashboardUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: accounts = [], isLoading: loadingAccount } = useQuery({
    queryKey: ["vendorDashboardAccount", user?.id, user?.email],
    queryFn: async () => {
      const byId = await base44.entities.VendorAccount.filter({ owner_user_id: user.id });
      if (byId.length) return byId;
      return base44.entities.VendorAccount.filter({ owner_user_id: user.email });
    },
    enabled: !!user?.id,
  });

  const account = accounts.find((item) => item.is_active !== false) || accounts[0];

  const { data: pins = [] } = useQuery({
    queryKey: ["vendorDashboardPins", account?.id],
    queryFn: () => base44.entities.VendorPin.filter({ vendor_account_id: account.id }, "-created_date"),
    enabled: !!account?.id,
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ["vendorDashboardCheckIns", account?.id],
    queryFn: () => base44.entities.VendorPinCheckIn.filter({ vendor_account_id: account.id }, "-created_date"),
    enabled: !!account?.id,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["vendorDashboardUsers", account?.id],
    queryFn: () => base44.entities.VendorAuthorizedUser.filter({ vendor_account_id: account.id, status: "active" }, "-created_date"),
    enabled: !!account?.id,
  });

  const { data: updates = [] } = useQuery({
    queryKey: ["vendorDashboardUpdates", account?.id],
    queryFn: () => base44.entities.VendorUpdate.filter({ vendor_account_id: account.id }, "-created_date"),
    enabled: !!account?.id,
  });

  const refreshDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardAccount"] });
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardPins"] });
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardCheckIns"] });
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardUsers"] });
    queryClient.invalidateQueries({ queryKey: ["vendorDashboardUpdates"] });
  };

  if (loadingUser || loadingAccount) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#5DADA5]" /></div>;
  }

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6">
        <Card className="rounded-3xl">
          <CardContent className="p-8 text-center space-y-3">
            <Store className="h-10 w-10 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold text-[#2C4F4E]">No vendor account found</h1>
            <p className="text-sm text-muted-foreground">Once your vendor account is created, your dashboard tabs will appear here.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const heroProfile = {
    business_name: account.business_name,
    logo_url: account.business_logo,
    tier: account.vendor_tier,
    category: account.business_category,
    description: account.description,
  };
  const activeCheckIn = checkIns.find((item) => item.status === "live" && new Date(item.checkin_end_time) > new Date());

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <BusinessHero profile={heroProfile} activeCheckIn={activeCheckIn} />

        <Tabs defaultValue="profile" className="space-y-5">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 rounded-2xl border border-slate-200 bg-slate-50 p-1 h-auto shadow-sm">
            <TabsTrigger value="profile" className="rounded-xl gap-1 data-[state=active]:bg-[#5DADA5] data-[state=active]:text-white"><Store className="h-4 w-4" /> my page</TabsTrigger>
            <TabsTrigger value="pins" className="rounded-xl gap-1 data-[state=active]:bg-[#5DADA5] data-[state=active]:text-white"><MapPin className="h-4 w-4" /> My Trucks</TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl gap-1 data-[state=active]:bg-[#5DADA5] data-[state=active]:text-white"><Users className="h-4 w-4" /> Team</TabsTrigger>
            <TabsTrigger value="tier" className="rounded-xl gap-1 data-[state=active]:bg-[#5DADA5] data-[state=active]:text-white"><CreditCard className="h-4 w-4" /> Plan</TabsTrigger>
            <TabsTrigger value="updates" className="rounded-xl gap-1 data-[state=active]:bg-[#5DADA5] data-[state=active]:text-white"><MessageSquare className="h-4 w-4" /> Updates</TabsTrigger>
          </TabsList>

          <VendorPinStatusBar pins={pins} checkIns={checkIns} />

          <TabsContent value="profile"><VendorBusinessPage account={account} pins={pins} checkIns={checkIns} updates={updates} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="pins"><MyTrucksSection vendorAccount={account} /></TabsContent>
          <TabsContent value="users"><VendorUsersTab account={account} users={users} user={user} pins={pins} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="tier"><VendorBillingTab account={account} /></TabsContent>
          <TabsContent value="updates"><VendorUpdatesTab account={account} updates={updates} user={user} onRefresh={refreshDashboard} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}