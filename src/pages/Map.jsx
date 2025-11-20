import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar, User, Search, Candy, ShoppingBag, ChevronDown, Plus, Check, Users } from "lucide-react";
import { format } from "date-fns";
import RouteBuilder from "../components/map/RouteBuilder";
import CheckInButton from "../components/map/CheckInButton";
import { toast } from "sonner";

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom marker icons
const yardSaleIcon = new L.Icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%23f97316' stroke='white' stroke-width='2'/%3E%3Ctext x='16' y='21' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3E$%3C/text%3E%3C/svg%3E",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const halloweenIcon = new L.Icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%239333ea' stroke='white' stroke-width='2'/%3E%3Ctext x='16' y='21' text-anchor='middle' fill='white' font-size='16'%3E%F0%9F%8E%83%3C/text%3E%3C/svg%3E",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const selectedIcon = new L.Icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%232563eb' stroke='white' stroke-width='2'/%3E%3Ctext x='16' y='21' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3E✓%3C/text%3E%3C/svg%3E",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

// Check if current date is within Halloween candy season (Oct 29-31)
function isHalloweenSeason() {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  return month === 9 && day >= 29 && day <= 31;
}

// Calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Nearest neighbor algorithm for route optimization
function optimizeRoute(locations, startLat, startLng) {
  if (locations.length === 0) return [];
  
  const unvisited = [...locations];
  const route = [];
  let currentLat = startLat;
  let currentLng = startLng;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    unvisited.forEach((loc, index) => {
      const dist = calculateDistance(currentLat, currentLng, loc.latitude, loc.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = index;
      }
    });

    const nearest = unvisited.splice(nearestIndex, 1)[0];
    route.push(nearest);
    currentLat = nearest.latitude;
    currentLng = nearest.longitude;
  }

  return route;
}

