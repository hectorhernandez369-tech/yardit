import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from "sonner";

export const HUNT_ENABLED = true;
export const MAPBOX_ROUTE_ENABLED = true;

const HuntContext = createContext(null);

function calcDist(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useHunt() {
  return useContext(HuntContext);
}

export function HuntProvider({ children }) {
  const [huntStops, setHuntStops] = useState(() => {
    try {
      const saved = localStorage.getItem('yardit_hunt_stops');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [integrityAccepted, setIntegrityAccepted] = useState(() => localStorage.getItem('yardit_hunt_integrity') === 'true');
  const [huntMode, setHuntMode] = useState(false);
  const [yardsailActive, setYardsailActive] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState(null);
  const [routeMeta, setRouteMeta] = useState(null);
  const [routeDirty, setRouteDirty] = useState(false);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!HUNT_ENABLED) return;
    localStorage.setItem('yardit_hunt_stops', JSON.stringify(huntStops));
  }, [huntStops]);

  useEffect(() => {
    if (!HUNT_ENABLED) return;
    localStorage.setItem('yardit_hunt_integrity', String(integrityAccepted));
  }, [integrityAccepted]);

  useEffect(() => {
    if (!HUNT_ENABLED) return undefined;

    if (huntMode && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
          });
        },
        (error) => {
          console.warn("Hunt GPS Error:", error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000,
        }
      );
    } else {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
      setGpsLocation(null);
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    };
  }, [huntMode]);

  const addToHunt = useCallback((listing) => {
    if (!HUNT_ENABLED) return;
    setRouteDirty(true);
    setHuntStops((prev) => {
      if (prev.some((stop) => stop.id === listing.id)) {
        toast.info("Already in your hunt!");
        return prev;
      }
      toast.success("Added to Hunt!");
      return [
        ...prev,
        {
          ...listing,
          huntStatus: 'not_started',
          addedAt: new Date().toISOString(),
        },
      ];
    });
  }, []);

  const removeFromHunt = useCallback((listingId) => {
    if (!HUNT_ENABLED) return;
    setRouteDirty(true);
    setHuntStops((prev) => prev.filter((stop) => stop.id !== listingId));
    toast.success("Removed from Hunt");
  }, []);

  const updateStopStatus = useCallback((listingId, status) => {
    if (!HUNT_ENABLED) return;
    setRouteDirty(true);
    setHuntStops((prev) => prev.map((stop) => (
      stop.id === listingId ? { ...stop, huntStatus: status } : stop
    )));
  }, []);

  const acceptIntegrityNotice = useCallback(() => {
    if (!HUNT_ENABLED) return;
    setIntegrityAccepted(true);
  }, []);

  const clearHunt = useCallback(() => {
    if (!HUNT_ENABLED) return;
    if (!window.confirm("Clear all stops from your hunt?")) return;
    setHuntStops([]);
    setHuntMode(false);
    setYardsailActive(false);
    setRouteCoords(null);
    setRouteMeta(null);
    setRouteDirty(false);
    toast.success("Hunt cleared");
  }, []);

  const getTotalDistance = useCallback(() => {
    if (!HUNT_ENABLED || huntStops.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < huntStops.length - 1; i += 1) {
      total += calcDist(
        huntStops[i].lat,
        huntStops[i].lng,
        huntStops[i + 1].lat,
        huntStops[i + 1].lng
      );
    }
    return total;
  }, [huntStops]);

  const reorderStops = useCallback((newOrder) => {
    if (!HUNT_ENABLED) return;
    setRouteDirty(true);
    setHuntStops(newOrder);
  }, []);

  const fetchRoute = useCallback(async (origin, stops) => {
    if (!HUNT_ENABLED || !MAPBOX_ROUTE_ENABLED) return;

    const activeStops = stops.filter((stop) => stop.huntStatus !== 'completed' && stop.huntStatus !== 'skipped');
    const inactiveStops = stops.filter((stop) => stop.huntStatus === 'completed' || stop.huntStatus === 'skipped');
    const unvisited = [...activeStops];
    let currentPos = origin || (activeStops[0] ? { lat: activeStops[0].lat, lng: activeStops[0].lng } : null);
    const orderedActive = [];

    while (currentPos && unvisited.length > 0) {
      let nearestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < unvisited.length; i += 1) {
        const dist = calcDist(currentPos.lat, currentPos.lng, unvisited[i].lat, unvisited[i].lng);
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }
      const nearest = unvisited.splice(nearestIdx, 1)[0];
      orderedActive.push(nearest);
      currentPos = nearest;
    }

    const newlyOrderedStops = [...orderedActive, ...inactiveStops];
    setHuntStops(newlyOrderedStops);

    if (orderedActive.length < 2) {
      setRouteCoords(null);
      return;
    }

    const MAX_WAYPOINTS = 10;
    const targetStops = orderedActive.slice(0, MAX_WAYPOINTS);
    const coords = [];
    if (origin) coords.push([origin.lng, origin.lat]);
    targetStops.forEach((stop) => coords.push([stop.lng, stop.lat]));
    if (coords.length < 2) return;

    const stopIds = targetStops.map((stop) => stop.id).join(',');
    const originKey = origin ? `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}` : 'no-origin';
    const cacheKey = `${originKey}|${stopIds}`;

    if (routeMeta?.cacheKey === cacheKey && Date.now() - routeMeta.lastBuiltAt < 30000) {
      return;
    }

    const token = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";
    if (!token) return;

    const coordsString = coords.map((coord) => coord.join(',')).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&overview=full&steps=false&access_token=${token}`;

    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const geometry = data.routes?.[0]?.geometry;
      if (geometry?.coordinates) {
        setRouteCoords(geometry.coordinates.map((coord) => [coord[1], coord[0]]));
        setRouteDirty(false);
        setRouteMeta({
          lastBuiltAt: Date.now(),
          cacheKey,
          stopIdsUsed: targetStops.map((stop) => stop.id),
          originUsed: origin,
        });
      }
    } catch (error) {
      console.error("Mapbox Route Error", error);
    }
  }, [routeMeta]);

  const optimizeRoute = useCallback(() => {
    if (!HUNT_ENABLED || huntStops.length < 3) return;
    const unvisited = [...huntStops];
    const start = unvisited.shift();
    if (!start) return;
    const optimized = [start];

    while (unvisited.length > 0) {
      const current = optimized[optimized.length - 1];
      let nearestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < unvisited.length; i += 1) {
        const dist = calcDist(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }
      optimized.push(unvisited.splice(nearestIdx, 1)[0]);
    }

    setRouteDirty(true);
    setHuntStops(optimized);
    toast.success("Route optimized!");
  }, [huntStops]);

  const value = {
    huntStops,
    huntMode,
    setHuntMode,
    yardsailActive,
    setYardsailActive,
    gpsLocation,
    integrityAccepted,
    acceptIntegrityNotice,
    addToHunt,
    removeFromHunt,
    updateStopStatus,
    clearHunt,
    getTotalDistance,
    reorderStops,
    routeCoords,
    routeMeta,
    routeDirty,
    fetchRoute,
    optimizeRoute,
  };

  if (!HUNT_ENABLED) {
    return <>{children}</>;
  }

  return <HuntContext.Provider value={value}>{children}</HuntContext.Provider>;
}