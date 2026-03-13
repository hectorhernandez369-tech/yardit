import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ListView from "../components/home/ListView";
import { isDemoMode } from "../components/shared/DemoMode";

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Calendar, User, Search, ShoppingBag, Plus, Check, Users, Star, Crosshair, Loader2, SlidersHorizontal, X, Map as MapIcon, List } from "lucide-react";
import { format } from "date-fns";
import RouteBuilder from "../components/map/RouteBuilder";
import CheckInButton from "../components/map/CheckInButton";
import { toast } from "sonner";
import ClusterGroup, { shouldShowAsPin } from "../components/map/ClusterGroup";
import ReportModal from "../components/ReportModal";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MapDebugOverlay from "../components/map/MapDebugOverlay";
import MapZoomControl from "../components/map/MapZoomControl";
import MapFocusController from "../components/map/MapFocusController";
import { useHunt, HUNT_ENABLED } from "@/components/hunt/HuntContext";
import HuntMapLayers from "@/components/hunt/HuntMapLayers";
import { calculateTotalDistance } from "@/components/hunt/huntUtils";

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

// Pin icon cache
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

  if (type === "neighborhood_sale") {
    let scale = 1.0;
    const count = location.confirmed_count || 0;
    if (!preAct) {
      if (count >= 20) scale = 2.0;
      else if (count >= 16) scale = 1.75;
      else if (count >= 11) scale = 1.5;
      else if (count >= 5) scale = 1.25;
    }
    const size = Math.round(40 * scale);
    
    if (isSelected) {
      const key = `ns_sel_${size}`;
      return getCachedIcon(key, buildPinSvg("#F4A849", "#2C4F4E", 2, size, 1.0), size);
    }
    if (preAct) {
      const key = `ns_pre_${size}`;
      return getCachedIcon(key, buildPinSvg("#9ca3af", "#4b5563", 2, size, 1.0), size);
    } else {
      const key = `ns_act_${size}`;
      return getCachedIcon(key, buildPinSvg("#F4A849", "#2C4F4E", 2, size, 1.0), size);
    }
  }

  if (isSelected) {
    const key = `selected_${opacity}`;
    return getCachedIcon(key, buildPinSvg("#F4A849", "#2C4F4E", 2, 40, opacity), 40);
  }

  if (type === "halloween_candy") {
    const key = `halloween_${opacity}`;
    return getCachedIcon(key, buildPinSvg("#9333ea", "#ffffff", 2, 36, opacity), 36);
  }

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

  if (tier === "premium") {
    const key = `premium_${opacity}`;
    return getCachedIcon(key, buildPinSvg("#5DADA5", "#F4A849", 2, 40, opacity), 40);
  }

  if (tier === "neighborhood_event") {
    const key = `hq_${opacity}`;
    return getCachedIcon(key, buildPinSvg("#F4A849", "#2C4F4E", 2, 40, opacity), 40);
  }

  if (tier === "featured" || tier === "map_pin") {
    const key = `featured_${opacity}`;
    return getCachedIcon(key, buildPinSvg("#5DADA5", "#2C4F4E", 2, 36, opacity), 36);
  }

  const key = `free_${opacity}`;
  return getCachedIcon(key, buildPinSvg("#6b7280", "#4b5563", 2, 36, opacity), 36);
};

