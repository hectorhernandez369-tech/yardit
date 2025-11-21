import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Star, Award } from "lucide-react";
import { getCurrentSeasonYear } from "./SeasonalCheck";

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function extractStreetBlock(address) {
  const match = address.match(/^(\d+)\s+(.+?)(?:,|$)/);
  if (!match) return null;
  
  const number = parseInt(match[1]);
  const streetName = match[2];
  const block = Math.floor(number / 100) * 100;
  
  return { streetName, block };
}

export default function LeaderboardPanel({ currentLocation }) {
  const seasonYear = getCurrentSeasonYear();

  const { data: allLights, isLoading } = useQuery({
    queryKey: ["holidayLights", seasonYear],
    queryFn: async () => {
      const locations = await base44.entities.Location.filter({
        type: "holiday_lights",
        display_active: true,
      });
      return locations.filter(l => (l.ratings_count || 0) >= 5);
    },
    initialData: [],
  });

  const leaderboards = useMemo(() => {
    if (!currentLocation || !allLights.length) return null;

    const sortedByScore = (list) => 
      [...list].sort((a, b) => 
        (b.holiday_score || 0) - (a.holiday_score || 0) ||
        (b.average_rating || 0) - (a.average_rating || 0) ||
        (b.ratings_count || 0) - (a.ratings_count || 0) ||
        new Date(a.created_date) - new Date(b.created_date)
      ).slice(0, 3);

    // Street leaderboard
    const currentBlock = extractStreetBlock(currentLocation.address);
    const streetList = currentBlock ? allLights.filter(l => {
      const block = extractStreetBlock(l.address);
      return block && 
        block.streetName.toLowerCase() === currentBlock.streetName.toLowerCase() &&
        block.block === currentBlock.block;
    }) : [];

    // Neighborhood (500ft radius)
    const neighborhoodList = allLights.filter(l => {
      const dist = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        l.latitude,
        l.longitude
      );
      return dist <= 152.4; // 500 feet in meters
    });

    // City
    const cityList = currentLocation.city 
      ? allLights.filter(l => l.city === currentLocation.city)
      : [];

    // ZIP
    const zipList = currentLocation.zip_code
      ? allLights.filter(l => l.zip_code === currentLocation.zip_code)
      : [];

    // County
    const countyList = currentLocation.county
      ? allLights.filter(l => l.county === currentLocation.county)
      : [];

    return {
      street: sortedByScore(streetList),
      neighborhood: sortedByScore(neighborhoodList),
      city: sortedByScore(cityList),
      zip: sortedByScore(zipList),
      county: sortedByScore(countyList),
    };
  }, [allLights, currentLocation]);

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading leaderboards...</div>;
  }

  if (!leaderboards) {
    return <div className="text-sm text-gray-500">No leaderboard data available</div>;
  }

  const renderLeaderboard = (list, emptyMessage) => {
    if (list.length === 0) {
      return <p className="text-sm text-gray-500 text-center py-4">{emptyMessage}</p>;
    }

    return (
      <div className="space-y-3">
        {list.map((location, idx) => (
          <div
            key={location.id}
            className={`p-3 rounded-lg border-2 ${
              idx === 0 ? "bg-yellow-50 border-yellow-400" :
              idx === 1 ? "bg-gray-50 border-gray-400" :
              "bg-orange-50 border-orange-400"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                idx === 0 ? "bg-yellow-400 text-white" :
                idx === 1 ? "bg-gray-400 text-white" :
                "bg-orange-400 text-white"
              }`}>
                {idx === 0 ? <Trophy className="w-5 h-5" /> : <Award className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm truncate">{location.display_title}</h4>
                  <span className="text-lg font-bold text-gray-900">
                    {location.holiday_score || 0}
                  </span>
                </div>
                <p className="text-xs text-gray-600 truncate">{location.address}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-700">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {(location.average_rating || 0).toFixed(1)}
                  </span>
                  <span>({location.ratings_count || 0} ratings)</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="border-2 border-yellow-400">
      <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          🎄 Leaderboards
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs defaultValue="neighborhood" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="street" className="text-xs">Street</TabsTrigger>
            <TabsTrigger value="neighborhood" className="text-xs">Nearby</TabsTrigger>
            <TabsTrigger value="city" className="text-xs">City</TabsTrigger>
            <TabsTrigger value="zip" className="text-xs">ZIP</TabsTrigger>
            <TabsTrigger value="county" className="text-xs">County</TabsTrigger>
          </TabsList>

          <TabsContent value="street">
            {renderLeaderboard(leaderboards.street, "No displays on this street yet")}
          </TabsContent>

          <TabsContent value="neighborhood">
            {renderLeaderboard(leaderboards.neighborhood, "No displays within 500 feet")}
          </TabsContent>

          <TabsContent value="city">
            {renderLeaderboard(leaderboards.city, "No displays in this city yet")}
          </TabsContent>

          <TabsContent value="zip">
            {renderLeaderboard(leaderboards.zip, "No displays in this ZIP yet")}
          </TabsContent>

          <TabsContent value="county">
            {renderLeaderboard(leaderboards.county, "No displays in this county yet")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}