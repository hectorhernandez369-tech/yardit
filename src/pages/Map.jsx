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
import { MapPin, Calendar, User, Search, ShoppingBag, Plus, Check, Users, Star, Crosshair, Loader2, SlidersHorizontal, X } from "lucide-react";
import { format } from "date-fns";
import RouteBuilder from "../components/map/RouteBuilder";
import CheckInButton from "../components/map/CheckInButton";

import { toast } from "sonner";
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
function isPreActivated(listing) {
  if (!listing.startDateTime) return false;
  return new Date(listing.startDateTime) > new Date();
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
      const dist = calculateDistance(currentLat, currentLng, loc.lat, loc.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = index;
      }
    });

    const nearest = unvisited.splice(nearestIndex, 1)[0];
    route.push(nearest);
    currentLat = nearest.lat;
    currentLng = nearest.lng;
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
  const [showControls, setShowControls] = useState(false);
  const controlsPanelRef = useRef(null);
  const controlsBtnRef = useRef(null);
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

  // Debug overlay auto-hide
  const debugForceOn = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("debug") === "true";
  }, []);
  const [debugVisible, setDebugVisible] = useState(true);
  const [debugPinned, setDebugPinned] = useState(debugForceOn);
  const debugTimerRef = useRef(null);

  useEffect(() => {
    if (debugPinned || debugForceOn) return;
    if (!debugVisible) return;
    debugTimerRef.current = setTimeout(() => setDebugVisible(false), 8000);
    return () => clearTimeout(debugTimerRef.current);
  }, [debugVisible, debugPinned, debugForceOn]);

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

  // Close controls when tapping outside
  useEffect(() => {
    if (!showControls) return;
    const handleClick = (e) => {
      if (
        controlsPanelRef.current && !controlsPanelRef.current.contains(e.target) &&
        controlsBtnRef.current && !controlsBtnRef.current.contains(e.target)
      ) {
        setShowControls(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showControls]);

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
      setMapCenter([optimized[0].lat, optimized[0].lng]);
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

  // Open popup ONCE for ?listingId focus, then mark handled
  const hasHandledInitialFocus = useRef(false);
  useEffect(() => {
    if (!focusListing) return;
    if (hasHandledInitialFocus.current) return;
    const ref = markerRefsMap.current[focusListing.id];
    if (ref) {
      ref.openPopup();
      hasHandledInitialFocus.current = true;
    }
  }, [focusListing, visiblePins]);

  return (
    <div className="h-[calc(100vh-140px)] relative">
      {/* Floating Filter FAB */}
      <button
        ref={controlsBtnRef}
        onClick={() => setShowControls(prev => !prev)}
        className="absolute top-20 right-3 z-[1002] w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-all duration-200 border border-gray-200"
      >
        {showControls ? <X className="w-5 h-5" /> : <SlidersHorizontal className="w-5 h-5" />}
      </button>

      {/* Backdrop */}
      {showControls && (
        <div className="absolute inset-0 z-[999] bg-black/10 backdrop-blur-[2px] transition-opacity duration-200" />
      )}

      {/* Controls Panel */}
      <div
        ref={controlsPanelRef}
        className="absolute top-4 left-4 right-16 z-[1001] transition-all duration-[220ms] ease-out origin-top"
        style={{
          opacity: showControls ? 1 : 0,
          transform: showControls ? "translateY(0) scaleY(1)" : "translateY(-12px) scaleY(0.95)",
          pointerEvents: showControls ? "auto" : "none",
        }}
      >
        <div className="max-w-4xl mx-auto space-y-3">
          <Card className="bg-white/95 backdrop-blur-md shadow-xl border-0 rounded-2xl overflow-hidden">
            <div className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
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
                      Hood ({stats.neighborhood_sale})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
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

      {/* Map */}
      <div className="h-full w-full">
        <MapContainer
          center={mapCenter}
          zoom={13}
          className="h-full w-full"
          zoomControl={false}
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
                <Popup maxWidth={280} maxHeight={320}>
                  <div className="p-1.5" style={{ maxHeight: "60vh", overflowY: "auto" }}>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      <Badge className={`text-[10px] px-1.5 py-0.5 ${listing.listingType === "neighborhood_sale" ? "bg-blue-600" : "bg-orange-500"}`}>
                        {listing.listingType === "neighborhood_sale" ? "🏘️ Neighborhood" : "🏡 Yard Sale"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 capitalize">{listing.tier}</Badge>
                      {isSelected && routeActive && (
                        <Badge className="text-[10px] px-1.5 py-0.5 bg-blue-600">Stop #{routeIndex + 1}</Badge>
                      )}
                    </div>

                    <h3 className="font-bold text-sm leading-tight mb-0.5">{listing.title}</h3>
                    <p className="text-xs text-gray-600 mb-1">{listing.addressText}</p>

                    {listing.description && (
                      <p className="text-xs text-gray-500 mb-1 line-clamp-2">{listing.description}</p>
                    )}

                    <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-1.5">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {format(new Date(listing.startDateTime), "MMM d, h:mm a")} — {format(new Date(listing.endDateTime), "MMM d, h:mm a")}
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <User className="w-3 h-3" />
                        {listing.created_by?.split("@")[0] || "Anonymous"}
                      </div>
                      <div className="flex gap-1.5">
                        <CheckInButton locationId={listing.id} />
                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLocationSelect(listing);
                          }}
                          className="gap-1 h-7 text-xs px-2"
                        >
                          {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {isSelected ? "Added" : "Add"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Zoom + My Location stack */}
        <div className="absolute top-3 left-3 z-[1000] flex flex-col shadow-md rounded-lg overflow-hidden border border-gray-300">
          <button
            onClick={() => { const m = document.querySelector('.leaflet-container'); if (m && m._leaflet_id) { const map = Object.values(window).find(() => false); } }}
            ref={(el) => { if (el) el._zoomIn = true; }}
            className="w-9 h-9 bg-white hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center text-gray-700 text-lg font-bold border-b border-gray-200 transition-colors"
            title="Zoom in"
            onClick={() => {
              const container = document.querySelector('.leaflet-container');
              if (container && container._leaflet_id !== undefined) {
                // Access map via ref instead
              }
            }}
          >
            +
          </button>
          <button
            className="w-9 h-9 bg-white hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center text-gray-700 text-lg font-bold border-b border-gray-200 transition-colors"
            title="Zoom out"
          >
            −
          </button>
          <button
            onClick={handleMyLocation}
            disabled={isLocating || !!locationError}
            className="w-9 h-9 bg-white hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center text-gray-700 disabled:opacity-50 transition-colors"
            title={locationError ? "Location unavailable" : "My Location"}
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Crosshair className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Debug Overlay */}
        <div
          onClick={() => { setDebugPinned(true); clearTimeout(debugTimerRef.current); }}
          className="transition-opacity duration-300"
          style={{ opacity: debugVisible ? 1 : 0, pointerEvents: debugVisible ? "auto" : "none" }}
        >
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
        </div>

        {/* Debug reopen button */}
        {!debugVisible && (
          <button
            onClick={() => { setDebugVisible(true); setDebugPinned(true); }}
            className="absolute bottom-4 left-4 z-[1001] px-2 py-1 rounded bg-black/50 text-green-400 text-[10px] font-mono hover:bg-black/70 transition-colors"
          >
            Debug
          </button>
        )}

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


    </div>
  );
}