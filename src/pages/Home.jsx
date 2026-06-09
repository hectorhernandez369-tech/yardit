import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  shouldShowListingInNeighborhoodParticipantView } from
"@/lib/neighborhoodSaleState";
import { getListingMapVisibilityState, debugListingVisibility, getListingOwnerId } from "@/lib/listingVisibility";

const UPCOMING_PREVIEW_LABEL = "COMING SOON";
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
import HiddenListingsOverlay from "../components/map/HiddenListingsOverlay";
import { useHunt, HUNT_ENABLED } from "@/components/hunt/HuntContext";
import HuntMapLayers from "@/components/hunt/HuntMapLayers";
import { calculateTotalDistance } from "@/components/hunt/huntUtils";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import GuestAuthModal from "@/components/guest/GuestAuthModal";
import { getEventMarkerIcon } from "@/components/map/eventMarkerIcons";
import { formatEventTierLabel } from "@/lib/eventListingConfig";
import { getMarqueeBoardCollapsedHtml, getMarqueeBoardExpandedHtml } from "@/components/map/MarqueeBoard.jsx";
import { getListingDescriptionText, getListingPrimaryText, getListingSecondaryBadgeLabel, getListingStatusUi, getListingTypeBadgeLabel } from "@/components/listing/listingDisplay";
import SaveListingButton from "@/components/listing/SaveListingButton";
import { isLiveVendorCheckIn } from "@/lib/vendorTiers";
import { getVendorPinActiveSchedule } from "@/lib/vendorPinSchedule";
import { isPublishedVendorEvent, toVendorEventListing } from "@/lib/vendorEvents";
import { getVendorMarkerIcon, shouldShowVendorPinAtZoom } from "@/components/map/vendorMarkerIcons";
import QuickMapFilters from "@/components/map/QuickMapFilters";
import MapFilterModal from "@/components/map/MapFilterModal";
import VendorEventMapMarkers from "@/components/map/VendorEventMapMarkers";
import { getPreviewListingsOnMapPreference } from "@/lib/listingPreviewPreference";

const MARQUEE_RESTORED_KEY = "yardit_marquee_restored_id";

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
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
      popupAnchor: [0, -h]
    });
  }
  return iconCache[key];
}

