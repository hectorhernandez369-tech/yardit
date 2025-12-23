import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MapView from "../components/home/MapView";
import ListView from "../components/home/ListView";

export default function HomePage() {
  const [view, setView] = useState("map");
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => console.log("Location access denied")
      );
    }
  }, []);

  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings"],
    queryFn: () => base44.entities.Listing.filter({ status: "active" }, "-created_date"),
    initialData: [],
  });

  return (
    <div className="h-[calc(100vh-140px)]">
      <Tabs value={view} onValueChange={setView} className="h-full">
        <div className="bg-white border-b border-slate-200 px-4 py-2">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="map">🗺️ Map View</TabsTrigger>
            <TabsTrigger value="list">📋 List View</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="map" className="h-[calc(100%-60px)] m-0">
          <MapView listings={listings} userLocation={userLocation} />
        </TabsContent>

        <TabsContent value="list" className="h-[calc(100%-60px)] m-0 overflow-auto">
          <ListView listings={listings} userLocation={userLocation} />
        </TabsContent>
      </Tabs>
    </div>
  );
}