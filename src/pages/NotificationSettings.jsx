import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Eye, Loader2 } from "lucide-react";
import SavedNeighborhoods from "../components/notifications/SavedNeighborhoods";
import TrackedListings from "../components/notifications/TrackedListings";

export default function NotificationSettingsPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4">
        <p className="text-gray-600">Please log in to manage notification settings.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8 bg-gradient-to-br from-orange-50 via-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notification Settings</h1>
          <p className="text-gray-600">Manage your saved neighborhoods and tracked listings</p>
        </div>

        <Tabs defaultValue="neighborhoods" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="neighborhoods" className="gap-2">
              <MapPin className="w-4 h-4" />
              Neighborhoods
            </TabsTrigger>
            <TabsTrigger value="tracked" className="gap-2">
              <Eye className="w-4 h-4" />
              Tracked
            </TabsTrigger>
          </TabsList>

          <TabsContent value="neighborhoods">
            <SavedNeighborhoods user={user} />
          </TabsContent>

          <TabsContent value="tracked">
            <TrackedListings user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}