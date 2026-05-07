import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Bell, Loader2, Store, MapPin, CreditCard, Users, MessageSquare, Navigation } from "lucide-react";
import BusinessHero from "@/components/vendor/BusinessHero";
import MyTrucksSection from "@/components/vendor/MyTrucksSection";
import VendorBillingTab from "@/components/vendor/VendorBillingTab";
import VendorUsersTab from "@/components/vendor/VendorUsersTab";
import VendorPinStatusBar from "@/components/vendor/VendorPinStatusBar";
import VendorBusinessPage from "@/components/vendor/VendorBusinessPage";
import VendorPinHistoryTab from "@/components/vendor/VendorPinHistoryTab";

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
    id: account.id,
    business_name: account.business_name,
    logo_url: account.business_logo,
    tier: account.vendor_tier,
    category: account.business_category,
    description: account.description,
    phone: account.phone,
    location: account.location || account.service_area || account.city || account.address,
    hero_background_color: account.hero_background_color,
  };
  const activeCheckIn = checkIns.find((item) => item.status === "live" && new Date(item.checkin_end_time) > new Date());

  return (
    <div className="w-full min-h-screen bg-[#FBFAF7]">
      <Tabs defaultValue="profile" className="space-y-0">
        <div className="bg-[#5DADA5] text-white">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <ArrowLeft className="h-5 w-5 mt-1 text-white/80" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20"><MapPin className="h-5 w-5" /></span>
                    <h1 className="font-bold text-lg">Yardit Vendors</h1>
                  </div>
                  <p className="mt-2 text-sm text-white/75">Run your sales. Show your location. Be found.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15"><Navigation className="h-5 w-5" /></span>
                <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15"><Bell className="h-5 w-5" /><span className="absolute -top-1 -right-1 rounded-full bg-[#F4A849] px-1.5 text-[10px] font-bold text-white">2</span></span>
              </div>
            </div>

            <TabsList className="mt-6 grid w-full grid-cols-2 md:grid-cols-5 bg-transparent p-0 h-auto justify-start rounded-none">
              <TabsTrigger value="profile" className="rounded-t-2xl rounded-b-none px-4 py-3 text-white/80 data-[state=active]:bg-[#FBFAF7] data-[state=active]:text-[#5DADA5] data-[state=active]:shadow-none">My Page</TabsTrigger>
              <TabsTrigger value="pins" className="rounded-t-2xl rounded-b-none px-4 py-3 text-white/80 data-[state=active]:bg-[#FBFAF7] data-[state=active]:text-[#5DADA5] data-[state=active]:shadow-none">My Trucks / Pins</TabsTrigger>
              <TabsTrigger value="history" className="rounded-t-2xl rounded-b-none px-4 py-3 text-white/80 data-[state=active]:bg-[#FBFAF7] data-[state=active]:text-[#5DADA5] data-[state=active]:shadow-none">History</TabsTrigger>
              <TabsTrigger value="tier" className="rounded-t-2xl rounded-b-none px-4 py-3 text-white/80 data-[state=active]:bg-[#FBFAF7] data-[state=active]:text-[#5DADA5] data-[state=active]:shadow-none">Tier</TabsTrigger>
              <TabsTrigger value="users" className="rounded-t-2xl rounded-b-none px-4 py-3 text-white/80 data-[state=active]:bg-[#FBFAF7] data-[state=active]:text-[#5DADA5] data-[state=active]:shadow-none">Authorized Users & Pins</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
          <BusinessHero profile={heroProfile} activeCheckIn={activeCheckIn} onRefresh={refreshDashboard} />

          <VendorPinStatusBar pins={pins} checkIns={checkIns} />

          <TabsContent value="profile"><VendorBusinessPage account={account} pins={pins} checkIns={checkIns} updates={updates} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="pins"><MyTrucksSection vendorAccount={account} currentUser={user} /></TabsContent>
          <TabsContent value="users"><VendorUsersTab account={account} users={users} user={user} pins={pins} onRefresh={refreshDashboard} /></TabsContent>
          <TabsContent value="tier"><VendorBillingTab account={account} /></TabsContent>
          <TabsContent value="history"><VendorPinHistoryTab pins={pins} checkIns={checkIns} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}