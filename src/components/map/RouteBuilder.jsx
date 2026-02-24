import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Route, X, Navigation, Trash2, Map as MapIcon, RefreshCw, Share2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { calculateTotalDistance, openExternalMaps, getGoogleMapsUrl } from "../hunt/huntUtils";
import { toast } from "sonner";
import { useHunt } from "../hunt/HuntContext";
import { isDemoMode } from "../shared/DemoMode";

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

export default function RouteBuilder({ selectedLocations, onRemoveLocation, onClearAll, onBuildRoute }) {
  const { updateStopStatus, yardsailActive, setYardsailActive, gpsLocation, setHuntMode, fetchRoute, routeDirty } = useHunt() || {};
  const [isBuildingRoute, setIsBuildingRoute] = useState(false);

  const runBuildRoute = () => {
    setHuntMode?.(true);
    setYardsailActive?.(true);
    if (onBuildRoute) onBuildRoute();

    if (gpsLocation) {
      fetchRoute?.(gpsLocation, selectedLocations);
      return;
    }

    setIsBuildingRoute(true);
    let done = false;

    const finalize = (origin) => {
      if (done) return;
      done = true;
      setIsBuildingRoute(false);
      fetchRoute?.(origin, selectedLocations);
    };

    const timer = setTimeout(() => finalize(null), 1000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          finalize({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          clearTimeout(timer);
          finalize(null);
        },
        { maximumAge: 60000, timeout: 1000 }
      );
    } else {
      clearTimeout(timer);
      finalize(null);
    }
  };

  if (selectedLocations.length === 0) {
    return (
      <Card className="border-[3px] border-dashed border-[#8b6b4a]/70 shadow-[inset_0_0_20px_rgba(139,107,74,0.3)] bg-gradient-to-br from-[#fdf5e6] via-[#f3e6cf] to-[#e7d7b8] relative overflow-hidden">
        {/* Ship Watermark */}
        <div 
          className="absolute inset-0 pointer-events-none bg-center bg-no-repeat bg-contain z-0" 
          style={{ opacity: 0.08, backgroundImage: 'url("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/35a6d7a95_file_0000000064207230a0f42d2fdbc76271.png")' }}
        />
        <div className="relative z-10">
          <CardContent className="p-4 text-center">
            <Route className="w-6 h-6 text-[#2C4F4E] mx-auto mb-2 opacity-70" />
            <p className="text-sm font-medium text-[#2C4F4E]/90">Click locations to add to route</p>
          </CardContent>
        </div>
      </Card>
    );
  }

  const handleStatusClick = (loc) => {
    const current = loc.huntStatus || "not_started";
    if (current === "not_started") {
      updateStopStatus?.(loc.id, "arrived");
    } else if (current === "arrived") {
      updateStopStatus?.(loc.id, "completed");
    }
  };

  const getStatusButton = (loc) => {
    const status = loc.huntStatus || "not_started";
    if (status === "completed") {
      return <Badge className="bg-gray-400 text-white text-[10px] h-5">Completed</Badge>;
    }
    if (status === "skipped") {
      return <Badge className="bg-gray-400 text-white text-[10px] h-5">Skipped</Badge>;
    }
    if (status === "arrived") {
      return (
        <Button size="sm" onClick={() => handleStatusClick(loc)} className="h-5 px-1.5 text-[10px] bg-green-600 hover:bg-green-700 text-white">
          Complete
        </Button>
      );
    }
    
    // status === "not_started"
    const isDemo = isDemoMode();
    const distanceMeters = gpsLocation ? calculateDistanceMeters(gpsLocation.lat, gpsLocation.lng, loc.lat, loc.lng) : Infinity;
    const isWithinDistance = isDemo || distanceMeters <= 15;

    if (isWithinDistance) {
      return (
        <Button size="sm" onClick={() => handleStatusClick(loc)} variant="outline" className="h-5 px-1.5 text-[10px] border-green-600 text-green-700 hover:bg-green-50 bg-white/50 flex-shrink-0">
          Check In
        </Button>
      );
    } else {
      return (
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <div className="flex gap-1">
            <Button size="sm" onClick={() => updateStopStatus?.(loc.id, "skipped")} variant="outline" className="h-5 px-1.5 text-[10px] border-orange-400 text-orange-600 hover:bg-orange-50 bg-white/50">
              Skip
            </Button>
            <Button size="sm" disabled variant="outline" className="h-5 px-1.5 text-[10px] border-gray-400 text-gray-500 bg-gray-100 opacity-60">
              Check In
            </Button>
          </div>
          <span className="text-[8px] text-gray-500 text-center leading-tight">Move within 50ft<br/>to check in</span>
        </div>
      );
    }
  };

  const remainingStops = selectedLocations.filter(s => s.huntStatus !== "completed" && s.huntStatus !== "skipped");

  const handleShare = () => {
    const url = getGoogleMapsUrl(remainingStops);
    if (!url) {
      toast.error("No active stops to share");
      return;
    }
    if (navigator.share) {
      navigator.share({
        title: 'My Yardit Treasure Map',
        text: `Check out my route for today's Yardit treasure hunt!`,
        url: url,
      }).catch(err => {
        console.log("Error sharing:", err);
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Route link copied to clipboard!");
    }
  };

  // Find the index of the first remaining stop to highlight it as "Next"
  const firstRemainingIndex = selectedLocations.findIndex(s => s.huntStatus !== "completed" && s.huntStatus !== "skipped");

  return (
    <Card className="border-[3px] border-[#8b6b4a] shadow-[inset_0_0_20px_rgba(139,107,74,0.3),0_10px_25px_rgba(0,0,0,0.4)] bg-gradient-to-br from-[#fdf5e6] via-[#f3e6cf] to-[#e7d7b8] relative overflow-hidden flex flex-col max-h-[60vh]">
      {/* Ship Watermark */}
      <div 
        className="absolute inset-0 pointer-events-none bg-center bg-no-repeat bg-contain z-0" 
        style={{ opacity: 0.08, backgroundImage: 'url("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/35a6d7a95_file_0000000064207230a0f42d2fdbc76271.png")' }}
      />
      
      {/* Content wrapper with z-index to stay above watermark */}
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        <CardHeader className="pb-2 pt-3 px-3 pr-14 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <CardTitle className="text-sm flex items-center gap-1.5 text-[#2C4F4E]">
            <MapIcon className="w-4 h-4 text-[#5DADA5]" />
            Treasure Map
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="text-[#2C4F4E] hover:text-[#5DADA5] h-6 px-2"
              title="Share Route"
            >
              <Share2 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
              title="Clear Route"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#2C4F4E] font-medium flex-wrap">
          <span>Stops: {selectedLocations.length}</span>
          <span>Est. Dist: {calculateTotalDistance(selectedLocations).toFixed(1)} mi</span>
          {selectedLocations.length > 10 && (
            <span className="text-[10px] text-orange-600 w-full sm:w-auto">⚠️ Route preview limited to 10 stops.</span>
          )}
          {yardsailActive && routeDirty && (
            <span className="text-[10px] text-red-600 font-bold w-full sm:w-auto">Route out of date — tap Recalculate.</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3 flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 h-full min-h-[150px]">
          <div className="space-y-1.5 pr-3 pb-1">
            {selectedLocations.map((location, index) => {
              const isCompleted = location.huntStatus === "completed";
              const isSkipped = location.huntStatus === "skipped";
              const isNext = index === firstRemainingIndex;
              const isDimmed = isCompleted || isSkipped;
              
              return (
                <div key={location.id} className={`flex items-center gap-1.5 p-1.5 rounded border transition-opacity ${isDimmed ? 'opacity-50 bg-[#e5d5b5]/70 border-[#8b6b4a]/50' : isNext ? 'bg-white/90 border-[#F4A849] shadow-sm' : 'bg-[#F3E6CF]/90 border-[#2C4F4E]'} backdrop-blur-sm`}>
                  <div className={`w-5 h-5 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isNext ? 'bg-[#F4A849]' : isDimmed ? 'bg-gray-400' : 'bg-[#5DADA5]'}`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-[#2C4F4E]">{location.title}</p>
                  </div>
                  {getStatusButton(location)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveLocation(location.id)}
                    className="h-5 w-5 p-0 hover:bg-red-100 flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {!yardsailActive ? (
          <Button
            onClick={runBuildRoute}
            disabled={selectedLocations.length < 2 || isBuildingRoute}
            className="w-full gap-1.5 bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] h-8 text-xs font-semibold"
          >
            {isBuildingRoute ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Navigation className="w-3 h-3" />
            )}
            {isBuildingRoute ? "Getting your location..." : "Map My Yardsail"}
          </Button>
        ) : (
          <div className="flex gap-2 w-full">
             <Button
               onClick={runBuildRoute}
               disabled={isBuildingRoute}
               variant="outline"
               className="h-8 w-8 p-0 border-blue-600 text-blue-600 hover:bg-blue-50 flex-shrink-0"
               title="Recalculate Route"
             >
               <RefreshCw className={`w-4 h-4 ${isBuildingRoute ? 'animate-spin' : ''}`} />
             </Button>
            <Button
              onClick={() => openExternalMaps(remainingStops.slice(0, 10))}
              disabled={remainingStops.length === 0}
              className="flex-1 gap-1.5 bg-[#5DADA5] hover:bg-[#4A9B93] text-white border-2 border-[#2C4F4E] h-8 text-xs font-semibold"
            >
              <Navigation className="w-3 h-3" />
              Get Directions
            </Button>
            <Button
              onClick={() => {
                setYardsailActive?.(false);
                setHuntMode?.(false);
              }}
              variant="outline"
              className="gap-1.5 border-2 border-red-600 text-red-600 hover:bg-red-50 h-8 text-xs font-semibold"
            >
              <X className="w-3 h-3" />
              End
            </Button>
          </div>
        )}

        {selectedLocations.length === 1 && !yardsailActive && (
          <p className="text-[10px] text-center text-[#2C4F4E]/70 shrink-0">Add one more location</p>
        )}
      </CardContent>
      </div>
    </Card>
  );
}