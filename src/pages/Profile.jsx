import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, MapPin, CreditCard, Loader2 } from "lucide-react";

import UserInfoSection from "../components/profile/UserInfoSection";
import LocationsHistory from "../components/profile/LocationsHistory";
import PaymentHistory from "../components/profile/PaymentHistory";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  const { data: userLocations, isLoading: isLoadingLocations } = useQuery({
    queryKey: ["userLocations", user?.email],
    queryFn: () => base44.entities.Location.filter({ created_by: user.email }, "-created_date"),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["userPayments", user?.email],
    queryFn: async () => {
      const allPayments = await base44.entities.Payment.list("-created_date");
      const userLocationIds = userLocations.map(loc => loc.id);
      return allPayments.filter(payment => userLocationIds.includes(payment.location_id));
    },
    enabled: !!user?.email && userLocations.length > 0,
    initialData: [],
  });

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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{user.full_name || "User"}</h1>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="info" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Info</span>
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-2">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Locations</span>
              <span className="ml-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">
                {userLocations.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Payments</span>
              <span className="ml-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">
                {payments.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <UserInfoSection user={user} setUser={setUser} />
          </TabsContent>

          <TabsContent value="locations">
            <LocationsHistory 
              locations={userLocations} 
              isLoading={isLoadingLocations}
            />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentHistory 
              payments={payments}
              locations={userLocations}
              isLoading={isLoadingPayments}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}