const neighborhoodParticipantIcon = new L.DivIcon({
  className: "neighborhood-participant-pin",
  html: `<div style="width:12px;height:12px;border-radius:9999px;background:#5DADA5;border:2px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const CHEST_ICON_URL = "https://media.base44.com/images/public/690f554506edf795e5d84121/1bb335014_file_00000000d7e871f58415b8d892f56c4b.png";
const chestIconCache = {};
function getChestIcon(size, count = 0, isSelected = false, faded = false) {
  const iconSize = Math.min(isSelected ? 36 : 34, Math.max(isSelected ? 32 : 30, Math.round(size)));
  const countLabel = Number(count || 0) > 0 ? String(Math.round(Number(count))) : "";
  const key = `chest_${iconSize}_${countLabel}_${isSelected ? "selected" : "default"}_${faded ? "faded" : "solid"}`;
  if (!chestIconCache[key]) {
    const badgeSize = Math.max(18, Math.round(iconSize * 0.34));
    const badgeFont = Math.max(10, Math.round(iconSize * 0.22));
    const chestFilter = isSelected ?
    "drop-shadow(0 0 0 rgba(244,168,73,0.75)) drop-shadow(0 4px 10px rgba(0,0,0,0.32))" :
    "drop-shadow(0 3px 6px rgba(0,0,0,0.28))";
    const chestOpacity = faded ? 0.35 : 1;
    chestIconCache[key] = L.divIcon({
      className: "neighborhood-chest-marker",
      html: `<div style="position:relative;width:${iconSize}px;height:${iconSize}px;"><img src="${CHEST_ICON_URL}" alt="Neighborhood Sale" style="width:${iconSize}px;height:${iconSize}px;display:block;opacity:${chestOpacity};filter:${chestFilter};" />${countLabel ? `<div style="position:absolute;top:-4px;right:-4px;min-width:${badgeSize}px;height:${badgeSize}px;padding:0 4px;border-radius:9999px;background:rgba(44,79,78,0.96);border:2px solid #F4A849;color:#ffffff;font-weight:700;font-size:${badgeFont}px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.28);opacity:${faded ? 0.72 : 1};">${countLabel}</div>` : ""}</div>`,
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize],
      popupAnchor: [0, -Math.round(iconSize * 0.86)]
    });
  }
  return chestIconCache[key];
}

// Custom marker icons based on tier
const createIcon = (type, tier, isSelected, location) => {
  const preAct = isPreActivated(location);
  const isPreviewState = location?.mapState === "preview" || location?.ownerUpcomingPreview === true;
  const opacity = isPreviewState ? 0.35 : preAct ? 0.6 : 1.0;
  const isOwnerPendingPreview = type === "neighborhood_sale" && (location?.ownerPreviewPending === true || isPreviewState);

  if (type === "event") {
    return getEventMarkerIcon(location, isSelected);
  }

  if (type === "neighborhood_sale") {
    let scale = 1.0;
    const count = location.homeCount || location.confirmed_count || 0;
    if (count >= 20) scale = 1.35;else
    if (count >= 12) scale = 1.2;else
    if (count >= 5) scale = 1.05;
    const chestSize = 30 * scale + (isSelected ? 2 : 0);
    return getChestIcon(chestSize, count, isSelected, isOwnerPendingPreview);
  }

  let fill = "#6b7280";
  let stroke = "#4b5563";
  let size = 18;

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

  const selectedSize = tier === "premium" ?
  31 :
  tier === "featured" || tier === "map_pin" || type === "halloween_candy" || type === "holiday_lights" ?
  28 :
  25;
  const finalSize = isSelected ? selectedSize : size;
  const finalStrokeWidth = isSelected ? 2.4 : 2;
  const key = `${type || "listing"}_${tier || "default"}_${opacity}_${isSelected ? "selected" : "default"}`;

  return getCachedIcon(key, buildPinSvg(fill, stroke, finalStrokeWidth, finalSize, opacity), finalSize);
};

function MapController({ center, zoom, onUserMove, onZoomChange, onMapReady }) {
  const map = useMap();
  const lastProgrammaticMove = useRef(null);

  useEffect(() => {
    if (onMapReady) onMapReady(map);
  }, [map, onMapReady]);

  useEffect(() => {
    const handleMoveEnd = () => {
      const isProgrammatic = lastProgrammaticMove.current && Date.now() - lastProgrammaticMove.current < 1000;
      onUserMove(map.getCenter(), isProgrammatic);
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
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
  Math.cos(φ1) * Math.cos(φ2) *
  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

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

function getEarlyVisibilityStart(listing) {
  const activeStart = new Date(listing?.startDateTime);
  if (Number.isNaN(activeStart.getTime())) return null;
  const earlyDays = Math.max(0, Number(listing?.earlyVisibilityDays || 0));
  const earlyStart = new Date(activeStart);
  earlyStart.setDate(earlyStart.getDate() - earlyDays);
  return earlyStart;
}

function getListingMapState(listing, user, now = new Date()) {
  if (!listing?.startDateTime) return "active";
  const activeStart = new Date(listing.startDateTime);
  if (Number.isNaN(activeStart.getTime())) return "active";

  const earlyStart = getEarlyVisibilityStart(listing) || activeStart;
  const isOwner = !!user?.id && listing.ownerUserId === user.id;

  if (now < earlyStart) {
    return isOwner ? "preview" : "hidden";
  }

  if (now < activeStart) {
    return "coming_soon";
  }

  return "active";
}

function formatListingGoLive(listing) {
  if (!listing?.startDateTime) return "Date unavailable";
  const timeZone = listing.timeZoneId || "UTC";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(new Date(listing.startDateTime));
}

const HUNT_BUTTON_STORAGE_KEY = "yardit_hunt_button_position_v1";
const HUNT_BUTTON_SIZE = 70;
const HUNT_BUTTON_MARGIN = 16;

function clampHuntButtonPosition(position, containerRect) {
  const maxX = Math.max(HUNT_BUTTON_MARGIN, containerRect.width - HUNT_BUTTON_SIZE - HUNT_BUTTON_MARGIN);
  const maxY = Math.max(HUNT_BUTTON_MARGIN, containerRect.height - HUNT_BUTTON_SIZE - HUNT_BUTTON_MARGIN);

  return {
    x: Math.min(Math.max(position.x, HUNT_BUTTON_MARGIN), maxX),
    y: Math.min(Math.max(position.y, HUNT_BUTTON_MARGIN), maxY)
  };
}

function getDefaultHuntButtonPosition(containerRect) {
  return clampHuntButtonPosition({
    x: containerRect.width - HUNT_BUTTON_SIZE - HUNT_BUTTON_MARGIN,
    y: 112
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

  return queryWords.every((qw) => {
    return textWords.some((tw) => {
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
      (listing.categories || []).some((c) => c?.toLowerCase().includes(q)) ||
      listing.category?.toLowerCase().includes(q) ||
      listing.display_address?.toLowerCase().includes(q) ||
      listing.addressText?.toLowerCase().includes(q) ||
      listing.city?.toLowerCase().includes(q));

  }

  if (fuzzyMatchString(q, listing.title)) return true;
  if (fuzzyMatchString(q, listing.description)) return true;
  if ((listing.categories || []).some((c) => fuzzyMatchString(q, c))) return true;
  if (fuzzyMatchString(q, listing.category)) return true;

  return false;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [view, setView] = useState("map");
  const [reportListingId, setReportListingId] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [hiddenListingsForMarquee, setHiddenListingsForMarquee] = useState(null);
  const queryClient = useQueryClient();

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
  const getSavedLocation = () => {
    try {
      const savedSession = sessionStorage.getItem("yardit_last_map_center");
      if (savedSession) return JSON.parse(savedSession);
      const saved = localStorage.getItem("yardit_last_map_center");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [37.7749, -122.4194];
  };
  const getSavedZoom = () => {
    try {
      const saved = sessionStorage.getItem("yardit_last_map_zoom");
      if (saved) return parseInt(saved, 10);
    } catch (e) {}
    return 13;
  };
  const [mapCenter, setMapCenter] = useState(getSavedLocation);
  const [mapZoom, setMapZoom] = useState(getSavedZoom);
  const [showControls, setShowControls] = useState(false);
  const [quickMapFilters, setQuickMapFilters] = useState({ yardSales: true, neighborhoodSales: true, events: true, vendors: true });
  const controlsPanelRef = useRef(null);
  const controlsBtnRef = useRef(null);
  const mapAreaRef = useRef(null);
  const dragStateRef = useRef({
    isPointerDown: false,
    isDragging: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0
  });
  const suppressButtonClickRef = useRef(false);
  const huntButtonPositionRef = useRef({ x: 0, y: 112 });
  const [huntButtonPosition, setHuntButtonPosition] = useState({ x: 0, y: 112 });
  const [user, setUser] = useState(null);
  const [previewListingsOnMap] = useState(getPreviewListingsOnMapPreference);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [focusListingId, setFocusListingId] = useState(null);
  const [activeFocusListing, setActiveFocusListing] = useState(null);
  const [selectedListingId, setSelectedListingId] = useState(null);
  // marquee state per id: "collapsed" = collapsed board, "expanded" = expanded board, false = hidden/closed
  const [openMarqueeIds, setOpenMarqueeIds] = useState({});
  const MARQUEE_COLLAPSED_MIN_ZOOM = 12;
  const MARQUEE_HIDDEN_MIN_ZOOM = 10;
  const [isShowingAllListings, setIsShowingAllListings] = useState(false);
  const showListingsTimerRef = useRef(null);
  const hasHandledInitialFocus = useRef(false);
  const [currentZoom, setCurrentZoom] = useState(13);
  const [scheduleNow, setScheduleNow] = useState(() => new Date());
  const markerRefsMap = useRef({});
  const hasCenteredOnUser = useRef(false);
  const userHasMovedMap = useRef(false);
  const mapRef = useRef(null);

  // Debug overlay
  const debugForceOn = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("debug") === "true";
  }, []);

  const ownerPreviewUrlFlag = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("ownerPreview") === "1" || p.get("previewMode") === "owner";
  }, []);
  const viewingOwnerPreviewMode = !!user?.id || ownerPreviewUrlFlag;
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
        y: event.clientY - rect.top - dragState.offsetY
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
        offsetY: 0
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
      offsetY: event.clientY - buttonRect.top
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

  const handleShowListingsClick = useCallback(() => {
    setIsShowingAllListings(true);
    if (showListingsTimerRef.current) {
      clearTimeout(showListingsTimerRef.current);
    }
    showListingsTimerRef.current = setTimeout(() => {
      setIsShowingAllListings(false);
      showListingsTimerRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setScheduleNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (debugPinned || debugForceOn) return;
    if (!debugVisible) return;
    debugTimerRef.current = setTimeout(() => setDebugVisible(false), 8000);
    return () => clearTimeout(debugTimerRef.current);
  }, [debugVisible, debugPinned, debugForceOn]);

  useEffect(() => {
    return () => {
      if (showListingsTimerRef.current) {
        clearTimeout(showListingsTimerRef.current);
      }
    };
  }, []);

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

    // Restore expanded marquee after back-navigation from ListingDetail
    const restoredId = sessionStorage.getItem(MARQUEE_RESTORED_KEY);
    if (restoredId) {
      sessionStorage.removeItem(MARQUEE_RESTORED_KEY);
      setOpenMarqueeIds((prev) => ({ ...prev, [restoredId]: "expanded" }));
    }
  }, []);

  const { isDemoMode: demoOn } = useAppMode();

  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings"],
    queryFn: () => base44.entities.Listing.list("-created_date"),
    initialData: []
  });

  useEffect(() => {
    const unsubscribe = base44.entities.Listing.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    });

    return unsubscribe;
  }, [queryClient]);

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
        l.listingNumber && l.listingNumber.toLowerCase().trim() === q
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
    return listings.find((l) => l.id === focusListingId) || null;
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
    initialData: []
  });

  const { data: allReviews } = useQuery({
    queryKey: ["allReviews"],
    queryFn: () => base44.entities.Review.list(),
    initialData: []
  });

  const { data: allJoinRequests } = useQuery({
    queryKey: ["allJoinRequests"],
    queryFn: () => base44.entities.JoinRequest.list(),
    initialData: []
  });

  const { data: vendorAccounts = [] } = useQuery({
    queryKey: ["vendorAccounts"],
    queryFn: () => base44.entities.VendorAccount.list(),
    initialData: []
  });

  const { data: vendorPins = [] } = useQuery({
    queryKey: ["vendorPins"],
    queryFn: () => base44.entities.VendorPin.list(),
    initialData: []
  });

  const { data: vendorCheckIns = [] } = useQuery({
    queryKey: ["vendorCheckIns"],
    queryFn: () => base44.entities.VendorPinCheckIn.list("-created_date"),
    initialData: []
  });

  const { data: vendorEvents = [] } = useQuery({
    queryKey: ["publicVendorEvents"],
    queryFn: () => base44.entities.VendorEvent.list("startDateTime"),
    initialData: []
  });

  // Live location tracking
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setUserLocation(newLoc);
        setLocationError(null);
        if (!hasCenteredOnUser.current && !userHasMovedMap.current && !sessionStorage.getItem("yardit_last_map_center")) {
          setMapCenter([newLoc.lat, newLoc.lng]);
          hasCenteredOnUser.current = true;
        }
        try {localStorage.setItem("yardit_last_map_center", JSON.stringify([newLoc.lat, newLoc.lng]));} catch (e) {}
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
            accuracy: position.coords.accuracy
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

  const handleUserMoveMap = React.useCallback((center, isProgrammatic) => {
    if (!isProgrammatic) {
      userHasMovedMap.current = true;
    }
    if (center) {
      try {
        sessionStorage.setItem("yardit_last_map_center", JSON.stringify([center.lat, center.lng]));
        localStorage.setItem("yardit_last_map_center", JSON.stringify([center.lat, center.lng]));
      } catch (e) {}
    }
  }, []);

  const handleZoomChange = React.useCallback((z) => {
    setCurrentZoom(z);
    try {
      sessionStorage.setItem("yardit_last_map_zoom", z);
    } catch (e) {}
  }, []);



  const eligibleListings = useMemo(() => {
    const now = new Date();
    const visibilityContext = { now, viewingOwnerPreviewMode, debugVisibility: debugForceOn };

    const baseListings = listings.
    map((listing) => {
      const matchesCategory = selectedCategories.length === 0 ||
      selectedCategories.some((cat) => (listing.categories || []).includes(cat) || listing.category === cat);
      if (!matchesCategory) return null;

      const mapState = getListingMapVisibilityState(listing, user, visibilityContext);
      if (debugForceOn) debugListingVisibility(listing, user, visibilityContext);
      if (mapState === "hidden") return null;
      if (!previewListingsOnMap && mapState === "preview" && user?.id && getListingOwnerId(listing) === user.id) return null;

      return { ...listing, mapState };
    }).
    filter(Boolean);

    // Vendor events shown separately on map via VendorEventMapMarkers; include in list view only
    const combinedListings = [...baseListings];

    const strictMatches = combinedListings.filter((l) => listingMatchesQuery(l, searchQuery, false));
    if (strictMatches.length > 0 || !searchQuery) {
      return strictMatches;
    }

    return combinedListings.filter((l) => listingMatchesQuery(l, searchQuery, true));
  }, [listings, vendorEvents, filter, searchQuery, selectedCategories, demoOn, user, viewingOwnerPreviewMode, debugForceOn, previewListingsOnMap]);

  // List View uses its own pipeline in ListView.jsx + lib/listViewPipeline.js
  // No pre-filtering here — raw listings + vendorEvents are passed directly.

  const stats = useMemo(() => {
    const publicListings = eligibleListings.filter((l) => l.mapState !== "preview");
    return {
      total: publicListings.length,
      yard_sale: publicListings.filter((l) => l.listingType === "yard_sale").length,
      neighborhood_sale: publicListings.filter((l) => l.listingType === "neighborhood_sale").length,
      event: publicListings.filter((l) => l.listingType === "event").length
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
      controlsBtnRef.current && !controlsBtnRef.current.contains(e.target))
      {
        setShowControls(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showControls]);

  const handlePinClick = (listing) => {
    if ((listing?.event_tier || listing?.tier) === "marquee") {
      if (currentZoom >= MARQUEE_COLLAPSED_MIN_ZOOM) {
        setOpenMarqueeIds((prev) => {
          const cur = prev[listing.id];
          if (cur === false || cur === undefined) return { ...prev, [listing.id]: "collapsed" };
          return prev;
        });
      } else {
        setOpenMarqueeIds((prev) => ({ ...prev, [listing.id]: false }));
      }
    }
    setSelectedListingId(listing.id);
    setActiveFocusListing({ listing, fromUrl: false });
  };

  const getCheckInCount = (locationId) => {
    return allCheckIns.filter((c) => c.location_id === locationId).length;
  };

  const getLocationRating = (locationId) => {
    const reviews = allReviews.filter((r) => r.location_id === locationId);
    if (reviews.length === 0) return null;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return { average: avgRating.toFixed(1), count: reviews.length };
  };

  const { visiblePins, clusterPts, fallbackActive } = useMemo(() => {
    const pins = [];
    const cPoints = [];
    eligibleListings.forEach((listing) => {
      if (filter !== "all" && listing.listingType !== filter) return;
      if (!quickMapFilters.events && listing.listingType === "event") return;
      if (!quickMapFilters.neighborhoodSales && listing.listingType === "neighborhood_sale") return;
      if (!quickMapFilters.yardSales && listing.listingType === "yard_sale") return;

      const isPreview = listing.mapState === "preview";
      const isComingSoon = listing.mapState === "coming_soon";
      const isActive = listing.mapState === "active";
      const isMarquee = (listing?.event_tier || listing?.tier) === "marquee";

      if (isPreview) {
        pins.push(listing);
        return;
      }

      const isNeighborhoodEvent = listing.listingType === "neighborhood_sale";

      if (isComingSoon) {
        if (isMarquee) {
          if (currentZoom >= MARQUEE_HIDDEN_MIN_ZOOM) {
            pins.push(listing);
          }
        } else {
          const shouldRevealPin = isShowingAllListings || shouldShowAsPin(currentZoom, listing);
          if (shouldRevealPin) {
            pins.push(listing);
          }
        }
        return;
      }

      if (isNeighborhoodEvent) {
        if (currentZoom >= 12) {
          pins.push(listing);
        } else {
          cPoints.push({ lat: listing.lat, lng: listing.lng, id: listing.id });
        }
        return;
      }

      if (isActive) {
        if (isMarquee) {
          if (currentZoom >= MARQUEE_HIDDEN_MIN_ZOOM) {
            pins.push(listing);
          }
        } else {
          const shouldRevealPin = isShowingAllListings || shouldShowAsPin(currentZoom, listing);
          if (shouldRevealPin) {
            pins.push(listing);
          } else {
            cPoints.push({ lat: listing.lat, lng: listing.lng, id: listing.id });
          }
        }
      }
    });

    let fallback = false;
    if (!isShowingAllListings && pins.length === 0 && eligibleListings.some((listing) => listing.mapState === "active") && currentZoom >= 11) {
      fallback = true;
      eligibleListings.forEach((listing) => {
        if (listing.mapState !== "active") return;
        if (listing.listingType !== "neighborhood_sale" && listing.tier === "premium") {
          if (!pins.find((p) => p.id === listing.id)) {
            pins.push(listing);
            const idx = cPoints.findIndex((p) => p.id === listing.id);
            if (idx !== -1) cPoints.splice(idx, 1);
          }
        }
      });
    }

    return { visiblePins: pins, clusterPts: cPoints, fallbackActive: fallback };
  }, [eligibleListings, currentZoom, isShowingAllListings, filter, quickMapFilters]);

  // NO ZOOM-BASED STATE RESET - persist marquee state across zoom levels

  const neighborhoodParticipantPins = useMemo(() => {
    if (currentZoom < 18 || !allJoinRequests?.length) return [];

    const visiblePinIds = new Set(visiblePins.map((pin) => pin.id));
    return allJoinRequests.
    map((request) => {
      const participantListing = listings.find((item) => item.id === request.listingId);
      const eventListing = listings.find((item) => item.id === request.saleListingId);
      if (!participantListing || !eventListing) return null;

      const isParticipantInvalid = participantListing.status === "cancelled" || participantListing.status === "canceled" || participantListing.status === "expired" || participantListing.status === "removed" || participantListing.status === "hidden" || participantListing.canceled_at || participantListing.expired_at || !demoOn && participantListing.endDateTime && new Date() > new Date(participantListing.endDateTime);
      const isEventInvalid = eventListing.status === "cancelled" || eventListing.status === "canceled" || eventListing.status === "expired" || eventListing.status === "removed" || eventListing.status === "hidden" || eventListing.canceled_at || eventListing.expired_at || !demoOn && eventListing.endDateTime && new Date() > new Date(eventListing.endDateTime);

      if (isParticipantInvalid || isEventInvalid) return null;

      if (!shouldShowListingInNeighborhoodParticipantView(participantListing, eventListing, request, new Date())) return null;
      if (visiblePinIds.has(participantListing.id)) return null;
      if (typeof participantListing.lat !== "number" || typeof participantListing.lng !== "number") return null;

      return {
        id: `participant-${request.id}`,
        requestId: request.id,
        listingId: participantListing.id,
        title: participantListing.title,
        display_address: participantListing.display_address,
        addressText: participantListing.display_address || participantListing.addressText,
        lat: participantListing.lat,
        lng: participantListing.lng,
        listingType: participantListing.listingType,
        tier: participantListing.tier || "free"
      };
    }).
    filter(Boolean);
  }, [allJoinRequests, currentZoom, listings, visiblePins]);

  const currentVisibleCandidates = useMemo(() => {
    const fullParticipantListings = neighborhoodParticipantPins.map((pin) => listings.find((l) => l.id === pin.listingId)).filter(Boolean);
    return [...visiblePins, ...fullParticipantListings];
  }, [visiblePins, neighborhoodParticipantPins, listings]);

  const liveVendorPins = useMemo(() => {
    if (!quickMapFilters.vendors) return [];

    const checkedInPins = vendorCheckIns.
    filter(isLiveVendorCheckIn).
    map((checkIn) => {
      const pin = vendorPins.find((item) => item.id === checkIn.vendor_pin_id);
      const account = vendorAccounts.find((item) => item.id === checkIn.vendor_account_id);
      if (!pin || !account || account.is_active === false || pin.is_active === false) return null;
      if (!shouldShowVendorPinAtZoom(account, currentZoom)) return null;
      return { checkIn, pin, account };
    }).
    filter(Boolean);

    const checkedInPinIds = new Set(checkedInPins.map(({ pin }) => pin.id));
    const scheduledPins = vendorPins.
    map((pin) => {
      if (checkedInPinIds.has(pin.id)) return null;
      const account = vendorAccounts.find((item) => item.id === pin.vendor_account_id);
      if (!account || account.is_active === false || pin.is_active === false) return null;
      if (!shouldShowVendorPinAtZoom(account, currentZoom)) return null;

      const activeSchedule = getVendorPinActiveSchedule(pin, scheduleNow);
      if (!activeSchedule) return null;

      return {
        pin,
        account,
        activeSchedule,
        checkIn: {
          id: `scheduled-${pin.id}`,
          vendor_pin_id: pin.id,
          vendor_account_id: pin.vendor_account_id,
          status: "scheduled_live",
          checkin_latitude: Number(pin.scheduled_lat),
          checkin_longitude: Number(pin.scheduled_lng),
          checkin_display_address: pin.scheduled_location_label || "Scheduled vendor location",
          checkin_end_time: activeSchedule.endDateTime.toISOString()
        }
      };
    }).
    filter(Boolean);

    return [...checkedInPins, ...scheduledPins];
  }, [vendorCheckIns, vendorPins, vendorAccounts, currentZoom, quickMapFilters.vendors, scheduleNow]);

  const marqueeOverlays = useMemo(() => {
    if (currentZoom < MARQUEE_COLLAPSED_MIN_ZOOM) return [];

    return visiblePins.filter(
      (listing) => {
        const isMarquee = (listing?.event_tier || listing?.tier) === "marquee";
        if (!isMarquee) return false;

        const marqueeState = openMarqueeIds[listing.id];
        const shouldShow = marqueeState !== false;

        return shouldShow &&
        typeof listing?.lat === "number" &&
        typeof listing?.lng === "number";
      }
    ).map((marquee) => {
      const isExpanded = openMarqueeIds[marquee.id] === "expanded";

      let scale = 1.0;
      if (!isExpanded) {
        if (currentZoom === 12) scale = 0.85;else
        if (currentZoom < 12) scale = 0.70;
      }

      const wPixels = (isExpanded ? 190 : 160) * scale;
      const hPixels = (isExpanded ? 74 : 66) * scale;
      const tailPixels = 6 * scale;
      const metersPerPixel = 40075016 * Math.cos(marquee.lat * Math.PI / 180) / (256 * Math.pow(2, currentZoom));

      const halfWidthM = wPixels / 2 * metersPerPixel;
      const heightM = (hPixels + tailPixels) * metersPerPixel;
      const bufferM = 15 * metersPerPixel; // buffer for pin sizes

      const overlapped = currentVisibleCandidates.filter((l) => {
        if (l.id === marquee.id) return false;
        const isOtherMarquee = (l?.event_tier || l?.tier) === "marquee";
        if (isOtherMarquee) return false; // don't count marquees
        if (typeof l.lat !== "number" || typeof l.lng !== "number") return false;

        // Approximate distance in meters
        const latDiffMeters = (l.lat - marquee.lat) * 111320;
        const lngDiffMeters = (l.lng - marquee.lng) * (40075016 * Math.cos(marquee.lat * Math.PI / 180) / 360);

        // Check if listing is within the visual footprint (extends UP/North from anchor)
        const inX = lngDiffMeters >= -(halfWidthM + bufferM) && lngDiffMeters <= halfWidthM + bufferM;
        const inY = latDiffMeters >= -bufferM && latDiffMeters <= heightM + bufferM;

        return inX && inY;
      });

      return {
        ...marquee,
        overlappedListings: overlapped
      };
    });
  }, [visiblePins, currentVisibleCandidates, openMarqueeIds, currentZoom]);

  const hiddenByMarqueeIds = useMemo(() => {
    const ids = new Set();
    marqueeOverlays.forEach((m) => {
      m.overlappedListings?.forEach((l) => ids.add(l.id));
    });
    return ids;
  }, [marqueeOverlays]);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col w-full min-w-0">
      {/* Sticky Top Bar */}
      <div className="bg-white border-b border-slate-200 z-[100] flex-shrink-0 flex flex-col w-full">
        {view === "map" &&
        <div className="px-3 pt-2 pb-1 sm:hidden">
            <div className="relative w-full max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
              placeholder="Search by address or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm" />
            
            </div>
          </div>
        }

        <div className="px-3 py-1.5 flex items-center justify-center gap-4">
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

          <div className="hidden sm:block relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by address or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm" />
            
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {view === "map" &&
            <>
                <Button
                variant="outline"
                size="sm"
                onClick={handleShowListingsClick}
                className="h-9 shrink-0 border-slate-200 text-slate-600 bg-white hover:bg-slate-50 rounded-full shadow-sm px-2 sm:px-3">
                
                  <span className="hidden sm:inline mr-1">Show</span>
                  <span>Listings</span>
                </Button>
                <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilterModal(true)}
                className="h-9 w-9 shrink-0 border-slate-200 text-slate-500 bg-white hover:bg-slate-50 rounded-full shadow-sm">
                
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </>
            }
          </div>
        </div>
      </div>

      {/* Content area */}
      {view === "list" ?
      <div className="flex-1 overflow-auto">
          <ListView
          listings={listings}
          vendorEvents={vendorEvents}
          userLocation={userLocation}
          mapCenter={mapCenter}
          currentUser={user}
          viewingOwnerPreviewMode={false} />
        
        </div> :

      <div ref={mapAreaRef} className="flex-1 relative min-w-0 w-full">
          {/* Route Builder FAB */}
          <button
          ref={controlsBtnRef}
          onPointerDown={handleHuntButtonPointerDown}
          onClick={handleHuntButtonClick}
          className="absolute z-[1002] flex items-center justify-center active:scale-95 transition-all duration-200 bg-transparent border-2 border-[#2C4F4E]/20 outline-none shadow-none rounded-full"
          style={{
            left: `${huntButtonPosition.x}px`,
            top: `${huntButtonPosition.y}px`,
            width: showControls ? "50px" : "70px",
            height: showControls ? "50px" : "70px",
            touchAction: "none"
          }}>
          
            {showControls ?
          <X className="w-12 h-12 text-[#2C4F4E]" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} /> :

          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/cb76cc21e_file_00000000cd1c720ca3ac2dd5471be0aa.png"
            alt="Open Map"
            className="w-[70px] h-[70px] object-contain pointer-events-none"
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />

          }
          </button>

          {/* Backdrop */}
          {showControls &&
        <div className="absolute inset-0 z-[999] bg-black/5 backdrop-blur-[.90px] transition-opacity duration-200 pointer-events-none" />
        }

          {/* Controls Panel */}
          <div
          ref={controlsPanelRef}
          className="absolute top-4 left-1/2 -translate-x-1/2 w-[94vw] sm:w-[420px] max-w-[500px] z-[1001] transition-all duration-200 ease-out origin-top"
          style={{
            opacity: showControls ? 1 : 0,
            transform: showControls ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-12px)",
            pointerEvents: showControls ? "auto" : "none"
          }}>
          
            <div className="max-w-4xl mx-auto space-y-3">
              <RouteBuilder
              selectedLocations={huntStops}
              onRemoveLocation={(id) => {
                huntContext.removeFromHunt(id);
              }}
              onClearAll={() => {
                huntContext.clearHunt();
              }}
              onBuildRoute={() => huntContext.optimizeRoute()} />
            
            </div>
          </div>

          {/* Map */}
          <div className="absolute inset-0 w-full h-full m-0 p-0" style={{ transform: "none", left: 0 }}>
            <MapContainer
            center={mapCenter}
            zoom={13}
            maxZoom={22}
            dragging={true}
            touchZoom={true}
            scrollWheelZoom={true}
            className="w-full h-full"
            style={{ width: "100%", height: "100%" }}
            zoomControl={false}>
            
              <MapController center={mapCenter} zoom={mapZoom} onUserMove={handleUserMoveMap} onZoomChange={handleZoomChange} onMapReady={(map) => {mapRef.current = map;}} />
              <QuickMapFilters value={quickMapFilters} onChange={setQuickMapFilters} />
              <MapZoomControl onMyLocation={handleMyLocation} isLocating={isLocating} locationError={locationError} />
              <MapFocusController focusData={activeFocusListing} markerRefsMap={markerRefsMap} onFocusComplete={() => setActiveFocusListing(null)} />
              <HuntMapLayers />
              <TileLayer
              attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA"
              tileSize={512}
              zoomOffset={-1}
              maxZoom={22}
              maxNativeZoom={22} />
            
              
              {/* User Location Dot */}
              {userLocation &&
            <>
                  <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={userLocation.accuracy || 50}
                pathOptions={{ fillColor: '#2A93EE', fillOpacity: 0.15, color: '#2A93EE', weight: 1 }} />
              
                  <CircleMarker
                center={[userLocation.lat, userLocation.lng]}
                radius={6}
                pathOptions={{ fillColor: '#2A93EE', fillOpacity: 1, color: '#ffffff', weight: 2 }} />
              
                </>
            }
              
              <ClusterGroup points={clusterPts} clusterRadius={50} minPoints={2} />

              {visiblePins.map((listing) => {
              if (hiddenByMarqueeIds.has(listing.id)) return null;

              const isMarquee = (listing?.event_tier || listing?.tier) === "marquee";
              if (isMarquee && currentZoom >= MARQUEE_COLLAPSED_MIN_ZOOM && openMarqueeIds[listing.id] !== false) return null;

              const isHuntStop = huntStops.some((loc) => loc.id === listing.id);
              const isMapSelected = selectedListingId === listing.id;
              const routeIndex = huntStops.findIndex((loc) => loc.id === listing.id);
              const ownerPreviewPending = listing.listingType === "neighborhood_sale" && user?.id && getListingOwnerId(listing) === user.id && deriveNeighborhoodEventState(listing, new Date()) === "pending_activation";
              const isPreviewState = listing.mapState === "preview";
              const goLiveLabel = formatListingGoLive(listing);

              return (
                <Marker
                  key={listing.id}
                  ref={(ref) => {if (ref) markerRefsMap.current[listing.id] = ref;}}
                  position={[listing.lat, listing.lng]}
                  icon={listing.listingType === "event" ? getEventMarkerIcon({ ...listing, ownerUpcomingPreview: isPreviewState }, isMapSelected, false) : createIcon(listing.listingType, listing.tier, isMapSelected, listing)}
                  eventHandlers={{
                    click: () => {handlePinClick(listing);},
                    popupopen: () => setSelectedListingId(listing.id),
                    popupclose: () => setSelectedListingId((current) => current === listing.id ? null : current)
                  }}>
                  
                    {ownerPreviewPending && typeof listing.event_center_lat === "number" && typeof listing.event_center_lng === "number" &&
                  <Circle
                    center={[listing.event_center_lat, listing.event_center_lng]}
                    radius={152.4}
                    pathOptions={{ color: '#059669', weight: 2, fillColor: '#10b981', fillOpacity: 0.08 }} />

                  }
                    {!isMarquee &&
                  <Popup maxWidth={340} minWidth={260} autoPan={true} autoPanPaddingTopLeft={[10, 10]} autoPanPaddingBottomRight={[10, 10]} className="leaflet-popup-transparent">
                         <div className="flex flex-col rounded-xl overflow-hidden backdrop-blur-md border border-white/40 shadow-lg opacity-100 bg-white" style={{ maxWidth: "min(90vw, 320px)", maxHeight: "70vh" }}>
                          <div className="p-2 overflow-y-auto flex-1 min-h-0 space-y-2">
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge className={`text-[9px] px-1.5 py-0 h-4 min-h-0 ${listing.listingType === "neighborhood_sale" ? "bg-blue-600" : listing.listingType === "event" ? "bg-slate-900" : "bg-orange-500"}`}>
                                {getListingTypeBadgeLabel(listing)}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 min-h-0 capitalize bg-white">{getListingSecondaryBadgeLabel(listing)}</Badge>
                              {!isPreviewState && (() => {
                            const statusUi = getListingStatusUi(listing);
                            return (
                              <Badge className={`text-[9px] px-1.5 py-0 h-4 min-h-0 ${statusUi.isComingSoon ? "bg-amber-500" : statusUi.isActive ? "bg-green-600" : "bg-slate-500"} text-white`}>
                                    {statusUi.label}
                                  </Badge>);

                          })()}
                              {isPreviewState &&
                          <Badge className="text-[9px] px-1.5 py-0 h-4 min-h-0 bg-amber-500 text-white">Preview</Badge>
                          }
                              {isHuntStop && !isPreviewState &&
                          <Badge className="text-[9px] px-1.5 py-0 h-4 min-h-0 bg-blue-600">Stop #{routeIndex + 1}</Badge>
                          }
                            </div>

                            <h3 className="font-bold text-base leading-tight text-slate-950">{getListingPrimaryText(listing)}</h3>

                            {isPreviewState ?
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-2">
                                <p className="text-[11px] font-semibold text-amber-800">Preview only</p>
                                <p className="text-[11px] text-amber-700 mt-1">Not visible to public until {goLiveLabel}</p>
                              </div> :

                        <>
                                {getListingDescriptionText(listing) &&
                          <p className="text-xs text-slate-700 leading-relaxed">{getListingDescriptionText(listing)}</p>
                          }
                                <div className="space-y-1 rounded-lg bg-slate-50/80 p-2 text-[11px] text-slate-700">
                                  <div className="flex gap-1.5">
                                    <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                                    <span className="break-words">{listing.display_address || listing.address_text || listing.addressText || [listing.city, listing.state, listing.zip].filter(Boolean).join(", ") || "Address unavailable"}</span>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <Calendar className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                                    <span>{listing.startDateTime ? format(new Date(listing.startDateTime), "MMM d, yyyy h:mm a") : "Date unavailable"}{listing.endDateTime ? ` – ${format(new Date(listing.endDateTime), "h:mm a")}` : ""}</span>
                                  </div>
                                </div>
                                {!getListingStatusUi(listing).isComingSoon &&
                          <div className="flex flex-wrap gap-1">
                                    {(listing.listingType === "event" ?
                            [listing.event_category || formatEventTierLabel(listing.event_tier || listing.tier)].filter(Boolean) :
                            (listing.categories?.length ? listing.categories : [listing.category]).filter(Boolean)).
                            slice(0, 6).map((item, index) =>
                            <Badge key={`${item}-${index}`} variant="outline" className="text-[9px] px-1.5 py-0 h-4 min-h-0 text-slate-600 border-slate-300 bg-slate-50">
                                        {item}
                                      </Badge>
                            )}
                                  </div>
                          }
                              </>
                        }
                          </div>

                          <div className="flex items-center gap-1 border-t border-gray-200 bg-white/40 p-1.5 flex-shrink-0 flex-wrap justify-center">
                            <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(listing.is_vendor_event ? `/VendorEventPublicPage?id=${listing.vendor_event_id}` : createPageUrl("ListingDetail") + `?id=${listing.id}`);
                          }}
                          className="h-6 text-[11px] px-2 py-0 bg-amber-600 hover:bg-amber-700">
                          
                              {listing.is_vendor_event ? "Public View" : "View Listing"}
                            </Button>
                            <SaveListingButton listing={listing} iconOnly size="sm" className="h-6 w-6 p-0 border-slate-200" />
                            {!isPreviewState &&
                        <>
                                <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              guardAction(() => setReportListingId(listing.id));
                            }}
                            className="h-6 text-[11px] px-2 py-0 text-red-600 border-red-300 hover:bg-red-50">
                            
                                  Report
                                </Button>
                                {!isPreviewState && listing.listingType !== "event" && HUNT_ENABLED && (() => {
                            const huntStop = huntStops.find((s) => s.id === listing.id);

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
                                        detail: "Create a free account to save more stops and continue your hunt."
                                      }
                                    });
                                  }}
                                  className="gap-1 h-6 text-[11px] px-1.5 py-0">
                                  
                                          <Plus className="w-3 h-3" /> Add Stop
                                        </Button>);

                            }

                            const status = huntStop.huntStatus || "not_started";

                            if (status === "completed") {
                              return (
                                <Badge className="bg-gray-400 text-white h-6 flex items-center px-1.5 text-[10px] min-h-0">
                                          Completed ✅
                                        </Badge>);

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
                                    className="h-6 text-[11px] px-1.5 py-0 text-blue-600 border-blue-300 hover:bg-blue-50">
                                    
                                            Reset
                                          </Button>
                                        </div>);

                            }

                            if (status === "arrived") {
                              return (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStopStatus(listing.id, "completed");
                                  }}
                                  className="h-6 text-[11px] px-1.5 py-0 bg-green-600 hover:bg-green-700 text-white">
                                  
                                          Complete
                                        </Button>);

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

                            const isWithinDistance = distanceFeet <= 50;

                            if (isWithinDistance) {
                              return (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStopStatus(listing.id, "arrived");
                                  }}
                                  variant="outline"
                                  className="h-6 text-[11px] px-1.5 py-0 border-green-600 text-green-700 hover:bg-green-50 bg-white/50">
                                  
                                          Check In
                                        </Button>);

                            }

                            return (
                              <div className="flex flex-col items-end">
                                        <Button
                                  size="sm"
                                  disabled
                                  variant="outline"
                                  className="h-6 text-[11px] px-1.5 py-0 border-gray-400 text-gray-500 bg-gray-100 opacity-60">
                                  
                                          Check In
                                        </Button>
                                        <span className="text-[9px] text-gray-500 mt-0.5 leading-tight text-right">
                                          {distanceFeet !== Infinity ? `Move within 50ft (${distanceFeet.toFixed(0)}ft)` : `Move within 50ft`}
                                        </span>
                                      </div>);

                          })()}
                                    </>
                        }
                          </div>
                        </div>
                      </Popup>
                  }
                  </Marker>);

            })}

              {/* Vendor Event Stacked Markers (Coming Soon + Active, with stacking) */}
              <VendorEventMapMarkers
              vendorEvents={vendorEvents}
              showVendorEvents={quickMapFilters.events} />
            

              {liveVendorPins.map(({ checkIn, pin, account }) => {
              const vendorStopId = `vendor-${checkIn.id}`;
              const isVendorStop = huntStops.some((stop) => stop.id === vendorStopId);
              const vendorStop = {
                id: vendorStopId,
                title: account.business_name || pin.pin_name || "Vendor",
                listingType: "vendor",
                tier: account.vendor_tier,
                lat: checkIn.checkin_latitude,
                lng: checkIn.checkin_longitude,
                display_address: checkIn.checkin_display_address || "Live vendor location",
                addressText: checkIn.checkin_display_address || "Live vendor location",
                description: pin.description || account.description || ""
              };

              return (
                <Marker
                  key={`vendor-${checkIn.id}`}
                  position={[checkIn.checkin_latitude, checkIn.checkin_longitude]}
                  icon={getVendorMarkerIcon({ pin, account, checkIn })}>
                  
                  <Popup minWidth={230} className="leaflet-popup-transparent">
                    <div className="space-y-2 p-0.5 rounded-xl overflow-hidden backdrop-blur-md bg-white/90 border border-white/40 shadow-lg">
                      <div className="flex items-center gap-2">
                        {(pin.pin_logo_url || account.business_logo) && <img src={pin.pin_logo_url || account.business_logo} alt={account.business_name || pin.pin_name} className="h-9 w-9 rounded-full object-cover border" />}
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-[#2C4F4E] truncate">{account.business_name || "Vendor Business"}</p>
                          <p className="text-[11px] text-slate-500">Ends {format(new Date(checkIn.checkin_end_time), "h:mm a")}</p>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-slate-700">{pin.pin_name}</p>
                      {pin.description && <p className="text-xs text-slate-600 line-clamp-2">{pin.description}</p>}
                      <p className="text-xs text-slate-600">{checkIn.checkin_display_address || "Live vendor location"}</p>
                      <div className="flex gap-1.5 pt-1">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/VendorPublicPage?accountId=${account.id}`);
                          }}
                          className="h-7 flex-1 bg-[#5DADA5] px-2 text-[11px] text-white hover:bg-[#4A9B93]">
                          
                          View Page
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isVendorStop}
                          onClick={(e) => {
                            e.stopPropagation();
                            guardAction(() => addToHunt(vendorStop), {
                              allowGuest: isGuest && huntStops.length < 2,
                              modal: {
                                title: "Create a Free Account to Save More Stops",
                                description: "Guests can preview up to 2 map stops.",
                                detail: "Create a free account to save more stops and continue your route."
                              }
                            });
                          }}
                          className="h-7 flex-1 px-2 text-[11px]">
                          
                          {isVendorStop ? "Added" : "Add to Map"}
                        </Button>
                      </div>
                    </div>
                  </Popup>
                </Marker>);

            })}

              {neighborhoodParticipantPins.map((pin) => {
              if (hiddenByMarqueeIds.has(pin.listingId)) return null;
              return (
                <Marker
                  key={pin.id}
                  position={[pin.lat, pin.lng]}
                  icon={createIcon(pin.listingType || "yard_sale", pin.tier || "free", selectedListingId === pin.listingId, { ...pin, startDateTime: new Date().toISOString() })}
                  eventHandlers={{
                    click: () => setSelectedListingId(pin.listingId),
                    popupopen: () => setSelectedListingId(pin.listingId),
                    popupclose: () => setSelectedListingId((current) => current === pin.listingId ? null : current)
                  }}>
                  
                  <Popup minWidth={160} className="leaflet-popup-transparent">
                    <div className="flex flex-col gap-1 p-0.5 rounded-xl overflow-hidden backdrop-blur-md bg-white/90 border border-white/40 shadow-lg">
                      <div className="flex">
                        <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 h-4 min-h-0">Participant Home</Badge>
                      </div>
                      <p className="font-semibold text-sm leading-none mt-0.5">{pin.title || "Participant"}</p>
                      <p className="text-[11px] leading-tight text-slate-600 mb-1">{pin.display_address || pin.addressText || "Address unavailable"}</p>
                      <Button
                        size="sm"
                        className="w-full h-6 text-[11px] py-0 bg-amber-600 hover:bg-amber-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(createPageUrl("ListingDetail") + `?id=${pin.listingId}`);
                        }}>
                        
                        View Details
                      </Button>
                    </div>
                  </Popup>
                </Marker>);

            })}

              {marqueeOverlays.map((listing) => {
              const isExpanded = openMarqueeIds[listing.id] === "expanded";
              const overlappedCount = listing.overlappedListings?.length || 0;
              const boardHtml = isExpanded ?
              getMarqueeBoardExpandedHtml(listing, {
                isComingSoon: listing.mapState === "coming_soon",
                isActive: listing.mapState === "active",
                goLiveLabel: formatListingGoLive(listing),
                overlappedCount
              }) :
              getMarqueeBoardCollapsedHtml(listing, {
                isComingSoon: listing.mapState === "coming_soon",
                isActive: listing.mapState === "active",
                goLiveLabel: formatListingGoLive(listing),
                overlappedCount
              });
              return (
                <Marker
                  key={`marquee-board-${listing.id}-${isExpanded ? "exp" : "col"}-z${currentZoom}-o${overlappedCount}`}
                  position={[listing.lat, listing.lng]}
                  ref={(ref) => {if (ref) markerRefsMap.current[listing.id] = ref;}}
                  icon={getEventMarkerIcon(listing, selectedListingId === listing.id, true, boardHtml, currentZoom)}
                  eventHandlers={{
                    add: (event) => {
                      const element = event.target?.getElement?.();
                      if (!element) return;

                      const expandBtn = element.querySelector('[data-marquee-expand="true"]');
                      const collapseBtn = element.querySelector('[data-marquee-collapse="true"]');
                      const detailsBtn = element.querySelector('[data-marquee-details="true"]');
                      const overlapBtn = element.querySelector('[data-marquee-overlap="true"]');

                      if (expandBtn) {
                        expandBtn.onclick = (e) => {
                          e.preventDefault();e.stopPropagation();
                          setOpenMarqueeIds((prev) => ({ ...prev, [listing.id]: "expanded" }));
                        };
                      }
                      if (collapseBtn) {
                        collapseBtn.onclick = (e) => {
                          e.preventDefault();e.stopPropagation();
                          setOpenMarqueeIds((prev) => ({ ...prev, [listing.id]: false }));
                        };
                      }
                      if (detailsBtn) {
                        detailsBtn.onclick = (e) => {
                          e.preventDefault();e.stopPropagation();
                          sessionStorage.setItem(MARQUEE_RESTORED_KEY, listing.id);
                          navigate(listing.is_vendor_event ? `/VendorEventPublicPage?id=${listing.vendor_event_id}` : createPageUrl("ListingDetail") + `?id=${listing.id}`);
                        };
                      }
                      if (overlapBtn) {
                        overlapBtn.onclick = (e) => {
                          e.preventDefault();e.stopPropagation();
                          setHiddenListingsForMarquee(listing.overlappedListings);
                        };
                      }
                    }
                  }} />);


            })}
            </MapContainer>

            {/* Debug Overlay */}
            <div
            onClick={() => {setDebugPinned(true);clearTimeout(debugTimerRef.current);}}
            className="transition-opacity duration-300"
            style={{ opacity: debugVisible ? 1 : 0, pointerEvents: debugVisible ? "auto" : "none" }}>
            
              <div className="relative">
                <button
                onClick={(e) => {e.stopPropagation();setDebugVisible(false);setDebugPinned(false);}}
                className="absolute top-2 right-2 z-[1002] w-6 h-6 flex items-center justify-center rounded bg-black/70 text-green-400 hover:bg-black/90 text-xs font-bold">
                
                  ✕
                </button>
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
                    timeOk: start <= now && end >= now
                  };
                })() : null} />
              
              </div>
            </div>

            {!debugVisible &&
          <button
            onClick={() => {setDebugVisible(true);setDebugPinned(true);}}
            className="absolute bottom-4 left-4 z-[1001] px-2 py-1 rounded bg-black/50 text-green-400 text-[10px] font-mono hover:bg-black/70 transition-colors">
            
                Debug
              </button>
          }

            {demoOn &&
          <MapTierDebugBox
            zoom={currentZoom}
            showListingsActive={isShowingAllListings} />

          }


            {locationError &&
          <div className="absolute bottom-24 left-4 right-4 z-[1000] sm:left-auto sm:right-4 sm:w-80">
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-3">
                    <p className="text-sm text-orange-800">{locationError}</p>
                  </CardContent>
                </Card>
              </div>
          }

            {/* Hunt Mode Summary Overlay moved to Treasure Map panel header */}
          </div>
        </div>
      }

      {/* Report Modal */}
      {reportListingId &&
      <ReportModal
        listingId={reportListingId}
        onClose={() => setReportListingId(null)} />

      }

      <GuestAuthModal open={showModal} onClose={setShowModal} {...modalProps} />

      <HiddenListingsOverlay
        listings={hiddenListingsForMarquee}
        onClose={() => setHiddenListingsForMarquee(null)} />
      

      <MapFilterModal
        open={showFilterModal}
        onOpenChange={setShowFilterModal}
        filter={filter}
        onFilterChange={setFilter}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        stats={stats} />
      
    </div>);

}