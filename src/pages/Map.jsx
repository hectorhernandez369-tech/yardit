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

  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings"],
    queryFn: () => base44.entities.Listing.list("-created_date"),
    initialData: [],
  });

  // Focus on a specific listing from URL param
  const focusListing = useMemo(() => {
    if (!focusListingId || listings.length === 0) return null;
    return listings.find(l => l.id === focusListingId) || null;
  }, [focusListingId, listings]);

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

  const eligibleListings = useMemo(() => {
    const now = new Date();
    
    return listings.filter((listing) => {
      // Must have valid numeric coordinates
      if (typeof listing.lat !== "number" || typeof listing.lng !== "number") return false;
      if (!isFinite(listing.lat) || !isFinite(listing.lng)) return false;
      
      // Status check
      if (listing.status !== "active") return false;

      // Time window: startDateTime <= now <= endDateTime
      const start = new Date(listing.startDateTime);
      const end = new Date(listing.endDateTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
      if (start > now || end < now) return false;

      // Search filter
      const matchesSearch =
        !searchQuery ||
        listing.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.addressText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.city?.toLowerCase().includes(searchQuery.toLowerCase());

      // Type filter
      const matchesFilter = filter === "all" || listing.listingType === filter;
      
      return matchesFilter && matchesSearch;
    });
  }, [listings, filter, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: eligibleListings.length,
      yard_sale: eligibleListings.filter((l) => l.listingType === "yard_sale").length,
      neighborhood_sale: eligibleListings.filter((l) => l.listingType === "neighborhood_sale").length,
    };
  }, [eligibleListings]);

  // Reset filter if type no longer applies
  useEffect(() => {
    if (filter !== "all" && filter !== "yard_sale" && filter !== "neighborhood_sale") {
      setFilter("all");
    }
  }, [filter]);

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

  const routeCoordinates = routeActive ? optimizedRoute.map(loc => [loc.lat, loc.lng]) : [];

  // Determine which listings show as individual pins vs go into clusters
  const { visiblePins, clusterPts, fallbackActive } = useMemo(() => {
    const pins = [];
    const cPoints = [];
    eligibleListings.forEach(listing => {
      if (shouldShowAsPin(currentZoom, listing.tier)) {
        pins.push(listing);
      } else {
        cPoints.push({ lat: listing.lat, lng: listing.lng, id: listing.id });
      }
    });

    // Fallback: if eligible > 0 but no pins AND zoom >= 11, force premium+ pins
    let fallback = false;
    if (pins.length === 0 && eligibleListings.length > 0 && currentZoom >= 11) {
      console.log("fallback: forcing premium pins visible");
      fallback = true;
      eligibleListings.forEach(listing => {
        if (listing.tier === "premium" || listing.tier === "neighborhood_tier") {
          if (!pins.find(p => p.id === listing.id)) {
            pins.push(listing);
            const idx = cPoints.findIndex(p => p.id === listing.id);
            if (idx !== -1) cPoints.splice(idx, 1);
          }
        }
      });
    }

    return { visiblePins: pins, clusterPts: cPoints, fallbackActive: fallback };
  }, [eligibleListings, currentZoom]);

  // Auto-open popup for focused listing once markers render
  useEffect(() => {
    if (!focusListing) return;
    if (markerRefsMap.current[focusListing.id]) {
      setTimeout(() => {
        markerRefsMap.current[focusListing.id]?.openPopup();
      }, 600);
    }
  }, [focusListing, visiblePins]);

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
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="all" className="gap-1">
                      <MapPin className="w-3 h-3" />
                      All ({stats.total})
                    </TabsTrigger>
                    <TabsTrigger value="yard_sale" className="gap-1">
                      <ShoppingBag className="w-3 h-3" />
                      Sales ({stats.yard_sale})
                    </TabsTrigger>
                    <TabsTrigger value="neighborhood_sale" className="gap-1">
                      <Users className="w-3 h-3" />
                      Neighborhood ({stats.neighborhood_sale})
                    </TabsTrigger>
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
          <ClusterGroup points={clusterPts} clusterRadius={50} minPoints={2} />

          {/* Route Line */}
          {routeActive && routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
              color="#2563eb"
              weight={4}
              opacity={0.7}
            />
          )}

          {visiblePins.map((listing) => {
            const isSelected = selectedLocations.some(loc => loc.id === listing.id);
            const routeIndex = optimizedRoute.findIndex(loc => loc.id === listing.id);
            
            return (
              <Marker
                key={listing.id}
                ref={(ref) => { if (ref) markerRefsMap.current[listing.id] = ref; }}
                position={[listing.lat, listing.lng]}
                icon={createIcon(listing.listingType, listing.tier, isSelected, listing)}
                eventHandlers={{
                  click: () => {
                    handleLocationSelect(listing);
                  }
                }}
              >
                <Popup>
                  <div className="p-2">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge className={listing.listingType === "neighborhood_sale" ? "bg-blue-600" : "bg-orange-500"}>
                        {listing.listingType === "neighborhood_sale" ? "🏘️ Neighborhood Sale" : "🏡 Yard Sale"}
                      </Badge>
                      <Badge variant="outline" className="capitalize">{listing.tier}</Badge>
                      {isSelected && routeActive && (
                        <Badge className="bg-blue-600">Stop #{routeIndex + 1}</Badge>
                      )}
                    </div>

                    <h3 className="font-bold text-base mb-1">{listing.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{listing.addressText}</p>

                    {listing.description && (
                      <p className="text-sm mb-2">{listing.description}</p>
                    )}
                    
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(listing.startDateTime), "MMM d, h:mm a")} — {format(new Date(listing.endDateTime), "MMM d, h:mm a")}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <User className="w-3 h-3" />
                        Added by {listing.created_by?.split("@")[0] || "Anonymous"}
                      </div>
                      <div className="flex gap-2">
                        <CheckInButton locationId={listing.id} />
                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLocationSelect(listing);
                          }}
                          className="gap-1"
                        >
                          {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {isSelected ? "Selected" : "Add"}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h4 className="font-semibold text-sm mb-2">Reviews</h4>
                      <ReviewsList locationId={listing.id} />
                      <div className="mt-3">
                        <ReviewForm locationId={listing.id} />
                      </div>
                    </div>
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
          dbCount={listings.length}
          eligibleCount={eligibleListings.length}
          pinCount={visiblePins.length}
          clusterCount={clusterPts.length}
          fallback={fallbackActive}
          firstRow={listings.length > 0 ? (() => {
            const row = listings[0];
            const now = new Date();
            const start = new Date(row.startDateTime);
            const end = new Date(row.endDateTime);
            return {
              nowISO: now.toISOString(),
              id: row.id,
              status: row.status || "(none)",
              startAt: row.startDateTime || "(none)",
              endAt: row.endDateTime || "(none)",
              tier: row.tier || "(none)",
              timeOk: start <= now && end >= now,
            };
          })() : null}
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
                {eligibleListings.length} Listing{eligibleListings.length !== 1 ? "s" : ""} Found
              </h3>
              {eligibleListings.slice(0, 5).map((listing) => (
                <button
                  key={listing.id}
                  onClick={() => setMapCenter([listing.lat, listing.lng])}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="text-lg">
                      {listing.listingType === "neighborhood_sale" ? "🏘️" : "🏡"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{listing.title}</p>
                      <p className="text-xs text-gray-500 truncate">{listing.addressText}</p>
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