function MapController({ center, zoom, onUserMove, onZoomChange, onMapReady }) {
  const map = useMap();
  const lastProgrammaticMove = useRef(null);

  useEffect(() => {
    if (onMapReady) onMapReady(map);
  }, [map, onMapReady]);

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

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

function isWithinViewingHours(startTime, endTime) {
  if (!startTime || !endTime) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  
  if (endTotal < startTotal) {
    return currentMinutes >= startTotal || currentMinutes <= endTotal;
  }
  
  return currentMinutes >= startTotal && currentMinutes <= endTotal;
}

const HUNT_BUTTON_STORAGE_KEY = "yardit_hunt_button_position_v1";
const HUNT_BUTTON_SIZE = 70;
const HUNT_BUTTON_MARGIN = 16;

function clampHuntButtonPosition(position, containerRect) {
  const maxX = Math.max(HUNT_BUTTON_MARGIN, containerRect.width - HUNT_BUTTON_SIZE - HUNT_BUTTON_MARGIN);
  const maxY = Math.max(HUNT_BUTTON_MARGIN, containerRect.height - HUNT_BUTTON_SIZE - HUNT_BUTTON_MARGIN);

  return {
    x: Math.min(Math.max(position.x, HUNT_BUTTON_MARGIN), maxX),
    y: Math.min(Math.max(position.y, HUNT_BUTTON_MARGIN), maxY),
  };
}

function getDefaultHuntButtonPosition(containerRect) {
  return clampHuntButtonPosition({
    x: containerRect.width - HUNT_BUTTON_SIZE - HUNT_BUTTON_MARGIN,
    y: 112,
  }, containerRect);
}

export default function HomePage() {
  const navigate = useNavigate();
  const [view, setView] = useState("map");
  const [reportListingId, setReportListingId] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  const huntContext = useHunt() || { 
    huntStops: [], 
    addToHunt: () => {}, 
    removeFromHunt: () => {}, 
    clearHunt: () => {}, 
    updateStopStatus: () => {},
    gpsLocation: null,
    optimizeRoute: () => {}, 
    huntMode: false 
  };
  const { huntStops, addToHunt, updateStopStatus, gpsLocation, huntMode: isHuntActive } = huntContext;

  // --- Full map state (merged from pages/Map) ---
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState([37.7749, -122.4194]);
  const [mapZoom, setMapZoom] = useState(13);
  const [showControls, setShowControls] = useState(false);
  const controlsPanelRef = useRef(null);
  const controlsBtnRef = useRef(null);
  const mapAreaRef = useRef(null);
  const dragStateRef = useRef({
    isPointerDown: false,
    isDragging: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const suppressButtonClickRef = useRef(false);
  const huntButtonPositionRef = useRef({ x: 0, y: 112 });
  const [huntButtonPosition, setHuntButtonPosition] = useState({ x: 0, y: 112 });
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [focusListingId, setFocusListingId] = useState(null);
  const [activeFocusListing, setActiveFocusListing] = useState(null);
  const hasHandledInitialFocus = useRef(false);
  const [currentZoom, setCurrentZoom] = useState(13);
  const markerRefsMap = useRef({});
  const hasCenteredOnUser = useRef(false);
  const userHasMovedMap = useRef(false);
  const mapRef = useRef(null);

  // Debug overlay
  const debugForceOn = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("debug") === "true";
  }, []);
  const [debugVisible, setDebugVisible] = useState(false);
  const [debugPinned, setDebugPinned] = useState(debugForceOn);
  const debugTimerRef = useRef(null);

  const saveHuntButtonPosition = useCallback((position) => {
    localStorage.setItem(HUNT_BUTTON_STORAGE_KEY, JSON.stringify(position));
  }, []);

  useEffect(() => {
    const updatePositionFromBounds = () => {
      if (!mapAreaRef.current) return;
      const rect = mapAreaRef.current.getBoundingClientRect();
      const savedRaw = localStorage.getItem(HUNT_BUTTON_STORAGE_KEY);
      const saved = savedRaw ? JSON.parse(savedRaw) : null;
      const nextPosition = saved ? clampHuntButtonPosition(saved, rect) : getDefaultHuntButtonPosition(rect);
      huntButtonPositionRef.current = nextPosition;
      setHuntButtonPosition(nextPosition);
      if (!saved || nextPosition.x !== saved.x || nextPosition.y !== saved.y) {
        saveHuntButtonPosition(nextPosition);
      }
    };

    updatePositionFromBounds();
    window.addEventListener("resize", updatePositionFromBounds);
    return () => window.removeEventListener("resize", updatePositionFromBounds);
  }, [saveHuntButtonPosition]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      const dragState = dragStateRef.current;
      if (!dragState.isPointerDown || !mapAreaRef.current) return;

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;

      if (!dragState.isDragging && (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6)) {
        dragState.isDragging = true;
        suppressButtonClickRef.current = true;
      }

      if (!dragState.isDragging) return;

      const rect = mapAreaRef.current.getBoundingClientRect();
      const nextPosition = clampHuntButtonPosition({
        x: event.clientX - rect.left - dragState.offsetX,
        y: event.clientY - rect.top - dragState.offsetY,
      }, rect);
      huntButtonPositionRef.current = nextPosition;
      setHuntButtonPosition(nextPosition);
    };

    const handlePointerUp = () => {
      if (dragStateRef.current.isDragging) {
        saveHuntButtonPosition(huntButtonPositionRef.current);
      }
      dragStateRef.current = {
        isPointerDown: false,
        isDragging: false,
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0,
      };
      setTimeout(() => {
        suppressButtonClickRef.current = false;
      }, 0);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [saveHuntButtonPosition]);

  const handleHuntButtonPointerDown = useCallback((event) => {
    if (!controlsBtnRef.current) return;
    const buttonRect = controlsBtnRef.current.getBoundingClientRect();
    dragStateRef.current = {
      isPointerDown: true,
      isDragging: false,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - buttonRect.left,
      offsetY: event.clientY - buttonRect.top,
    };
  }, []);

  const handleHuntButtonClick = useCallback((event) => {
    if (suppressButtonClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    setShowControls((prev) => !prev);
  }, []);

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

    const params = new URLSearchParams(window.location.search);
    const lid = params.get("listingId");
    if (lid) {
      setFocusListingId(lid);
    }
  }, []);

  const [demoOn, setDemoOn] = useState(isDemoMode());
  useEffect(() => {
    const handler = () => setDemoOn(isDemoMode());
    window.addEventListener("demo-mode-change", handler);
    return () => window.removeEventListener("demo-mode-change", handler);
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

  useEffect(() => {
    if (!focusListing) {
      if (focusListingId && listings.length > 0) {
        toast.error("Listing not found.");
      }
      return;
    }
    if (hasHandledInitialFocus.current) return;
    setActiveFocusListing({ listing: focusListing, fromUrl: true });
    hasHandledInitialFocus.current = true;
  }, [focusListing, listings.length]);

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

  // Live location tracking
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
      setMapCenter([userLocation.lat, userLocation.lng]);
      setMapZoom(14);
      toast.success("Centered on your location");
      return;
    }
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
  const demo = demoOn;

  return listings.filter((listing) => {
    if (typeof listing.lat !== "number" || typeof listing.lng !== "number") return false;
    if (!isFinite(listing.lat) || !isFinite(listing.lng)) return false;

    if (listing.listingType === "neighborhood_sale") {
      const confirmedCount = listing.confirmed_count || 0;
      if (confirmedCount < 5 || listing.status !== "activated") return false;

      const start = new Date(listing.startDateTime);
      const end = new Date(listing.endDateTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

      // Hide expired neighborhood sales
      if (now > end) return false;

      // Future neighborhood sales only show if advertising started
      if (now < start && !listing.advertising_started_at) return false;
    } else {
      if (listing.status !== "active") return false;

      const start = new Date(listing.startDateTime);
      const end = new Date(listing.endDateTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

      // In live mode, hide future and expired listings
      if (!demo && (start > now || end < now)) return false;
    }

    const matchesSearch =
      !searchQuery ||
      listing.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.addressText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.city?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filter === "all" || listing.listingType === filter;

    return matchesFilter && matchesSearch;
  });
}, [listings, filter, searchQuery, demoOn]);

const listViewListings = useMemo(() => {
  const now = new Date();
  const demo = demoOn;

  return listings.filter((l) => {
    if (typeof l.lat !== "number" || typeof l.lng !== "number") return false;
    if (!isFinite(l.lat) || !isFinite(l.lng)) return false;

    if (l.listingType === "neighborhood_sale") {
      const confirmedCount = l.confirmed_count || 0;
      if (confirmedCount < 5 || l.status !== "activated") return false;

      const start = new Date(l.startDateTime);
      const end = new Date(l.endDateTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

      // In live mode, hide expired neighborhood sales
      if (!demo && end < now) return false;

      // In live mode, don't show future neighborhood sales unless advertising started
      if (!demo && now < start && !l.advertising_started_at) return false;

      return true;
    }

    if (l.status !== "active") return false;

    const start = new Date(l.startDateTime);
    const end = new Date(l.endDateTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

    // In live mode, hide future and expired listings
    if (!demo && (start > now || end < now)) return false;

    return true;
  });
}, [listings, demoOn]);

const stats = useMemo(() => {
  return {
    total: eligibleListings.length,
    yard_sale: eligibleListings.filter((l) => l.listingType === "yard_sale").length,
    neighborhood_sale: eligibleListings.filter((l) => l.listingType === "neighborhood_sale").length,
  };
}, [eligibleListings]);

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

  const handlePinClick = (listing) => {
    setActiveFocusListing({ listing, fromUrl: false });
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

    let fallback = false;
    if (pins.length === 0 && eligibleListings.length > 0 && currentZoom >= 11) {
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

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col w-full min-w-0">
      {/* Sticky Top Bar */}
      <div className="bg-white border-b border-slate-200 z-[100] flex-shrink-0 flex flex-col w-full">
        {view === "map" && (
          <div className="px-3 pt-2 pb-1">
            <div className="relative w-full max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by address or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        )}

        <div className="px-3 py-1.5 flex items-center justify-center relative">
          <Tabs value={view} onValueChange={setView} className="w-auto flex shrink-0">
            <TabsList className="grid grid-cols-2 h-9 w-32 bg-slate-100 p-1 rounded-md">
              <TabsTrigger value="map" className="py-1 data-[state=active]:bg-white data-[state=active]:text-[#5DADA5] data-[state=active]:shadow-sm rounded-sm flex items-center justify-center">
                <MapIcon className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="list" className="py-1 data-[state=active]:bg-white data-[state=active]:text-[#5DADA5] data-[state=active]:shadow-sm rounded-sm flex items-center justify-center">
                <List className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {view === "map" && (
            <div className="absolute left-1/2 ml-20">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setShowFilterModal(true)}
                className="h-9 w-9 shrink-0 border-slate-200 text-slate-500 bg-white hover:bg-slate-50 rounded-full shadow-sm"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      {view === "list" ? (
        <div className="flex-1 overflow-auto">
          <ListView listings={listViewListings} userLocation={userLocation} />
        </div>
      ) : (
        <div ref={mapAreaRef} className="flex-1 relative min-w-0 w-full">
          {/* Route Builder FAB */}
          <button
            ref={controlsBtnRef}
            onPointerDown={handleHuntButtonPointerDown}
            onClick={handleHuntButtonClick}
            className="absolute z-[1002] w-[70px] h-[70px] flex items-center justify-center active:scale-95 transition-all duration-200 bg-transparent border-none outline-none shadow-none"
            style={{ left: `${huntButtonPosition.x}px`, top: `${huntButtonPosition.y}px`, touchAction: "none" }}
          >
            {showControls ? (
              <X className="w-12 h-12 text-[#2C4F4E]" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
            ) : (
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/cb76cc21e_file_00000000cd1c720ca3ac2dd5471be0aa.png" 
                alt="Open Map" 
                className="w-[70px] h-[70px] object-contain"
                style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}
              />
            )}
          </button>

          {/* Backdrop */}
          {showControls && (
            <div className="absolute inset-0 z-[999] bg-black/10 backdrop-blur-[2px] transition-opacity duration-200" />
          )}

          {/* Controls Panel */}
          <div
            ref={controlsPanelRef}
            className="absolute top-4 left-1/2 -translate-x-1/2 w-[94vw] sm:w-[420px] max-w-[500px] z-[1001] transition-all duration-[220ms] ease-out origin-top"
            style={{
              opacity: showControls ? 1 : 0,
              transform: showControls ? "translateX(-50%) translateY(0) scaleY(1)" : "translateX(-50%) translateY(-12px) scaleY(0.95)",
              pointerEvents: showControls ? "auto" : "none",
            }}
          >
            <div className="max-w-4xl mx-auto space-y-3">
              <RouteBuilder
                selectedLocations={huntStops}
                onRemoveLocation={(id) => {
                  huntContext.removeFromHunt(id);
                }}
                onClearAll={() => {
                  huntContext.clearHunt();
                }}
                onBuildRoute={() => huntContext.optimizeRoute()}
              />
            </div>
          </div>

          {/* Map */}
          <div className="absolute inset-0 w-full h-full m-0 p-0" style={{ transform: "none", left: 0 }}>
            <MapContainer
              center={mapCenter}
              zoom={13}
              className="w-full h-full"
              style={{ width: "100%", height: "100%" }}
              zoomControl={false}
            >
              <MapController center={mapCenter} zoom={mapZoom} onUserMove={handleUserMoveMap} onZoomChange={handleZoomChange} onMapReady={(map) => { mapRef.current = map; }} />
              <MapZoomControl onMyLocation={handleMyLocation} isLocating={isLocating} locationError={locationError} />
              <MapFocusController focusData={activeFocusListing} markerRefsMap={markerRefsMap} onFocusComplete={() => setActiveFocusListing(null)} />
              <HuntMapLayers />
              <TileLayer
                attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA"
                tileSize={512}
                zoomOffset={-1}
              />
              
              {/* User Location Dot */}
              {userLocation && (
                <>
                  <Circle
                    center={[userLocation.lat, userLocation.lng]}
                    radius={userLocation.accuracy || 50}
                    pathOptions={{ fillColor: '#2A93EE', fillOpacity: 0.15, color: '#2A93EE', weight: 1 }}
                  />
                  <CircleMarker
                    center={[userLocation.lat, userLocation.lng]}
                    radius={6}
                    pathOptions={{ fillColor: '#2A93EE', fillOpacity: 1, color: '#ffffff', weight: 2 }}
                  />
                </>
              )}
              
              <ClusterGroup points={clusterPts} clusterRadius={50} minPoints={2} />

              {visiblePins.map((listing) => {
                const isSelected = huntStops.some(loc => loc.id === listing.id);
                const routeIndex = huntStops.findIndex(loc => loc.id === listing.id);
                
                return (
                  <Marker
                    key={listing.id}
                    ref={(ref) => { if (ref) markerRefsMap.current[listing.id] = ref; }}
                    position={[listing.lat, listing.lng]}
                    icon={createIcon(listing.listingType, listing.tier, isSelected, listing)}
                    eventHandlers={{
                      click: () => { handlePinClick(listing); }
                    }}
                  >
                    <Popup maxWidth={420} autoPan={true} autoPanPaddingTopLeft={[10, 10]} autoPanPaddingBottomRight={[10, 10]}>
                      <div className="flex flex-col" style={{ maxWidth: "min(92vw, 420px)", maxHeight: "60vh" }}>
                        {/* Scrollable content */}
                        <div className="p-2 overflow-y-auto flex-1 min-h-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                            <Badge className={`text-[10px] px-1.5 py-0.5 ${listing.listingType === "neighborhood_sale" ? "bg-blue-600" : "bg-orange-500"}`}>
                              {listing.listingType === "neighborhood_sale" ? "🏘️ Neighborhood" : "🏡 Yard Sale"}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 capitalize">{listing.tier}</Badge>
                            {isSelected && (
                              <Badge className="text-[10px] px-1.5 py-0.5 bg-blue-600">Stop #{routeIndex + 1}</Badge>
                            )}
                          </div>

                          <h3 className="font-bold text-sm leading-tight mb-0.5">{listing.title}</h3>
                          <p className="text-xs text-gray-600 mb-1">{listing.addressText}</p>

                          {listing.description && (
                            <p className="text-xs text-gray-500 mb-1 line-clamp-3">{listing.description}</p>
                          )}

                          <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-1">
                            <Calendar className="w-3 h-3 shrink-0" />
                            {format(new Date(listing.startDateTime), "MMM d, h:mm a")} — {format(new Date(listing.endDateTime), "MMM d, h:mm a")}
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-gray-400">
                            <User className="w-3 h-3" />
                            {listing.created_by?.split("@")[0] || "Anonymous"}
                          </div>
                        </div>

                        {/* Sticky bottom action row */}
                        <div className="flex items-center gap-1.5 p-2 pt-1.5 border-t border-gray-100 flex-shrink-0 flex-wrap">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`);
                            }}
                            className="h-7 text-xs px-2 bg-amber-600 hover:bg-amber-700"
                          >
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReportListingId(listing.id);
                            }}
                            className="h-7 text-xs px-2 text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Report
                          </Button>
                          <div className="ml-auto flex gap-1.5">
                            {HUNT_ENABLED && (() => {
                              const huntStop = huntStops.find(s => s.id === listing.id);
                              
                              if (!huntStop) {
                                return (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addToHunt(listing);
                                    }}
                                    className="gap-1 h-7 text-xs px-2"
                                  >
                                    <Plus className="w-3 h-3" /> Add Stop
                                  </Button>
                                );
                              }

                              const status = huntStop.huntStatus || "not_started";
                              
                              if (status === "completed") {
                                return (
                                  <Badge className="bg-gray-400 text-white h-7 flex items-center px-2 text-xs">
                                    Completed ✅
                                  </Badge>
                                );
                              }
                              
                              if (status === "skipped") {
                                return (
                                  <div className="flex gap-1">
                                    <Badge className="bg-gray-400 text-white h-7 flex items-center px-2 text-xs">
                                      Skipped
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateStopStatus(listing.id, "not_started");
                                      }}
                                      className="h-7 text-xs px-2 text-blue-600 border-blue-300 hover:bg-blue-50"
                                    >
                                      Reset
                                    </Button>
                                  </div>
                                );
                              }
                              
                              if (status === "arrived") {
                                return (
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateStopStatus(listing.id, "completed");
                                    }}
                                    className="h-7 text-xs px-2 bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    Complete
                                  </Button>
                                );
                              }

                              // status === "not_started"
                              const isDemo = isDemoMode();
                              const distanceMeters = gpsLocation ? calculateDistanceMeters(gpsLocation.lat, gpsLocation.lng, listing.lat, listing.lng) : Infinity;
                              const isWithinDistance = isDemo || distanceMeters <= 15; // 50ft approx

                              if (isWithinDistance) {
                                return (
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateStopStatus(listing.id, "arrived");
                                    }}
                                    variant="outline"
                                    className="h-7 text-xs px-2 border-green-600 text-green-700 hover:bg-green-50 bg-white/50"
                                  >
                                    Check In
                                  </Button>
                                );
                              }

                              return (
                                <div className="flex flex-col items-end">
                                  <Button
                                    size="sm"
                                    disabled
                                    variant="outline"
                                    className="h-7 text-xs px-2 border-gray-400 text-gray-500 bg-gray-100 opacity-60"
                                  >
                                    Check In
                                  </Button>
                                  <span className="text-[9px] text-gray-500 mt-0.5 leading-tight text-right">
                                    Move within 50ft
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

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

            {!debugVisible && (
              <button
                onClick={() => { setDebugVisible(true); setDebugPinned(true); }}
                className="absolute bottom-4 left-4 z-[1001] px-2 py-1 rounded bg-black/50 text-green-400 text-[10px] font-mono hover:bg-black/70 transition-colors"
              >
                Debug
              </button>
            )}

            {locationError && (
              <div className="absolute bottom-24 left-4 right-4 z-[1000] sm:left-auto sm:right-4 sm:w-80">
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-3">
                    <p className="text-sm text-orange-800">{locationError}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Hunt Mode Summary Overlay moved to Treasure Map panel header */}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportListingId && (
        <ReportModal
          listingId={reportListingId}
          onClose={() => setReportListingId(null)}
        />
      )}

      {/* Filter Modal */}
      <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Listing Type</label>
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="all" className="gap-1 text-xs px-2">
                    <MapPin className="w-3 h-3 hidden sm:inline" />
                    All ({stats.total})
                  </TabsTrigger>
                  <TabsTrigger value="yard_sale" className="gap-1 text-xs px-2">
                    <ShoppingBag className="w-3 h-3 hidden sm:inline" />
                    Sales ({stats.yard_sale})
                  </TabsTrigger>
                  <TabsTrigger value="neighborhood_sale" className="gap-1 text-xs px-2">
                    <Users className="w-3 h-3 hidden sm:inline" />
                    Hood ({stats.neighborhood_sale})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <p className="text-sm text-gray-500">More filters coming soon...</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}