export default function MapPage() {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState([37.7749, -122.4194]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [routeActive, setRouteActive] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const halloweenActive = isHalloweenSeason();

  const { data: locations, isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: () => base44.entities.Location.list("-created_date"),
    initialData: [],
  });

  const { data: allCheckIns } = useQuery({
    queryKey: ["allCheckIns"],
    queryFn: () => base44.entities.CheckIn.list(),
    initialData: [],
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          console.log("Location access denied");
        }
      );
    }
  }, []);

  const filteredLocations = useMemo(() => {
    const now = new Date();
    
    return locations.filter((loc) => {
      const isExpired = loc.expires_at && new Date(loc.expires_at) < now;
      if (isExpired) return false;

      const matchesFilter = filter === "all" || loc.type === filter;
      const matchesSearch =
        !searchQuery ||
        loc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const isValidForSeason = loc.type !== "halloween_candy" || halloweenActive;
      
      return matchesFilter && matchesSearch && loc.active && isValidForSeason;
    });
  }, [locations, filter, searchQuery, halloweenActive]);

  const stats = useMemo(() => {
    const now = new Date();
    const activeLocations = locations.filter((l) => {
      const isExpired = l.expires_at && new Date(l.expires_at) < now;
      return l.active && !isExpired;
    });

    const halloweenLocations = halloweenActive 
      ? activeLocations.filter((l) => l.type === "halloween_candy")
      : [];
      
    return {
      total: halloweenActive 
        ? activeLocations.length
        : activeLocations.filter((l) => l.type !== "halloween_candy").length,
      yard_sale: activeLocations.filter((l) => l.type === "yard_sale").length,
      halloween_candy: halloweenLocations.length,
    };
  }, [locations, halloweenActive]);

  useEffect(() => {
    if (!halloweenActive && filter === "halloween_candy") {
      setFilter("all");
    }
  }, [halloweenActive, filter]);

  const handleLocationSelect = (location) => {
    const isSelected = selectedLocations.some(loc => loc.id === location.id);
    
    if (isSelected) {
      setSelectedLocations(prev => prev.filter(loc => loc.id !== location.id));
    } else {
      setSelectedLocations(prev => [...prev, location]);
    }
    setRouteActive(false);
    setOptimizedRoute([]);
  };

  const handleBuildRoute = () => {
    const optimized = optimizeRoute(selectedLocations, mapCenter[0], mapCenter[1]);
    setOptimizedRoute(optimized);
    setRouteActive(true);
    
    if (optimized.length > 0) {
      setMapCenter([optimized[0].latitude, optimized[0].longitude]);
      toast.success(`Route optimized with ${optimized.length} stops!`);
    }
  };

  const getCheckInCount = (locationId) => {
    return allCheckIns.filter(c => c.location_id === locationId).length;
  };

  const routeCoordinates = routeActive ? optimizedRoute.map(loc => [loc.latitude, loc.longitude]) : [];

  return (
    <div className="h-[calc(100vh-140px)] relative">
      {/* Toggle Button */}
      <Button
        onClick={() => setShowControls(!showControls)}
        size="sm"
        className="absolute top-4 right-4 z-[1001] shadow-lg"
        variant={showControls ? "default" : "secondary"}
      >
        {showControls ? "Hide Controls" : "Show Controls"}
      </Button>

      {/* Stats & Search Bar */}
      {showControls && (
        <div className="absolute top-4 left-4 right-24 z-[1000] pointer-events-none">
          <div className="max-w-4xl mx-auto pointer-events-auto space-y-3">
          <Card className="bg-white/95 backdrop-blur-md shadow-xl border-0">
            <div className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by address or title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Tabs value={filter} onValueChange={setFilter}>
                  <TabsList className={halloweenActive ? "grid grid-cols-3" : "grid grid-cols-2"}>
                    <TabsTrigger value="all" className="gap-1">
                      <MapPin className="w-3 h-3" />
                      All ({stats.total})
                    </TabsTrigger>
                    <TabsTrigger value="yard_sale" className="gap-1">
                      <ShoppingBag className="w-3 h-3" />
                      Sales ({stats.yard_sale})
                    </TabsTrigger>
                    {halloweenActive && (
                      <TabsTrigger value="halloween_candy" className="gap-1">
                        <Candy className="w-3 h-3" />
                        Candy ({stats.halloween_candy})
                      </TabsTrigger>
                    )}
                  </TabsList>
                </Tabs>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="sm:hidden"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSidebar ? "" : "rotate-180"}`} />
                </Button>
              </div>
            </div>
          </Card>

          {/* Route Builder */}
          <RouteBuilder
            selectedLocations={selectedLocations}
            onRemoveLocation={(id) => {
              setSelectedLocations(prev => prev.filter(loc => loc.id !== id));
              setRouteActive(false);
              setOptimizedRoute([]);
            }}
            onClearAll={() => {
              setSelectedLocations([]);
              setRouteActive(false);
              setOptimizedRoute([]);
            }}
            onBuildRoute={handleBuildRoute}
            routeActive={routeActive}
          />
        </div>
        </div>
      )}

      {/* Map */}
      <div className="h-full w-full">
        <MapContainer
          center={mapCenter}
          zoom={13}
          className="h-full w-full"
          zoomControl={true}
        >
          <MapController center={mapCenter} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Route Line */}
          {routeActive && routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
              color="#2563eb"
              weight={4}
              opacity={0.7}
            />
          )}

          {filteredLocations.map((location, index) => {
            const isSelected = selectedLocations.some(loc => loc.id === location.id);
            const routeIndex = optimizedRoute.findIndex(loc => loc.id === location.id);
            const checkInCount = getCheckInCount(location.id);
            
            return (
              <Marker
                key={location.id}
                position={[location.latitude, location.longitude]}
                icon={isSelected ? selectedIcon : (location.type === "yard_sale" ? yardSaleIcon : halloweenIcon)}
                eventHandlers={{
                  click: () => handleLocationSelect(location)
                }}
              >
                <Popup>
                  <div className="p-2">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge
                        className={
                          location.type === "yard_sale"
                            ? "bg-orange-500"
                            : "bg-purple-600"
                        }
                      >
                        {location.type === "yard_sale" ? "🏡 Yard Sale" : "🎃 Halloween Candy"}
                      </Badge>
                      {isSelected && routeActive && (
                        <Badge className="bg-blue-600">Stop #{routeIndex + 1}</Badge>
                      )}
                    </div>
                    
                    {checkInCount > 0 && (
                      <div className="flex items-center gap-1 text-sm text-green-600 mb-2 bg-green-50 px-2 py-1 rounded">
                        <Users className="w-4 h-4" />
                        {checkInCount} {checkInCount === 1 ? "person" : "people"} checked in
                      </div>
                    )}

                    <h3 className="font-bold text-base mb-1">{location.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                    {location.description && (
                      <p className="text-sm mb-2">{location.description}</p>
                    )}
                    {location.date && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(location.date), "MMM d, yyyy")}
                      </div>
                    )}
                    {location.expires_at && (
                      <div className="text-xs text-orange-600 mb-1">
                        Expires: {format(new Date(location.expires_at), "MMM d, yyyy")}
                      </div>
                    )}
                    {location.contact_info && (
                      <div className="text-xs text-gray-600 mb-2">
                        Contact: {location.contact_info}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <User className="w-3 h-3" />
                        Added by {location.created_by?.split("@")[0] || "Anonymous"}
                      </div>
                      <div className="flex gap-2">
                        <CheckInButton locationId={location.id} />
                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLocationSelect(location);
                          }}
                          className="gap-1"
                        >
                          {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {isSelected ? "Selected" : "Add"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Sidebar - Mobile */}
      {showSidebar && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] sm:hidden">
          <Card className="rounded-t-2xl bg-white shadow-2xl max-h-64 overflow-y-auto">
            <div className="p-4 space-y-2">
              <h3 className="font-bold text-sm text-gray-700 mb-3">
                {filteredLocations.length} Location{filteredLocations.length !== 1 ? "s" : ""} Found
              </h3>
              {filteredLocations.slice(0, 5).map((location) => (
                <button
                  key={location.id}
                  onClick={() => setMapCenter([location.latitude, location.longitude])}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="text-lg">
                      {location.type === "yard_sale" ? "🏡" : "🎃"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{location.title}</p>
                      <p className="text-xs text-gray-500 truncate">{location.address}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}