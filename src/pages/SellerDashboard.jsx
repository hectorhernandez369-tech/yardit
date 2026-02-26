import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, TrendingUp, Loader2, MapPin } from "lucide-react";
import LocationCheckInStats from "../components/dashboard/LocationCheckInStats";
import EditLocationModal from "../components/profile/EditLocationModal";

export default function SellerDashboard() {
  const [user, setUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [editingLocation, setEditingLocation] = useState(null);

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

  const { data: eoEvents, isLoading: isLoadingEvents } = useQuery({
    queryKey: ["eoEvents", user?.id],
    queryFn: () => base44.entities.NeighborhoodEvent.filter({ eo_user_id: user?.id }),
    enabled: !!user?.id,
    initialData: [],
  });

  const { data: joinRequests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ["joinRequests"],
    queryFn: () => base44.entities.JoinRequest.filter({ status: "pending" }),
    initialData: [],
  });

  const { data: eventListings } = useQuery({
    queryKey: ["eventListings"],
    queryFn: () => base44.entities.Listing.list(),
    initialData: [],
  });

  const { data: allCheckIns, isLoading: isLoadingCheckIns } = useQuery({
    queryKey: ["allCheckIns"],
    queryFn: () => base44.entities.CheckIn.list(),
    initialData: [],
  });

  const activeLocations = userLocations.filter(loc => {
    const isExpired = loc.expires_at && new Date(loc.expires_at) < new Date();
    return loc.active && !isExpired;
  });

  const totalCheckIns = allCheckIns.filter(checkIn => 
    userLocations.some(loc => loc.id === checkIn.location_id)
  ).length;

  if (isLoadingUser) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Please log in to view your dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8 bg-gradient-to-br from-orange-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
              <p className="text-gray-600">Track your listings and visitor engagement</p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Listings</p>
                    <p className="text-3xl font-bold text-gray-900">{activeLocations.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Check-ins</p>
                    <p className="text-3xl font-bold text-gray-900">{totalCheckIns}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg. Check-ins/Location</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {activeLocations.length > 0 ? (totalCheckIns / activeLocations.length).toFixed(1) : 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Locations with Stats */}
        {isLoadingLocations || isLoadingCheckIns ? (
          <Card className="border-0 shadow-xl">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
              <p className="text-gray-600">Loading location data...</p>
            </CardContent>
          </Card>
        ) : activeLocations.length === 0 ? (
          <Card className="border-0 shadow-xl">
            <CardContent className="p-12 text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Active Listings</h3>
              <p className="text-gray-500 mb-4">Add a location to start tracking check-ins!</p>
              <Button
                onClick={() => (window.location.href = "/add-location")}
                className="bg-gradient-to-r from-orange-500 to-purple-600"
              >
                Add Location
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {activeLocations.map((location) => (
              <LocationCheckInStats
                key={location.id}
                location={location}
                checkIns={allCheckIns.filter(c => c.location_id === location.id)}
                onEdit={() => setEditingLocation(location)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditLocationModal
        location={editingLocation}
        open={!!editingLocation}
        onClose={() => setEditingLocation(null)}
      />
    </div>
  );
}