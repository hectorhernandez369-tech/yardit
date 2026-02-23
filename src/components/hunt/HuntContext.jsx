import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";

export const HUNT_ENABLED = true;

const HuntContext = createContext();

export function useHunt() {
  return useContext(HuntContext);
}

export function HuntProvider({ children }) {
  const [huntStops, setHuntStops] = useState([]);
  const [isHuntActive, setIsHuntActive] = useState(false);
  const [huntIntegrityNoticeSeen, setHuntIntegrityNoticeSeen] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    if (!HUNT_ENABLED) return;
    try {
      const savedStops = localStorage.getItem("yardit_hunt_stops");
      if (savedStops) {
        setHuntStops(JSON.parse(savedStops));
      }
      const savedNotice = localStorage.getItem("yardit_hunt_notice_seen");
      if (savedNotice) {
        setHuntIntegrityNoticeSeen(JSON.parse(savedNotice));
      }
    } catch (e) {
      console.error("Failed to load hunt data", e);
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (!HUNT_ENABLED) return;
    localStorage.setItem("yardit_hunt_stops", JSON.stringify(huntStops));
  }, [huntStops]);

  useEffect(() => {
    if (!HUNT_ENABLED) return;
    localStorage.setItem("yardit_hunt_notice_seen", JSON.stringify(huntIntegrityNoticeSeen));
  }, [huntIntegrityNoticeSeen]);

  const addStop = (listing) => {
    if (!HUNT_ENABLED) return;
    if (huntStops.some((s) => s.id === listing.id)) {
      toast.info("Listing already in your hunt!");
      return;
    }
    const newStop = {
      ...listing,
      huntStatus: "not_started", // not_started, arrived, completed
    };
    setHuntStops((prev) => [...prev, newStop]);
    toast.success("Added to your hunt!");
  };

  const removeStop = (listingId) => {
    if (!HUNT_ENABLED) return;
    setHuntStops((prev) => prev.filter((s) => s.id !== listingId));
    toast.success("Removed from hunt");
  };

  const updateStopStatus = (listingId, status) => {
    if (!HUNT_ENABLED) return;
    setHuntStops((prev) =>
      prev.map((s) => (s.id === listingId ? { ...s, huntStatus: status } : s))
    );
  };

  const clearHunt = () => {
    if (!HUNT_ENABLED) return;
    if (window.confirm("Are you sure you want to clear your entire hunt?")) {
      setHuntStops([]);
      setIsHuntActive(false);
      toast.success("Hunt cleared");
    }
  };

  const toggleHuntMode = () => {
    if (!HUNT_ENABLED) return;
    if (huntStops.length === 0 && !isHuntActive) {
      toast.error("Add stops to your hunt first!");
      return;
    }
    setIsHuntActive((prev) => !prev);
  };

  const markNoticeSeen = () => {
    setHuntIntegrityNoticeSeen(true);
  };
  
  // Simple "Recalculate" - for now just reorders by distance from a point if we implemented that,
  // but prompt says "Recalculate route order ONLY when... user taps Recalculate".
  // For Phase 3, we'll implement a simple sorter or just keep it manual/as-added.
  // We'll expose a function for it.
  const recalculateRoute = (currentLat, currentLng) => {
    if (!HUNT_ENABLED || !currentLat || !currentLng) return;
    
    // Simple nearest neighbor or just sort by distance from current location for the first one?
    // Let's just sort by distance from current location for now as a basic "optimization"
    // optimization logic can be improved later.
    const sorted = [...huntStops].sort((a, b) => {
      const distA = Math.hypot(a.lat - currentLat, a.lng - currentLng);
      const distB = Math.hypot(b.lat - currentLat, b.lng - currentLng);
      return distA - distB;
    });
    setHuntStops(sorted);
    toast.success("Route recalculated based on your location");
  };

  const value = {
    huntStops,
    isHuntActive,
    addStop,
    removeStop,
    updateStopStatus,
    clearHunt,
    toggleHuntMode,
    huntIntegrityNoticeSeen,
    markNoticeSeen,
    recalculateRoute,
    HUNT_ENABLED
  };

  return <HuntContext.Provider value={value}>{children}</HuntContext.Provider>;
}