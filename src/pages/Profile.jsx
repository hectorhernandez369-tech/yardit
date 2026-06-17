import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { User, CreditCard, Loader2, AlertTriangle, Store, CheckCircle2, Circle } from "lucide-react";

import UserInfoSection from "../components/profile/UserInfoSection";
import ResidentialBillingList from "../components/billing/ResidentialBillingList";
import { getTransactionListingId, isResidentialTransaction } from "@/components/billing/residentialBillingUtils";
import ProfileCoinsSummary from "../components/profile/ProfileCoinsSummary";
import MyCoinsPanel from "../components/jth/MyCoinsPanel";
import SavedListingsTab from "../components/profile/SavedListingsTab";
import { Bookmark } from "lucide-react";
import { getTrustStatus } from "@/lib/trustActions";
import { getUserVendorAccounts } from "@/lib/getUserVendorAccounts";
import { getProfileCompletionPercent, isAccountSetupComplete } from "@/lib/accountSetup";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [addressEditSignal, setAddressEditSignal] = useState(0);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [hasVendorAccount, setHasVendorAccount] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const vendorAccounts = await getUserVendorAccounts(currentUser);
        setHasVendorAccount(vendorAccounts.length > 0);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  const { data: userListings = [], isLoading: isLoadingListings } = useQuery({
    queryKey: ["userPaymentListings", user?.id],
    queryFn: () => base44.entities.Listing.filter({ ownerUserId: user.id }, "-created_date"),
    enabled: !!user?.id,
    initialData: [],
  });

  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ["userResidentialPaymentTransactions", user?.id, userListings.length],
    queryFn: async () => {
      const transactions = await base44.entities.PaymentTransaction.list("-created_date", 200);
      const listingIds = new Set(userListings.map((listing) => listing.id).filter(Boolean));
      const sessionIds = new Set(userListings.map((listing) => listing.stripe_checkout_session_id).filter(Boolean));
      const paymentIntentIds = new Set(userListings.map((listing) => listing.stripe_payment_intent_id).filter(Boolean));
      const completedSessions = new Set(
        transactions
          .filter((tx) => tx.event_type !== "checkout.session.created" && tx.stripe_checkout_session_id)
          .map((tx) => tx.stripe_checkout_session_id)
      );
      const seenKeys = new Set();

      return transactions
        .filter(isResidentialTransaction)
        .filter((tx) => {
          if (tx.event_type === "checkout.session.created" && completedSessions.has(tx.stripe_checkout_session_id)) return false;
          const listingId = getTransactionListingId(tx);
          return tx.user_id === user.id || tx.user_email === user.email || listingIds.has(listingId) || sessionIds.has(tx.stripe_checkout_session_id) || paymentIntentIds.has(tx.stripe_payment_intent_id);
        })
        .filter((tx) => {
          const key = tx.stripe_payment_intent_id || tx.stripe_checkout_session_id || tx.id;
          if (seenKeys.has(key)) return false;
          seenKeys.add(key);
          return true;
        })
        .sort((a, b) => new Date(b.processed_at || b.received_at || b.created_date || 0) - new Date(a.processed_at || a.received_at || a.created_date || 0));
    },
    enabled: !!user?.id,
    initialData: [],
  });

  const { data: myCoinStats = null } = useQuery({
    queryKey: ["myJthCoinStats", user?.id],
    queryFn: async () => {
      const rows = await base44.entities.JTHUserCoinStats.filter({ user_id: user.id });
      return rows[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: myCoinHistory = [] } = useQuery({
    queryKey: ["myJthCoinHistory", user?.id],
    queryFn: () => base44.entities.JTHCoinEvent.filter({ collected_by_user_id: user.id }, "-collected_timestamp"),
    enabled: !!user?.id,
    initialData: [],
  });

  const trustStatus = getTrustStatus(user);
  const accountSetupComplete = isAccountSetupComplete(user);
  const profileCompletionPercent = getProfileCompletionPercent(user);

  if (isLoadingUser) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Please log in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8 bg-gradient-to-br from-orange-50 via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "User"}</h1>
              <p className="text-gray-600">{user.email}</p>
            </div>
            <Button
              onClick={() => navigate(hasVendorAccount ? "/VendorDashboard" : "/VendorAccountIntro")}
              className="hidden sm:inline-flex bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-semibold"
            >
              <Store className="w-4 h-4" />
              {hasVendorAccount ? "Open Vendor Dashboard" : "Open Vendor Account"}
            </Button>

            </div>
            </div>

        <Card className="mb-6 border-green-200 bg-white/90 shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className={`w-5 h-5 ${accountSetupComplete ? "text-green-600" : "text-slate-400"}`} />
              <p className="font-semibold text-[#2C4F4E]">
                Account Setup {accountSetupComplete ? "Complete ✓" : "Incomplete"}
              </p>
            </div>
            <div className="text-sm font-medium text-slate-700">
              Profile Completion: {profileCompletionPercent}%
            </div>
          </CardContent>
        </Card>

        {!trustStatus.addressVerified || !trustStatus.listingRulesAccepted || !trustStatus.emailVerified ? (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-900">Complete your profile to start posting listings.</p>
                  <p className="text-sm text-orange-800">You can keep browsing now. Yardit will ask for these only when you create a listing or use another trusted action.</p>
                </div>
              </div>
              <div className="grid gap-2 text-sm text-orange-900">
                <div className="flex items-center gap-2">{trustStatus.emailVerified ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4" />} Verified email</div>
                <div className="flex items-center gap-2">{trustStatus.addressVerified ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4" />} Verified primary address</div>
                <div className="flex items-center gap-2">{trustStatus.listingRulesAccepted ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4" />} Listing rules agreement</div>
              </div>
              <Button onClick={() => setAddressEditSignal((value) => value + 1)} className="bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-semibold">
                Complete Profile
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Button
          onClick={() => navigate(hasVendorAccount ? "/VendorDashboard" : "/VendorAccountIntro")}
          className="sm:hidden mb-6 w-full bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-semibold"
        >
          <Store className="w-4 h-4" />
          {hasVendorAccount ? "Open Vendor Dashboard" : "Open Vendor Account"}
        </Button>

        {/* Tabs */}
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-3xl">
            <TabsTrigger value="info" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Info</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Bookmark className="w-4 h-4" />
              <span className="hidden sm:inline">Saved</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2 text-xs sm:text-sm">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
              <span className="ml-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">
                {payments.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="coins" className="gap-2">
              <span>🪙</span>
              <span className="hidden sm:inline">My Coins</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <UserInfoSection user={user} setUser={setUser} addressEditSignal={addressEditSignal} />
          </TabsContent>

          <TabsContent value="saved">
            <SavedListingsTab user={user} />
          </TabsContent>

          <TabsContent value="payments">
            <ResidentialBillingList
              transactions={payments}
              listings={userListings}
              isLoading={isLoadingPayments || isLoadingListings}
              variant="profile"
              emptyMessage="Your residential payment history will appear here after you create a paid listing."
            />
          </TabsContent>

          <TabsContent value="coins" className="space-y-6">
            <ProfileCoinsSummary stats={myCoinStats} />
            <MyCoinsPanel stats={myCoinStats} history={myCoinHistory} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}