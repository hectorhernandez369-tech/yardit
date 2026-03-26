import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ListView from "../components/home/ListView";
import { useAppMode } from "../components/shared/DemoMode";

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Calendar, User, Search, ShoppingBag, Plus, Check, Users, Star, Crosshair, Loader2, SlidersHorizontal, X, Map as MapIcon, List } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import RouteBuilder from "../components/map/RouteBuilder";
import {
  deriveNeighborhoodEventState,
  isNeighborhoodVisibleOnMap,
  normalizeNeighborhoodJoinStatus,
  shouldShowListingInNeighborhoodParticipantView,
  shouldShowListingOnMainMap,
} from "@/lib/neighborhoodSaleState";
import CheckInButton from "../components/map/CheckInButton";
import { toast } from "sonner";
import ClusterGroup, { shouldShowAsPin } from "../components/map/ClusterGroup";
import ReportModal from "../components/ReportModal";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MapDebugOverlay from "../components/map/MapDebugOverlay";
import MapZoomControl from "../components/map/MapZoomControl";
import MapFocusController from "../components/map/MapFocusController";
import MapTierDebugBox from "../components/map/MapTierDebugBox";
import { useHunt, HUNT_ENABLED } from "@/components/hunt/HuntContext";
import HuntMapLayers from "@/components/hunt/HuntMapLayers";
import { calculateTotalDistance } from "@/components/hunt/huntUtils";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import GuestAuthModal from "@/components/guest/GuestAuthModal";
import { getEventMarkerIcon } from "@/components/map/eventMarkerIcons";
import { getListingSortPriority, formatEventTierLabel } from "@/lib/eventListingConfig";
import { formatMarqueeSlotTime, getVisibleMarqueeSlots, hasMoreMarqueeSlots } from "@/lib/marqueeSchedule";

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

