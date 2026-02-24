import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from "sonner";

export const HUNT_ENABLED = true;
export const MAPBOX_ROUTE_ENABLED = true;
const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";

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

  const fetchRoute = useCallback(async () => {
    if (!MAPBOX_ROUTE_ENABLED) return;
    
    const candidates = huntStops.filter(s => s.huntStatus !== 'completed' && s.huntStatus !== 'skipped');
    if (candidates.length === 0) {
      setRouteGeoJson(null);
      return;
    }

    let coordinates = [];
    let originDesc = '';

    if (gpsLocation) {
      coordinates.push(`${gpsLocation.lng},${gpsLocation.lat}`);
      originDesc = 'gps';
    } else {
      const first = candidates[0];
      coordinates.push(`${first.lng},${first.lat}`);
      originDesc = first.id;
    }

    // Determine waypoints (destinations)
    const destinations = (originDesc === 'gps') ? candidates : candidates.slice(1);
    
    if (destinations.length === 0 && originDesc !== 'gps') {
       // Only one point and it's the start, no route needed
       setRouteGeoJson(null);
       return;
    }

    // Waypoint limit guard: max 10 stops
    const limitedDestinations = destinations.slice(0, 10);
    limitedDestinations.forEach(stop => {
      coordinates.push(`${stop.lng},${stop.lat}`);
    });

    if (coordinates.length < 2) {
      setRouteGeoJson(null);
      return;
    }

    const stopIds = limitedDestinations.map(s => s.id).join(',');
    const metaKey = `${originDesc}-${stopIds}`;

    // Cache check
    if (routeMeta && routeMeta.key === metaKey && routeGeoJson) {
      toast.info("Route is up to date");
      return;
    }

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates.join(';')}?geometries=geojson&overview=full&steps=false&access_token=${MAPBOX_ACCESS_TOKEN}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        setRouteGeoJson(data.routes[0].geometry);
        setRouteMeta({
          key: metaKey,
          lastBuiltAt: Date.now()
        });
        toast.success("Route updated");
      } else {
        console.error("Mapbox no route found", data);
        setRouteGeoJson(null);
        toast.error("Could not calculate road route, using direct line.");
      }
    } catch (e) {
      console.error("Mapbox error", e);
      setRouteGeoJson(null);
      toast.error("Network error, using direct line.");
    }
  }, [huntStops, gpsLocation, routeMeta, routeGeoJson]);

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