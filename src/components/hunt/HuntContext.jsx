import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from "sonner";

export const HUNT_ENABLED = true;
export const MAPBOX_ROUTE_ENABLED = true;

const HuntContext = createContext();

export function useHunt() {
  return useContext(HuntContext);
}

export function HuntProvider({ children }) {
  if (!HUNT_ENABLED) {
    return <>{children}</>;
  }

  // Persisted state
  const [huntStops, setHuntStops] = useState(() => {
    try {
      const saved = localStorage.getItem('yardit_hunt_stops');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [integrityAccepted, setIntegrityAccepted] = useState(() => {
    return localStorage.getItem('yardit_hunt_integrity') === 'true';
  });

  // Session state
  const [huntMode, setHuntMode] = useState(false);
  const [yardsailActive, setYardsailActive] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [routeGeoJson, setRouteGeoJson] = useState(null);
  const [routeMeta, setRouteMeta] = useState(null);
  const watchIdRef = useRef(null);

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('yardit_hunt_stops', JSON.stringify(huntStops));
  }, [huntStops]);

  useEffect(() => {
    localStorage.setItem('yardit_hunt_integrity', integrityAccepted);
  }, [integrityAccepted]);

  // GPS Watcher
  useEffect(() => {
    if (huntMode && navigator.geolocation) {
      console.log("Starting Hunt GPS Watcher");
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading
          });
        },
        (error) => {
          console.warn("Hunt GPS Error:", error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000
        }
      );
    } else {
      if (watchIdRef.current !== null) {
        console.log("Stopping Hunt GPS Watcher");
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsLocation(null);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [huntMode]);

  // Actions
  const addToHunt = useCallback((listing) => {
    setHuntStops(prev => {
      if (prev.some(s => s.id === listing.id)) {
        toast.info("Already in your hunt!");
        return prev;
      }
      // Store minimal data + status
      const newStop = {
        ...listing, // Keep full listing data for display
        huntStatus: 'not_started', // not_started, arrived, completed
        addedAt: new Date().toISOString()
      };
      toast.success("Added to Hunt!");
      return [...prev, newStop];
    });
  }, []);

  const removeFromHunt = useCallback((listingId) => {
    setHuntStops(prev => prev.filter(s => s.id !== listingId));
    toast.success("Removed from Hunt");
  }, []);

  const updateStopStatus = useCallback((listingId, status) => {
    setHuntStops(prev => {
      const updated = prev.map(s => 
        s.id === listingId ? { ...s, huntStatus: status } : s
      );
      if (status === 'completed' && updated.length >= 3) {
        // Recalculate order when marked completed
        const unvisited = [...updated];
        const start = unvisited.shift();
        const optimized = [start];
        while (unvisited.length > 0) {
          const current = optimized[optimized.length - 1];
          let nearestIdx = -1;
          let minDist = Infinity;
          for (let i = 0; i < unvisited.length; i++) {
            const d = calcDist(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
            if (d < minDist) {
              minDist = d;
              nearestIdx = i;
            }
          }
          optimized.push(unvisited[nearestIdx]);
          unvisited.splice(nearestIdx, 1)[0];
        }
        return optimized;
      }
      return updated;
    });
  }, []);

  const acceptIntegrityNotice = useCallback(() => {
    setIntegrityAccepted(true);
  }, []);

  const clearHunt = useCallback(() => {
    if (confirm("Clear all stops from your hunt?")) {
      setHuntStops([]);
      setHuntMode(false);
      toast.success("Hunt cleared");
    }
  }, []);

  // Route calculation (Simple "as the crow flies" total distance)
  // In a real app we might optimize order, but per requirements we only recalc on demand
  const getTotalDistance = useCallback(() => {
    if (huntStops.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < huntStops.length - 1; i++) {
      // Using a simple haversine or similar helper
      const dist = calcDist(
        huntStops[i].lat, huntStops[i].lng,
        huntStops[i+1].lat, huntStops[i+1].lng
      );
      total += dist;
    }
    return total; // in miles/km depending on calcDist
  }, [huntStops]);

  // Simple distance calc (Haversine approx)
  const calcDist = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Radius of Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const reorderStops = useCallback((newOrder) => {
      setHuntStops(newOrder);
  }, []);

  const fetchRoute = useCallback(async (origin, stops) => {
    if (!MAPBOX_ROUTE_ENABLED) return;
    
    // Waypoint Limit Guard: Route only first 10 stops
    const MAX_WAYPOINTS = 10;
    const targetStops = stops.slice(0, MAX_WAYPOINTS);
    
    if (targetStops.length === 0 && !origin) return;

    // Construct coordinates: origin first, then stops
    const coords = [];
    if (origin) coords.push([origin.lng, origin.lat]);
    targetStops.forEach(s => coords.push([s.lng, s.lat]));
    
    if (coords.length < 2) return;

    // Cache Key Check (simple prevention of spamming same route)
    const stopIds = targetStops.map(s => s.id).join(',');
    const originKey = origin ? `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}` : 'no-origin';
    const cacheKey = `${originKey}|${stopIds}`;
    
    if (routeMeta && routeMeta.cacheKey === cacheKey && (Date.now() - routeMeta.lastBuiltAt < 30000)) {
        console.log("Using cached route");
        return; 
    }

    const coordsString = coords.map(c => c.join(',')).join(';');
    const token = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&overview=full&steps=false&access_token=${token}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
            setRouteGeoJson(data.routes[0].geometry);
            setRouteMeta({
                lastBuiltAt: Date.now(),
                cacheKey,
                stopIdsUsed: targetStops.map(s => s.id),
                originUsed: origin
            });
        }
    } catch (e) {
        console.error("Mapbox Route Error", e);
        // Graceful failure: routeGeoJson remains null/stale, fallback UI will show dashed line
    }
  }, [routeMeta]);

  return (
    <HuntContext.Provider value={{
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
      routeGeoJson,
      routeMeta,
      fetchRoute,
      optimizeRoute: () => {
        if (huntStops.length < 3) return;
        const unvisited = [...huntStops];
        const start = unvisited.shift();
        const optimized = [start];

        while (unvisited.length > 0) {
          const current = optimized[optimized.length - 1];
          let nearestIdx = -1;
          let minDist = Infinity;

          for (let i = 0; i < unvisited.length; i++) {
            const d = calcDist(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
            if (d < minDist) {
              minDist = d;
              nearestIdx = i;
            }
          }
          optimized.push(unvisited[nearestIdx]);
          unvisited.splice(nearestIdx, 1)[0];
        }
        setHuntStops(optimized);
        toast.success("Route optimized!");
      }
    }}>
      {children}
    </HuntContext.Provider>
  );
}