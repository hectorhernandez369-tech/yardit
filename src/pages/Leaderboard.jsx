import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Star, MapPin, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isHolidaySeason, getCurrentSeasonYear } from "../components/holidays/SeasonCheck";

const MIN_RATINGS = 5;

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3280.84; // Earth's radius in feet
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function LeaderboardPage() {
  const [userLocation, setUserLocation] = useState(null);
  const seasonYear = getCurrentSeasonYear();
  const inSeason = isHolidaySeason();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        }
      );
    }
  }, []);

  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ["holidayLocations"],
    queryFn: () => base44.entities.Location.filter({ type: "holiday_lights" }),
    initialData: [],
  });

  const { data: allRatings, isLoading: ratingsLoading } = useQuery({
    queryKey: ["allLightRatings", seasonYear],
    queryFn: () => base44.entities.LightRating.filter({ season_year: seasonYear }),
    initialData: [],
  });

  const locationsWithStats = useMemo(() => {
    if (!inSeason) return [];
    
    return locations
      .filter(loc => loc.display_active && loc.status === "active")
      .map(loc => {
        const ratings = allRatings.filter(r => r.listing_id === loc.id);
        const ratingsCount = ratings.length;
        
        if (ratingsCount < MIN_RATINGS) return null;
        
        const avgRating = ratings.reduce((sum, r) => sum + r.rating_value, 0) / ratingsCount;
        const holidayScore = ratings.reduce((sum, r) => sum + r.rating_value, 0);
        
        return {
          ...loc,
          ratingsCount,
          avgRating,
          holidayScore,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.holidayScore !== a.holidayScore) return b.holidayScore - a.holidayScore;
        if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
        if (b.ratingsCount !== a.ratingsCount) return b.ratingsCount - a.ratingsCount;
        return new Date(a.created_date) - new Date(b.created_date);
      });
  }, [locations, allRatings, inSeason, seasonYear]);

  const leaderboards = useMemo(() => {
    const boards = {
      neighborhood: [],
      street: [],
      city: [],
      zip: [],
      county: [],
    };

    if (!userLocation || locationsWithStats.length === 0) return boards;

    // Neighborhood (500 ft radius)
    boards.neighborhood = locationsWithStats
      .filter(loc => {
        const dist = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          loc.latitude,
          loc.longitude
        );
        return dist <= 500;
      })
      .slice(0, 3);

    // Street (same street name, same block)
    const streetGroups = {};
    locationsWithStats.forEach(loc => {
      if (!loc.street_name) return;
      const block = Math.floor((loc.street_number || 0) / 100) * 100;
      const key = `${loc.street_name}-${block}`;
      if (!streetGroups[key]) streetGroups[key] = [];
      streetGroups[key].push(loc);
    });
    
    Object.values(streetGroups).forEach(group => {
      if (group.length >= 3) {
        boards.street.push(...group.slice(0, 3));
      }
    });

    // City
    const cityGroups = {};
    locationsWithStats.forEach(loc => {
      if (!loc.city) return;
      if (!cityGroups[loc.city]) cityGroups[loc.city] = [];
      cityGroups[loc.city].push(loc);
    });
    boards.city = Object.values(cityGroups)
      .map(group => group.slice(0, 3))
      .flat();

    // ZIP
    const zipGroups = {};
    locationsWithStats.forEach(loc => {
      if (!loc.zip_code) return;
      if (!zipGroups[loc.zip_code]) zipGroups[loc.zip_code] = [];
      zipGroups[loc.zip_code].push(loc);
    });
    boards.zip = Object.values(zipGroups)
      .map(group => group.slice(0, 3))
      .flat();

    // County
    const countyGroups = {};
    locationsWithStats.forEach(loc => {
      if (!loc.county) return;
      if (!countyGroups[loc.county]) countyGroups[loc.county] = [];
      countyGroups[loc.county].push(loc);
    });
    boards.county = Object.values(countyGroups)
      .map(group => group.slice(0, 3))
      .flat();

    return boards;
  }, [locationsWithStats, userLocation]);

  const LeaderboardCard = ({ listings, title, icon: Icon }) => (
    <Card className="border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {listings.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No displays with {MIN_RATINGS}+ ratings in this area yet
          </p>
        ) : (
          <div className="space-y-4">
            {listings.map((loc, idx) => (
              <div
                key={loc.id}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                  idx === 0
                    ? "border-yellow-400 bg-yellow-50"
                    : idx === 1
                    ? "border-gray-300 bg-gray-50"
                    : "border-orange-300 bg-orange-50"
                }`}
              >
                <div className="text-4xl font-bold">
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{loc.display_title}</h3>
                  <p className="text-sm text-gray-600">{loc.address}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className="bg-purple-600">
                      Score: {loc.holidayScore}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {loc.avgRating.toFixed(1)}
                    </Badge>
                    <Badge variant="outline">
                      {loc.ratingsCount} ratings
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!inSeason) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-2">Holiday Season Leaderboards</h2>
            <p className="text-gray-600">
              Leaderboards are available November 1st–January 2nd
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (locationsLoading || ratingsLoading) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🎄 Holiday Lights Leaderboard 🎄
          </h1>
          <p className="text-gray-600">
            Top displays in your area • Season {seasonYear}
          </p>
        </div>

        <Tabs defaultValue="neighborhood" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="neighborhood">Neighborhood</TabsTrigger>
            <TabsTrigger value="street">Street</TabsTrigger>
            <TabsTrigger value="city">City</TabsTrigger>
            <TabsTrigger value="zip">ZIP</TabsTrigger>
            <TabsTrigger value="county">County</TabsTrigger>
          </TabsList>

          <TabsContent value="neighborhood">
            <LeaderboardCard
              listings={leaderboards.neighborhood}
              title="Neighborhood (500 ft radius)"
              icon={MapPin}
            />
          </TabsContent>

          <TabsContent value="street">
            <LeaderboardCard
              listings={leaderboards.street}
              title="Street Leaders"
              icon={Trophy}
            />
          </TabsContent>

          <TabsContent value="city">
            <LeaderboardCard
              listings={leaderboards.city}
              title="City Leaders"
              icon={Trophy}
            />
          </TabsContent>

          <TabsContent value="zip">
            <LeaderboardCard
              listings={leaderboards.zip}
              title="ZIP Code Leaders"
              icon={Trophy}
            />
          </TabsContent>

          <TabsContent value="county">
            <LeaderboardCard
              listings={leaderboards.county}
              title="County Leaders"
              icon={Trophy}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}