const neighborhoodParticipantIcon = new L.DivIcon({
  className: "neighborhood-participant-pin",
  html: `<div style="width:12px;height:12px;border-radius:9999px;background:#5DADA5;border:2px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const CHEST_ICON_URL = "https://media.base44.com/images/public/690f554506edf795e5d84121/1bb335014_file_00000000d7e871f58415b8d892f56c4b.png";
const chestIconCache = {};
function getChestIcon(size, count = 0, isSelected = false) {
  const iconSize = Math.min(isSelected ? 36 : 34, Math.max(isSelected ? 32 : 30, Math.round(size)));
  const countLabel = Number(count || 0) > 0 ? String(Math.round(Number(count))) : "";
  const key = `chest_${iconSize}_${countLabel}_${isSelected ? "selected" : "default"}`;
  if (!chestIconCache[key]) {
    const badgeSize = Math.max(18, Math.round(iconSize * 0.34));
    const badgeFont = Math.max(10, Math.round(iconSize * 0.22));
    const chestFilter = isSelected
      ? "drop-shadow(0 0 0 rgba(244,168,73,0.75)) drop-shadow(0 4px 10px rgba(0,0,0,0.32))"
      : "drop-shadow(0 3px 6px rgba(0,0,0,0.28))";
    chestIconCache[key] = L.divIcon({
      className: "neighborhood-chest-marker",
      html: `<div style="position:relative;width:${iconSize}px;height:${iconSize}px;"><img src="${CHEST_ICON_URL}" alt="Neighborhood Sale" style="width:${iconSize}px;height:${iconSize}px;display:block;filter:${chestFilter};" />${countLabel ? `<div style="position:absolute;top:-4px;right:-4px;min-width:${badgeSize}px;height:${badgeSize}px;padding:0 4px;border-radius:9999px;background:rgba(44,79,78,0.96);border:2px solid #F4A849;color:#ffffff;font-weight:700;font-size:${badgeFont}px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.28);">${countLabel}</div>` : ""}</div>`,
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize],
      popupAnchor: [0, -Math.round(iconSize * 0.86)],
    });
  }
  return chestIconCache[key];
}

// Custom marker icons based on tier
const createIcon = (type, tier, isSelected, location) => {
  const preAct = isPreActivated(location);
  const opacity = preAct ? 0.6 : 1.0;

  if (type === "event") {
    return getEventMarkerIcon(location, isSelected);
  }

  if (type === "neighborhood_sale") {
    let scale = 1.0;
    const count = location.homeCount || location.confirmed_count || 0;
    if (count >= 20) scale = 1.35;
    else if (count >= 12) scale = 1.2;
    else if (count >= 5) scale = 1.05;
    const chestSize = 30 * scale + (isSelected ? 2 : 0);
    return getChestIcon(chestSize, count, isSelected);
  }

  let fill = "#6b7280";
  let stroke = "#4b5563";
  let size = 22;

  if (type === "halloween_candy") {
    fill = "#9333ea";
    stroke = "#ffffff";
    size = 25;
  } else if (type === "holiday_lights") {
    const isGlowing = location &&
      location.display_active &&
      isWithinViewingHours(location.viewing_start_time, location.viewing_end_time);
    if (isGlowing) {
      fill = "#ffd700";
      stroke = "#dc2626";
      size = 28;
    } else {
      fill = "#dc2626";
      stroke = "#ffffff";
      size = 25;
    }
  } else if (tier === "premium") {
    fill = "#5DADA5";
    stroke = "#F4A849";
    size = 28;
  } else if (tier === "neighborhood_event") {
    fill = "#F4A849";
    stroke = "#2C4F4E";
    size = 30;
  } else if (tier === "featured" || tier === "map_pin") {
    fill = "#5DADA5";
    stroke = "#2C4F4E";
    size = 25;
  }

  const selectedSize = tier === "premium"
    ? 31
    : (tier === "featured" || tier === "map_pin" || type === "halloween_candy" || type === "holiday_lights")
      ? 28
      : 25;
  const finalSize = isSelected ? selectedSize : size;
  const finalStrokeWidth = isSelected ? 2.4 : 2;
  const key = `${type || "listing"}_${tier || "default"}_${opacity}_${isSelected ? "selected" : "default"}`;

  return getCachedIcon(key, buildPinSvg(fill, stroke, finalStrokeWidth, finalSize, opacity), finalSize);
};

function isNeighborhoodParticipantListing(listing) {
  return listing?.listingType !== "neighborhood_sale" &&
    !!listing?.neighborhood_sale_id &&
    normalizeNeighborhoodJoinStatus(listing?.neighborhood_join_status) === "approved";
}

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
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return Infinity;
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

function levenshteinDistance(a, b) {
  if (!a) return b ? b.length : 0;
  if (!b) return a ? a.length : 0;
  if (a === b) return 0;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyMatchString(query, text) {
  if (!query || !text) return false;
  const q = String(query).toLowerCase();
  const t = String(text).toLowerCase();
  if (t.includes(q)) return true;

  const queryWords = q.split(/\s+/).filter(Boolean);
  const textWords = t.split(/[\s,.\-#]+/).filter(Boolean);

  return queryWords.every(qw => {
    return textWords.some(tw => {
      if (Math.abs(tw.length - qw.length) > 2) return false;
      return levenshteinDistance(qw, tw) <= 2;
    });
  });
}

function listingMatchesQuery(listing, query, isFuzzy) {
  if (!query) return true;
  const q = String(query).toLowerCase();
  
  if (!isFuzzy) {
    return (
      listing.title?.toLowerCase().includes(q) ||
      listing.description?.toLowerCase().includes(q) ||
      (listing.categories || []).some(c => c?.toLowerCase().includes(q)) ||
      listing.category?.toLowerCase().includes(q) ||
      listing.addressText?.toLowerCase().includes(q) ||
      listing.city?.toLowerCase().includes(q)
    );
  }

  if (fuzzyMatchString(q, listing.title)) return true;
  if (fuzzyMatchString(q, listing.description)) return true;
  if ((listing.categories || []).some(c => fuzzyMatchString(q, c))) return true;
  if (fuzzyMatchString(q, listing.category)) return true;
  
  return false;
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

  const { guardAction, showModal, setShowModal, isGuest, modalProps } = useGuestGuard();

  // --- Full map state (merged from pages/Map) ---
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
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
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [openMarqueeIds, setOpenMarqueeIds] = useState({});
  const [isShowingAllListings, setIsShowingAllListings] = useState(false);
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

  const { isDemoMode: demoOn } = useAppMode();

  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings"],
    queryFn: () => base44.entities.Listing.list("-created_date"),
    initialData: [],
  });

  // Map movement on city search
  useEffect(() => {
    if (!searchQuery) return;
    const timeoutId = setTimeout(() => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return;

      // Priority Rule: Keep current behavior if exact title or listing number match
      const exactListingMatch = listings.find(
        (l) =>
          l.title?.toLowerCase().trim() === q ||
          (l.listingNumber && l.listingNumber.toLowerCase().trim() === q)
      );

      if (exactListingMatch) return;

      // City Search Detection
      const cityListings = listings.filter(
        (l) => l.city && l.city.toLowerCase().trim() === q
      );

      if (cityListings.length > 0) {
        const validListings = cityListings.filter(
          (l) => typeof l.lat === "number" && typeof l.lng === "number" && isFinite(l.lat) && isFinite(l.lng)
        );
        
        if (validListings.length > 0) {
          const avgLat = validListings.reduce((sum, l) => sum + l.lat, 0) / validListings.length;
          const avgLng = validListings.reduce((sum, l) => sum + l.lng, 0) / validListings.length;
          setMapCenter([avgLat, avgLng]);
          setMapZoom(12); // Reasonable city-level zoom
        }
      }
    }, 700);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, listings]);

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
    setSelectedListingId(focusListing.id);
    setActiveFocusListing({ listing: focusListing, fromUrl: true });
    hasHandledInitialFocus.current = true;
  }, [focusListing, focusListingId, listings.length]);

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

  const { data: allJoinRequests } = useQuery({
    queryKey: ["allJoinRequests"],
    queryFn: () => base44.entities.JoinRequest.list(),
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

    const baseListings = listings.filter((listing) => {
      if (typeof listing.lat !== "number" || typeof listing.lng !== "number") return false;
      if (!isFinite(listing.lat) || !isFinite(listing.lng)) return false;

      if (listing.listingType === "neighborhood_sale") {
        const visibleHomes = Number(listing.homeCount || listing.confirmed_count || 0);
        if (visibleHomes < 5 || !isNeighborhoodVisibleOnMap(listing, now)) return false;

        const start = new Date(listing.startDateTime);
        const end = new Date(listing.endDateTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || now > end) return false;
      } else {
        if (!shouldShowListingOnMainMap(listing, now)) return false;

        const start = new Date(listing.startDateTime);
        const end = new Date(listing.endDateTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
        if (!demo && listing.listingType !== "event" && (start > now || end < now)) return false;
      }

      const matchesFilter = filter === "all" || listing.listingType === filter;
      const matchesCategory = selectedCategories.length === 0 || 
        selectedCategories.some(cat => (listing.categories || []).includes(cat) || listing.category === cat);

      return matchesFilter && matchesCategory;
    });

    const strictMatches = baseListings.filter(l => listingMatchesQuery(l, searchQuery, false));
    if (strictMatches.length > 0 || !searchQuery) {
      return strictMatches.sort((a, b) => getListingSortPriority(a) - getListingSortPriority(b));
    }

    return baseListings.filter(l => listingMatchesQuery(l, searchQuery, true)).sort((a, b) => getListingSortPriority(a) - getListingSortPriority(b));
  }, [listings, filter, searchQuery, selectedCategories, demoOn]);

  const listViewListings = useMemo(() => {
    const now = new Date();
    const demo = demoOn;

    const baseListings = listings.filter((l) => {
      if (typeof l.lat !== "number" || typeof l.lng !== "number") return false;
      if (!isFinite(l.lat) || !isFinite(l.lng)) return false;

      if (l.listingType === "neighborhood_sale") {
        const visibleHomes = Number(l.homeCount || l.confirmed_count || 0);
        if (visibleHomes < 5 || !isNeighborhoodVisibleOnMap(l, now)) return false;

        const start = new Date(l.startDateTime);
        const end = new Date(l.endDateTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < now) return false;
        return true;
      }

      if (!shouldShowListingOnMainMap(l, now)) return false;

      const start = new Date(l.startDateTime);
      const end = new Date(l.endDateTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
      if (!demo && l.listingType !== "event" && (start > now || end < now)) return false;

      return true;
    }).filter(l => {
      const matchesCategory = selectedCategories.length === 0 || 
        selectedCategories.some(cat => (l.categories || []).includes(cat) || l.category === cat);
      return matchesCategory;
    });

    const strictMatches = baseListings.filter(l => listingMatchesQuery(l, searchQuery, false));
    if (strictMatches.length > 0 || !searchQuery) {
      return strictMatches.sort((a, b) => getListingSortPriority(a) - getListingSortPriority(b));
    }

    return baseListings.filter(l => listingMatchesQuery(l, searchQuery, true)).sort((a, b) => getListingSortPriority(a) - getListingSortPriority(b));
  }, [listings, searchQuery, selectedCategories, demoOn]);

const stats = useMemo(() => {
  return {
    total: eligibleListings.length,
    yard_sale: eligibleListings.filter((l) => l.listingType === "yard_sale").length,
    neighborhood_sale: eligibleListings.filter((l) => l.listingType === "neighborhood_sale").length,
    event: eligibleListings.filter((l) => l.listingType === "event").length,
  };
}, [eligibleListings]);

  useEffect(() => {
    if (filter !== "all" && filter !== "yard_sale" && filter !== "neighborhood_sale" && filter !== "event") {
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
    if ((listing?.event_tier || listing?.tier) === "marquee") {
      setOpenMarqueeIds((prev) => ({ ...prev, [listing.id]: true }));
    }
    setSelectedListingId(listing.id);
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
      const isNeighborhoodEvent = listing.listingType === "neighborhood_sale";

      if (isNeighborhoodEvent) {
        if (currentZoom >= 12 && currentZoom < 18) {
          pins.push(listing);
        } else {
          cPoints.push({ lat: listing.lat, lng: listing.lng, id: listing.id });
        }
        return;
      }

      const shouldRevealPin = isShowingAllListings || shouldShowAsPin(currentZoom, listing);
      if (shouldRevealPin) {
        pins.push(listing);
      } else {
        cPoints.push({ lat: listing.lat, lng: listing.lng, id: listing.id });
      }
    });

    let fallback = false;
    if (!isShowingAllListings && pins.length === 0 && eligibleListings.length > 0 && currentZoom >= 11) {
      fallback = true;
      eligibleListings.forEach(listing => {
        if (listing.listingType !== "neighborhood_sale" && listing.tier === "premium") {
          if (!pins.find(p => p.id === listing.id)) {
            pins.push(listing);
            const idx = cPoints.findIndex(p => p.id === listing.id);
            if (idx !== -1) cPoints.splice(idx, 1);
          }
        }
      });
    }

    return { visiblePins: pins, clusterPts: cPoints, fallbackActive: fallback };
  }, [eligibleListings, currentZoom, isShowingAllListings]);

  const neighborhoodParticipantPins = useMemo(() => {
    if (currentZoom < 18 || !allJoinRequests?.length) return [];

    const visiblePinIds = new Set(visiblePins.map((pin) => pin.id));
    return allJoinRequests
      .map((request) => {
        const participantListing = listings.find((item) => item.id === request.listingId);
        const eventListing = listings.find((item) => item.id === request.saleListingId);
        if (!participantListing || !eventListing) return null;
        if (!shouldShowListingInNeighborhoodParticipantView(participantListing, eventListing, request, new Date())) return null;
        if (visiblePinIds.has(participantListing.id)) return null;
        if (typeof participantListing.lat !== "number" || typeof participantListing.lng !== "number") return null;

        return {
          id: `participant-${request.id}`,
          requestId: request.id,
          listingId: participantListing.id,
          title: participantListing.title,
          addressText: participantListing.addressText,
          lat: participantListing.lat,
          lng: participantListing.lng,
          listingType: participantListing.listingType,
          tier: participantListing.tier || "free",
        };
      })
      .filter(Boolean);
  }, [allJoinRequests, currentZoom, listings, visiblePins]);

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
            <div className="absolute left-1/2 ml-20 flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                onPointerDown={() => setIsShowingAllListings(true)}
                onPointerUp={() => setIsShowingAllListings(false)}
                onPointerLeave={() => setIsShowingAllListings(false)}
                onPointerCancel={() => setIsShowingAllListings(false)}
                onTouchStart={() => setIsShowingAllListings(true)}
                onTouchEnd={() => setIsShowingAllListings(false)}
                className="h-9 shrink-0 border-slate-200 text-slate-600 bg-white hover:bg-slate-50 rounded-full shadow-sm px-3"
              >
                Show Listings
              </Button>
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
                const isHuntStop = huntStops.some(loc => loc.id === listing.id);
                const isMapSelected = selectedListingId === listing.id;
                const routeIndex = huntStops.findIndex(loc => loc.id === listing.id);
                const isMarquee = (listing?.event_tier || listing?.tier) === "marquee";
                const marqueeOpen = isMarquee ? openMarqueeIds[listing.id] !== false : false;
                const marqueeSlots = isMarquee && marqueeOpen ? getVisibleMarqueeSlots(listing) : [];
                const marqueeHasMore = isMarquee && marqueeOpen ? hasMoreMarqueeSlots(listing) : false;
                
                return (
                  <Marker
                    key={listing.id}
                    ref={(ref) => { if (ref) markerRefsMap.current[listing.id] = ref; }}
                    position={[listing.lat, listing.lng]}
                    icon={listing.listingType === "event" ? getEventMarkerIcon(listing, isMapSelected, marqueeOpen) : createIcon(listing.listingType, listing.tier, isMapSelected, listing)}
                    eventHandlers={{
                      click: () => { handlePinClick(listing); },
                      popupopen: () => setSelectedListingId(listing.id),
                      popupclose: () => setSelectedListingId((current) => current === listing.id ? null : current),
                    }}
                  >
                    {!isMarquee && (
                      <Popup maxWidth={320} minWidth={240} autoPan={true} autoPanPaddingTopLeft={[10, 10]} autoPanPaddingBottomRight={[10, 10]}>
                        <div className="flex flex-col gap-3" style={{ maxWidth: "min(88vw, 320px)", maxHeight: "60vh" }}>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge className="text-[9px] px-1 py-0 h-4 min-h-0 bg-slate-900">🎉 Event</Badge>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 min-h-0 capitalize">{formatEventTierLabel(listing.event_tier || listing.tier)}</Badge>
                            </div>
                            <h3 className="font-bold text-sm leading-tight">{listing.event_name || listing.title}</h3>
                            <p className="text-[11px] leading-tight text-gray-600">{listing.address_text || listing.addressText}</p>
                          </div>

                          <div className="space-y-2">
                            {marqueeSlots.length > 0 ? marqueeSlots.map((slot) => (
                              <div key={slot.id} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2">
                                <div className="text-[11px] font-semibold text-slate-900">{slot.label}</div>
                                <div className="text-[10px] text-amber-700">{formatMarqueeSlotTime(slot)}</div>
                              </div>
                            )) : (
                              <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] text-slate-600">
                                Schedule available in details.
                              </div>
                            )}
                            {marqueeHasMore && <p className="text-[10px] text-slate-500">More schedule slots in details.</p>}
                          </div>

                          <div className="flex items-center gap-1 pt-1.5 border-t border-gray-100 flex-wrap">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`);
                              }}
                              className="h-6 text-[11px] px-2 py-0 bg-amber-600 hover:bg-amber-700"
                            >
                              View More Details
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                guardAction(() => setReportListingId(listing.id));
                              }}
                              className="h-6 text-[11px] px-2 py-0 text-red-600 border-red-300 hover:bg-red-50"
                            >
                              Report
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col" style={{ maxWidth: "min(88vw, 320px)", maxHeight: "60vh" }}>
                          <div className="p-1 overflow-y-auto flex-1 min-h-0">
                            <div className="flex items-center gap-1 flex-wrap mb-1">
                              <Badge className={`text-[9px] px-1 py-0 h-4 min-h-0 ${listing.listingType === "neighborhood_sale" ? "bg-blue-600" : listing.listingType === "event" ? "bg-slate-900" : "bg-orange-500"}`}>
                                {listing.listingType === "neighborhood_sale" ? "🏘️ Neighborhood" : listing.listingType === "event" ? "🎉 Event" : "🏡 Yard Sale"}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 min-h-0 capitalize">{listing.listingType === "event" ? formatEventTierLabel(listing.event_tier || listing.tier) : listing.tier}</Badge>
                              {isHuntStop && (
                                <Badge className="text-[9px] px-1 py-0 h-4 min-h-0 bg-blue-600">Stop #{routeIndex + 1}</Badge>
                              )}
                            </div>

                            <h3 className="font-bold text-sm leading-none mb-1">{listing.event_name || listing.title}</h3>
                            <p className="text-[11px] leading-tight text-gray-600 mb-1">{listing.address_text || listing.addressText}</p>

                            {(listing.event_description || listing.description) && (
                              <p className="text-[11px] leading-tight text-gray-500 mb-1.5 line-clamp-3">{listing.event_description || listing.description}</p>
                            )}

                            <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-0.5">
                              <Calendar className="w-3 h-3 shrink-0" />
                              {format(new Date(listing.startDateTime), "MMM d, h:mm a")} — {format(new Date(listing.endDateTime), "MMM d, h:mm a")}
                            </div>

                            <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-1">
                              <User className="w-3 h-3" />
                              {listing.created_by?.split("@")[0] || "Anonymous"}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 pt-1.5 border-t border-gray-100 flex-shrink-0 flex-wrap">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`);
                              }}
                              className="h-6 text-[11px] px-2 py-0 bg-amber-600 hover:bg-amber-700"
                            >
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                guardAction(() => setReportListingId(listing.id));
                              }}
                              className="h-6 text-[11px] px-2 py-0 text-red-600 border-red-300 hover:bg-red-50"
                            >
                              Report
                            </Button>
                            <div className="ml-auto flex gap-1">
                              {listing.listingType !== "event" && HUNT_ENABLED && (() => {
                                const huntStop = huntStops.find(s => s.id === listing.id);
                                
                                if (!huntStop) {
                                  return (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        guardAction(() => addToHunt(listing), {
                                          allowGuest: isGuest && huntStops.length < 2,
                                          modal: {
                                            title: "Create a Free Account to Save More Stops",
                                            description: "Guests can preview up to 2 Hunt stops.",
                                            detail: "Create a free account to save more stops and continue your hunt.",
                                          }
                                        });
                                      }}
                                      className="gap-1 h-6 text-[11px] px-1.5 py-0"
                                    >
                                      <Plus className="w-3 h-3" /> Add Stop
                                    </Button>
                                  );
                                }

                                const status = huntStop.huntStatus || "not_started";
                                
                                if (status === "completed") {
                                  return (
                                    <Badge className="bg-gray-400 text-white h-6 flex items-center px-1.5 text-[10px] min-h-0">
                                      Completed ✅
                                    </Badge>
                                  );
                                }
                                
                                if (status === "skipped") {
                                  return (
                                    <div className="flex gap-1">
                                      <Badge className="bg-gray-400 text-white h-6 flex items-center px-1.5 text-[10px] min-h-0">
                                        Skipped
                                      </Badge>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateStopStatus(listing.id, "not_started");
                                        }}
                                        className="h-6 text-[11px] px-1.5 py-0 text-blue-600 border-blue-300 hover:bg-blue-50"
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
                                      className="h-6 text-[11px] px-1.5 py-0 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      Complete
                                    </Button>
                                  );
                                }

                                const uLat = gpsLocation ? Number(gpsLocation.lat) : null;
                                const uLng = gpsLocation ? Number(gpsLocation.lng) : null;
                                const lLat = Number(listing.lat);
                                const lLng = Number(listing.lng);

                                let distanceFeet = Infinity;

                                if (uLat !== null && uLng !== null && !isNaN(lLat) && !isNaN(lLng)) {
                                  const distanceMeters = calculateDistanceMeters(uLat, uLng, lLat, lLng);
                                  distanceFeet = distanceMeters * 3.28084;
                                }

                                const isWithinDistance = demoOn || distanceFeet <= 50;

                                if (isWithinDistance) {
                                  return (
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateStopStatus(listing.id, "arrived");
                                      }}
                                      variant="outline"
                                      className="h-6 text-[11px] px-1.5 py-0 border-green-600 text-green-700 hover:bg-green-50 bg-white/50"
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
                                      className="h-6 text-[11px] px-1.5 py-0 border-gray-400 text-gray-500 bg-gray-100 opacity-60"
                                    >
                                      Check In
                                    </Button>
                                    <span className="text-[9px] text-gray-500 mt-0.5 leading-tight text-right">
                                      {distanceFeet !== Infinity ? `Move within 50ft (${distanceFeet.toFixed(0)}ft)` : `Move within 50ft`}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </Popup>
                    )}
                  </Marker>
                );
              })}

              {neighborhoodParticipantPins.map((pin) => (
                <Marker
                  key={pin.id}
                  position={[pin.lat, pin.lng]}
                  icon={createIcon(pin.listingType || "yard_sale", pin.tier || "free", selectedListingId === pin.listingId, { ...pin, startDateTime: new Date().toISOString() })}
                  eventHandlers={{
                    click: () => setSelectedListingId(pin.listingId),
                    popupopen: () => setSelectedListingId(pin.listingId),
                    popupclose: () => setSelectedListingId((current) => current === pin.listingId ? null : current),
                  }}
                >
                  <Popup minWidth={160}>
                    <div className="flex flex-col gap-1 p-0.5">
                      <div className="flex">
                        <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 h-4 min-h-0">Participant Home</Badge>
                      </div>
                      <p className="font-semibold text-sm leading-none mt-0.5">{pin.title || "Participant"}</p>
                      <p className="text-[11px] leading-tight text-slate-600 mb-1">{pin.addressText || "Address unavailable"}</p>
                      <Button
                        size="sm"
                        className="w-full h-6 text-[11px] py-0 bg-amber-600 hover:bg-amber-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(createPageUrl("ListingDetail") + `?id=${pin.listingId}`);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Temporary Proximity Debug Overlay */}
            {gpsLocation && huntStops.some(s => s.huntStatus === 'not_started') && (
              <div className="absolute top-[80px] right-4 z-[1000] bg-black/80 text-white text-[11px] p-3 rounded-md font-mono shadow-lg border border-green-500 pointer-events-none w-64 max-h-[40vh] overflow-y-auto">
                <div className="font-bold text-green-400 mb-1 border-b border-green-800 pb-1">GPS Proximity Debug</div>
                <div>Accuracy: {gpsLocation.accuracy ? gpsLocation.accuracy.toFixed(1) : '?'}m</div>
                <div className="text-[9px] text-gray-400 break-all mb-2">Loc: [{gpsLocation.lat?.toFixed(5)}, {gpsLocation.lng?.toFixed(5)}]</div>
                <div className="space-y-1.5">
                  {huntStops.filter(s => s.huntStatus === 'not_started').map((stop) => {
                    const lLat = Number(stop.lat);
                    const lLng = Number(stop.lng);
                    if (isNaN(lLat) || isNaN(lLng)) return <div key={stop.id}>Stop: Invalid coords</div>;
                    const distFt = calculateDistanceMeters(Number(gpsLocation.lat), Number(gpsLocation.lng), lLat, lLng) * 3.28084;
                    return (
                      <div key={stop.id} className={`flex flex-col ${distFt <= 50 ? "text-green-300" : "text-amber-200"}`}>
                        <span className="font-semibold truncate">{stop.title}</span>
                        <span className="text-[10px]">Dist: {distFt.toFixed(1)} ft {distFt <= 50 ? '(Arrived)' : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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

            {demoOn && (
              <MapTierDebugBox
                zoom={currentZoom}
                showListingsActive={isShowingAllListings}
              />
            )}

            {visiblePins.map((listing) => {
              const isMarquee = (listing?.event_tier || listing?.tier) === "marquee";
              const marqueeOpen = isMarquee ? openMarqueeIds[listing.id] !== false : false;
              if (!isMarquee || !marqueeOpen) return null;

              const map = mapRef.current;
              if (!map) return null;
              const point = map.latLngToContainerPoint([listing.lat, listing.lng]);
              const marqueeSlots = getVisibleMarqueeSlots(listing).slice(0, 4);

              return (
                <div
                  key={`marquee-board-${listing.id}`}
                  className="absolute z-[1000] pointer-events-auto"
                  style={{ left: point.x, top: point.y, transform: "translate(-50%, calc(-100% - 18px))" }}
                >
                  <div className="relative w-[220px] rounded-[14px] border-4 border-[#f4a849] bg-gradient-to-b from-[#7c2d12] to-[#3f1d0b] p-2.5 text-white shadow-[0_0_0_2px_#2b1609_inset,0_0_18px_rgba(255,214,10,0.75),0_10px_22px_rgba(0,0,0,0.32)]">
                    <div className="pointer-events-none absolute inset-[6px] rounded-[10px] border-2 border-dashed border-[#fff59dd9]" />
                    <div className="pointer-events-none absolute -top-[7px] left-[10px] right-[10px] grid grid-cols-10 gap-[5px]">
                      {Array.from({ length: 10 }).map((_, index) => <span key={`top-${listing.id}-${index}`} className="h-[7px] w-[7px] rounded-full bg-[#fff3b0] shadow-[0_0_8px_rgba(255,230,128,0.95)]" />)}
                    </div>
                    <div className="pointer-events-none absolute -bottom-[7px] left-[10px] right-[10px] grid grid-cols-10 gap-[5px]">
                      {Array.from({ length: 10 }).map((_, index) => <span key={`bottom-${listing.id}-${index}`} className="h-[7px] w-[7px] rounded-full bg-[#fff3b0] shadow-[0_0_8px_rgba(255,230,128,0.95)]" />)}
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpenMarqueeIds((prev) => ({ ...prev, [listing.id]: false }))}
                      className="absolute right-2 top-2 z-10 rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-black/35"
                    >
                      X
                    </button>

                    <div className="mb-2 px-6 text-center text-[13px] font-black uppercase leading-tight tracking-[0.03em]">
                      {listing.event_name || listing.title || "Event"}
                    </div>

                    <div className="grid gap-[5px] min-h-[78px]">
                      {marqueeSlots.length > 0 ? marqueeSlots.map((slot) => (
                        <div key={slot.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-2 py-1 text-[10px] leading-tight">
                          <span className="max-w-[96px] truncate font-bold">{slot.label}</span>
                          <span className="whitespace-nowrap text-[#FDE68A]">{formatMarqueeSlotTime(slot)}</span>
                        </div>
                      )) : (
                        <div className="rounded-[10px] bg-white/10 px-2 py-2 text-center text-[10px] text-[#FDE68A]">See details</div>
                      )}
                    </div>

                    {marqueeHasMore && <p className="mt-1 text-[10px] text-[#FDE68A]">More schedule slots in details.</p>}

                    <Button
                      size="sm"
                      onClick={() => navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`)}
                      className="mt-2 h-7 w-full bg-amber-600 px-2 py-0 text-[11px] hover:bg-amber-700"
                    >
                      View More Details
                    </Button>
                  </div>
                  <div className="mx-auto h-0 w-0 border-l-[14px] border-r-[14px] border-t-[16px] border-l-transparent border-r-transparent border-t-[#3f1d0b] drop-shadow-[0_4px_4px_rgba(0,0,0,0.28)]" />
                </div>
              );
            })}

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

      <GuestAuthModal open={showModal} onClose={setShowModal} {...modalProps} />

      {/* Filter Modal */}
      <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Listing Type</label>
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList className="grid grid-cols-4">
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
                  <TabsTrigger value="event" className="gap-1 text-xs px-2">
                    <Calendar className="w-3 h-3 hidden sm:inline" />
                    Events ({stats.event})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Categories</label>
                {selectedCategories.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setSelectedCategories([])}>
                    Clear
                  </Button>
                )}
              </div>
              <ScrollArea className="h-48 rounded-md border p-4">
                <div className="grid grid-cols-1 gap-3">
                  {[
                    "Household Items", "Furniture", "Clothing & Accessories",
                    "Electronics", "Tools & Hardware", "Toys & Games",
                    "Baby & Kids", "Outdoor & Garden", "Sports Equipment",
                    "Collectibles", "Antiques & Vintage", "Vehicles & Auto Parts",
                    "Free Items", "Food / Baked Goods", "Miscellaneous"
                  ].map((cat) => (
                    <div key={cat} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`filter-${cat}`} 
                        checked={selectedCategories.includes(cat)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCategories([...selectedCategories, cat]);
                          } else {
                            setSelectedCategories(selectedCategories.filter(c => c !== cat));
                          }
                        }}
                      />
                      <Label htmlFor={`filter-${cat}`} className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {cat}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}