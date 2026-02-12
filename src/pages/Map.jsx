import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar, User, Search, Candy, ShoppingBag, ChevronDown, Plus, Check, Users, Star, Crosshair, Loader2 } from "lucide-react";
import { format } from "date-fns";
import RouteBuilder from "../components/map/RouteBuilder";
import CheckInButton from "../components/map/CheckInButton";
import ReviewForm from "../components/reviews/ReviewForm";
import ReviewsList from "../components/reviews/ReviewsList";
import LightRatingForm from "../components/holidays/LightRatingForm";
import ReportForm from "../components/holidays/ReportForm";
import DisplayToggle from "../components/holidays/DisplayToggle";
import { toast } from "sonner";
import { isHolidaySeason, isWithinViewingHours } from "../components/holidays/SeasonCheck";
import ClusterGroup, { shouldShowAsPin } from "../components/map/ClusterGroup";
import MapDebugOverlay from "../components/map/MapDebugOverlay";

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Determine if a listing is pre-activated / upcoming (not yet started)
function isPreActivated(location) {
  if (!location.start_date_time) return false;
  return new Date(location.start_date_time) > new Date();
}

// Build SVG data URL for a pin
function buildPinSvg(fill, stroke, strokeWidth, size, opacity = 1) {
  const w = size;
  const h = Math.round(size * 1.33);
  const path = "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 24 32' opacity='${opacity}'><path d='${path}' fill='${fill}' stroke='${stroke}' stroke-width='${strokeWidth}'/></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

// Pin icon cache to avoid recreating icons every render
const iconCache = {};
function getCachedIcon(key, url, size) {
  if (!iconCache[key]) {
    const w = size;
    const h = Math.round(size * 1.33);
    iconCache[key] = new L.Icon({
      iconUrl: url,
      iconSize: [w, h],
      iconAnchor: [w / 2, h],
      popupAnchor: [0, -h],
    });
  }
  return iconCache[key];
}

// Custom marker icons based on tier
const createIcon = (type, tier, isSelected, location) => {
  const preAct = isPreActivated(location);
  const opacity = preAct ? 0.6 : 1.0;

  // Selected state override
  if (isSelected) {
    const key = `selected_${opacity}`;
    return getCachedIcon(key, buildPinSvg("#F4A849", "#2C4F4E", 2, 40, opacity), 40);
  }

  // Halloween candy - keep purple
  if (type === "halloween_candy") {
    const key = `halloween_${opacity}`;
    return getCachedIcon(key, buildPinSvg("#9333ea", "#ffffff", 2, 36, opacity), 36);
  }

  // Holiday lights
  if (type === "holiday_lights") {
    const isGlowing = location &&
      location.display_active &&
      isWithinViewingHours(location.viewing_start_time, location.viewing_end_time);
    if (isGlowing) {
      const key = `lights_glow_${opacity}`;
      return getCachedIcon(key, buildPinSvg("#ffd700", "#dc2626", 2, 40, opacity), 40);
    }
    const key = `lights_${opacity}`;
    return getCachedIcon(key, buildPinSvg("#dc2626", "#ffffff", 2, 36, opacity), 36);
  }

  // Tier-based styles
  // PREMIUM: fill #5DADA5, stroke #F4A849, size 40
  if (tier === "premium") {
    const key = `premium_${opacity}`;
    return getCachedIcon(key, buildPinSvg("#5DADA5", "#F4A849", 2, 40, opacity), 40);
  }

  // NEIGHBORHOOD_EVENT (HQ): fill #F4A849, stroke #2C4F4E, size 40
  if (tier === "neighborhood_event") {
    const key = `hq_${opacity}`;
    return getCachedIcon(key, buildPinSvg("#F4A849", "#2C4F4E", 2, 40, opacity), 40);
  }

  // FEATURED / MAP_PIN (paid): fill #5DADA5, stroke #2C4F4E, size 36
  if (tier === "featured" || tier === "map_pin") {
    const key = `featured_${opacity}`;
    return getCachedIcon(key, buildPinSvg("#5DADA5", "#2C4F4E", 2, 36, opacity), 36);
  }

  // FREE: fill #6b7280, stroke #4b5563, size 36
  const key = `free_${opacity}`;
  return getCachedIcon(key, buildPinSvg("#6b7280", "#4b5563", 2, 36, opacity), 36);
};

function MapController({ center, zoom, onUserMove, onZoomChange }) {
  const map = useMap();
  const lastProgrammaticMove = useRef(null);

  useEffect(() => {
    const handleMoveEnd = () => {
      if (lastProgrammaticMove.current && Date.now() - lastProgrammaticMove.current < 1000) {
        return;
      }
      onUserMove();
    };
    const handleZoomEnd = () => {
      onZoomChange(map.getZoom());
    };
    map.on("moveend", handleMoveEnd);
    map.on("zoomend", handleZoomEnd);
    // Fire initial zoom
    onZoomChange(map.getZoom());
    return () => {
      map.off("moveend", handleMoveEnd);
      map.off("zoomend", handleZoomEnd);
    };
  }, [map, onUserMove, onZoomChange]);

  useEffect(() => {
    if (center) {
      lastProgrammaticMove.current = Date.now();
      map.setView(center, zoom || 13);
    }
  }, [center, zoom, map]);
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
  const [mapZoom, setMapZoom] = useState(13);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [routeActive, setRouteActive] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [focusListingId, setFocusListingId] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(13);
  const markerRefsMap = useRef({});
  const hasCenteredOnUser = useRef(false);
  const userHasMovedMap = useRef(false);
  const halloweenActive = isHalloweenSeason();
  const holidaySeasonActive = isHolidaySeason();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();

    // Check for listingId in URL
    const params = new URLSearchParams(window.location.search);
    const lid = params.get("listingId");
    if (lid) {
      setFocusListingId(lid);
    }
  }, []);

  const { data: locations, isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: () => base44.entities.Location.list("-created_date"),
    initialData: [],
  });

  // Also fetch from Listing entity for "Show on Map" from MyListings/ListingDetail
  const { data: focusListing } = useQuery({
    queryKey: ["focusListing", focusListingId],
    queryFn: async () => {
      const results = await base44.entities.Listing.filter({ id: focusListingId });
      return results[0] || null;
    },
    enabled: !!focusListingId,
  });

  // When focusListing loads, center map on it and open its popup
  useEffect(() => {
    if (focusListing && focusListing.lat && focusListing.lng) {
      setMapCenter([focusListing.lat, focusListing.lng]);
      setMapZoom(15);
    } else if (focusListingId && focusListing === null) {
      toast.error("Listing not found.");
    }
  }, [focusListing, focusListingId]);

  const { data: allCheckIns } = useQuery({
    queryKey: ["allCheckIns"],
    queryFn: () => base44.entities.CheckIn.list(),
    initialData: [],
  });

  const { data: allReviews } = useQuery({
    queryKey: ["allReviews"],
    queryFn: () => base44.entities.Review.list(),
    initialData: [],
  });

  // Live location tracking — updates the blue dot only, does NOT recenter
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setUserLocation(newLoc);
        setLocationError(null);

        // Auto-center ONCE on first GPS fix, only if user hasn't moved map
        if (!hasCenteredOnUser.current && !userHasMovedMap.current) {
          setMapCenter([newLoc.lat, newLoc.lng]);
          hasCenteredOnUser.current = true;
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError("Location permission is off. Enable it in settings to use My Location.");
        } else {
          setLocationError("Unable to get location right now.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleMyLocation = () => {
    if (locationError) {
      toast.error("Location unavailable. Check your browser settings.");
      return;
    }

    if (userLocation) {
      // We already have a location — just recenter
      setMapCenter([userLocation.lat, userLocation.lng]);
      setMapZoom(14);
      toast.success("Centered on your location");
      return;
    }

    // No location yet — request one
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setUserLocation(newLocation);
          setMapCenter([newLocation.lat, newLocation.lng]);
          setMapZoom(14);
          setLocationError(null);
          setIsLocating(false);
          toast.success("Centered on your location");
        },
        (error) => {
          setIsLocating(false);
          if (error.code === error.PERMISSION_DENIED) {
            setLocationError("Location permission is off. Enable it in settings to use My Location.");
            toast.error("Location permission denied");
          } else {
            setLocationError("Unable to get location right now.");
            toast.error("Unable to get location");
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const handleUserMoveMap = React.useCallback(() => {
    userHasMovedMap.current = true;
  }, []);

  const handleZoomChange = React.useCallback((z) => {
    setCurrentZoom(z);
  }, []);

  const filteredLocations = useMemo(() => {
    const now = new Date();
    
    return locations.filter((loc) => {
      const isExpired = loc.expires_at && new Date(loc.expires_at) < now;
      if (isExpired) return false;

      // Holiday lights visibility - always show during season regardless of toggle
      if (loc.type === "holiday_lights") {
        if (!holidaySeasonActive || loc.status !== "active") {
          return false;
        }
      }

      const matchesFilter = filter === "all" || loc.type === filter;
      const matchesSearch =
        !searchQuery ||
        loc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.display_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const isValidForSeason = loc.type !== "halloween_candy" || halloweenActive;
      
      return matchesFilter && matchesSearch && loc.active && isValidForSeason;
    });
  }, [locations, filter, searchQuery, halloweenActive, holidaySeasonActive]);

  const stats = useMemo(() => {
    const now = new Date();
    const activeLocations = locations.filter((l) => {
      const isExpired = l.expires_at && new Date(l.expires_at) < now;
      if (l.type === "holiday_lights") {
        return l.active && !isExpired && holidaySeasonActive && l.status === "active";
      }
      return l.active && !isExpired;
    });

    const halloweenLocations = halloweenActive 
      ? activeLocations.filter((l) => l.type === "halloween_candy")
      : [];
    
    const holidayLightsCount = holidaySeasonActive
      ? activeLocations.filter((l) => l.type === "holiday_lights").length
      : 0;
      
    return {
      total: activeLocations.length,
      yard_sale: activeLocations.filter((l) => l.type === "yard_sale").length,
      halloween_candy: halloweenLocations.length,
      holiday_lights: holidayLightsCount,
    };
  }, [locations, halloweenActive, holidaySeasonActive]);

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

  const getLocationRating = (locationId) => {
    const reviews = allReviews.filter(r => r.location_id === locationId);
    if (reviews.length === 0) return null;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return { average: avgRating.toFixed(1), count: reviews.length };
  };

  const routeCoordinates = routeActive ? optimizedRoute.map(loc => [loc.latitude, loc.longitude]) : [];

  // Determine which locations show as individual pins vs go into clusters
  const { visiblePins, clusterPoints } = useMemo(() => {
    const pins = [];
    const cPoints = [];
    filteredLocations.forEach(loc => {
      if (shouldShowAsPin(currentZoom, loc.tier)) {
        pins.push(loc);
      } else {
        cPoints.push({ lat: loc.latitude, lng: loc.longitude, id: loc.id });
      }
    });
    return { visiblePins: pins, clusterPoints: cPoints };
  }, [filteredLocations, currentZoom]);

  // Auto-open popup for focused listing once markers render
  useEffect(() => {
    if (!focusListing) return;
    const matchLoc = filteredLocations.find(
      l => Math.abs(l.latitude - focusListing.lat) < 0.0001 && Math.abs(l.longitude - focusListing.lng) < 0.0001
    );
    if (matchLoc && markerRefsMap.current[matchLoc.id]) {
      setTimeout(() => {
        markerRefsMap.current[matchLoc.id]?.openPopup();
      }, 600);
    }
  }, [focusListing, filteredLocations]);

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
                  <TabsList className={`grid ${halloweenActive && holidaySeasonActive ? "grid-cols-4" : halloweenActive || holidaySeasonActive ? "grid-cols-3" : "grid-cols-2"}`}>
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
                    {holidaySeasonActive && (
                      <TabsTrigger value="holiday_lights" className="gap-1">
                        💡
                        Lights ({stats.holiday_lights})
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
          <MapController center={mapCenter} zoom={mapZoom} onUserMove={handleUserMoveMap} onZoomChange={handleZoomChange} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* User Location Dot */}
          {userLocation && (
            <>
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={userLocation.accuracy || 50}
                pathOptions={{ 
                  fillColor: '#3b82f6', 
                  fillOpacity: 0.1, 
                  color: '#3b82f6', 
                  weight: 1 
                }}
              />
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={8}
                pathOptions={{ 
                  fillColor: '#3b82f6', 
                  fillOpacity: 1, 
                  color: 'white', 
                  weight: 2 
                }}
              />
            </>
          )}
          
          {/* Cluster layer for non-visible-tier points */}
          <ClusterGroup points={clusterPoints} clusterRadius={50} minPoints={2} />

          {/* Route Line */}
          {routeActive && routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
              color="#2563eb"
              weight={4}
              opacity={0.7}
            />
          )}

          {visiblePins.map((location) => {
            const isSelected = selectedLocations.some(loc => loc.id === location.id);
            const routeIndex = optimizedRoute.findIndex(loc => loc.id === location.id);
            const checkInCount = getCheckInCount(location.id);
            const rating = getLocationRating(location.id);
            
            return (
              <Marker
                key={location.id}
                ref={(ref) => { if (ref) markerRefsMap.current[location.id] = ref; }}
                position={[location.latitude, location.longitude]}
                icon={createIcon(location.type, location.tier, isSelected, location)}
                eventHandlers={{
                  click: () => {
                    handleLocationSelect(location);
                    // Track map pin click
                    if (location.tier !== "free" && location.type !== "holiday_lights") {
                      base44.entities.Location.update(location.id, {
                        map_pin_clicks: (location.map_pin_clicks || 0) + 1
                      });
                    }
                  }
                }}
              >
                <Popup>
                  <div className="p-2">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge
                        className={
                          location.type === "yard_sale" ? "bg-orange-500" :
                          location.type === "halloween_candy" ? "bg-purple-600" :
                          "bg-blue-600"
                        }
                      >
                        {location.type === "yard_sale" ? "🏡 Yard Sale" : 
                         location.type === "halloween_candy" ? "🎃 Halloween Candy" :
                         "💡 Holiday Lights"}
                      </Badge>
                      {isSelected && routeActive && (
                        <Badge className="bg-blue-600">Stop #{routeIndex + 1}</Badge>
                      )}
                      {location.safety_warning && (
                        <Badge variant="outline" className="border-orange-500 text-orange-700">
                          ⚠️ Safety Warning
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex gap-2 mb-2">
                      {checkInCount > 0 && (
                        <div className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                          <Users className="w-4 h-4" />
                          {checkInCount}
                        </div>
                      )}
                      {rating && (
                        <div className="flex items-center gap-1 text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                          <Star className="w-4 h-4 fill-yellow-400" />
                          {rating.average} ({rating.count})
                        </div>
                      )}
                    </div>

                    <h3 className="font-bold text-base mb-1">
                      {location.type === "holiday_lights" ? location.display_title : location.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{location.address}</p>

                    {location.type === "holiday_lights" && (
                      <p className="text-xs text-gray-600 mb-2">
                        🕐 Viewing: {location.viewing_start_time} - {location.viewing_end_time}
                      </p>
                    )}
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

                    {location.type === "holiday_lights" ? (
                      <>
                        {user && location.created_by === user.email && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <DisplayToggle location={location} isOwner={true} />
                          </div>
                        )}
                        
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <h4 className="font-semibold text-sm mb-2">Rate This Display</h4>
                          <LightRatingForm locationId={location.id} displayActive={location.display_active} />
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <ReportForm locationId={location.id} />
                        </div>
                      </>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <h4 className="font-semibold text-sm mb-2">Reviews</h4>
                        <ReviewsList locationId={location.id} />
                        <div className="mt-3">
                          <ReviewForm locationId={location.id} />
                        </div>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* My Location Button */}
        <div className="absolute right-4 top-24 z-[1000] flex flex-col gap-2">
          <Button
            onClick={handleMyLocation}
            size="icon"
            disabled={isLocating || !!locationError}
            className="bg-white hover:bg-gray-100 text-gray-700 shadow-lg disabled:opacity-50"
            title={locationError ? "Location unavailable" : "My Location"}
          >
            {isLocating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Crosshair className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Debug Overlay */}
        <MapDebugOverlay
          zoom={currentZoom}
          totalListings={filteredLocations.length}
          pinsRendered={visiblePins.length}
          clusterEnabled={clusterPoints.length > 0}
        />

        {/* Location Error Message */}
        {locationError && (
          <div className="absolute bottom-24 left-4 right-4 z-[1000] sm:left-auto sm:right-4 sm:w-80">
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-3">
                <p className="text-sm text-orange-800">{locationError}</p>
              </CardContent>
            </Card>
          </div>
        )}
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