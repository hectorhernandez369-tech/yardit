import React, { useState, useEffect } from "react";
import { useHunt } from "@/components/hunt/HuntContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Navigation, CheckCircle, Trash2, RotateCcw, Play } from "lucide-react";
import { openExternalMaps, calculateTotalDistance } from "@/components/hunt/huntUtils";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function MyHuntPage() {
  const { 
    huntStops, 
    removeStop, 
    updateStopStatus, 
    clearHunt, 
    isHuntActive, 
    toggleHuntMode, 
    huntIntegrityNoticeSeen, 
    markNoticeSeen,
    recalculateRoute,
    HUNT_ENABLED
  } = useHunt();
  
  const navigate = useNavigate();
  const [showIntegrityModal, setShowIntegrityModal] = useState(false);
  const [navigateModalOpen, setNavigateModalOpen] = useState(false);
  const [navigationBatch, setNavigationBatch] = useState(1); // 1 or 2 (for >10 stops)

  useEffect(() => {
    if (HUNT_ENABLED && huntStops.length > 0 && !huntIntegrityNoticeSeen) {
      setShowIntegrityModal(true);
    }
  }, [huntStops, huntIntegrityNoticeSeen, HUNT_ENABLED]);

  const handleIntegrityAck = () => {
    markNoticeSeen();
    setShowIntegrityModal(false);
  };

  const handleNavigate = () => {
    if (huntStops.length > 10) {
      setNavigateModalOpen(true);
    } else {
      openExternalMaps(huntStops);
    }
  };

  const handleBatchNavigate = (batch) => {
    setNavigateModalOpen(false);
    if (batch === 1) {
      openExternalMaps(huntStops.slice(0, 10));
    } else {
      openExternalMaps(huntStops.slice(9, 19)); // Overlap one for continuity? Or just next batch. 
      // Google maps allows 10 points total (origin + dest + 8 waypoints) usually, or sometimes more.
      // Prompt says "Navigate first 10, Navigate next 10".
      // Slice 0-10 takes 10 items.
      // Slice 10-20 takes next 10.
      openExternalMaps(huntStops.slice(10, 20));
    }
  };

  const handleRecalculate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          recalculateRoute(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          toast.error("Could not get location for recalculation");
        }
      );
    } else {
      toast.error("Geolocation not supported");
    }
  };

  if (!HUNT_ENABLED) return <div>Feature disabled</div>;

  const totalDist = calculateTotalDistance(huntStops).toFixed(1);

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2C4F4E]">My Hunt ({huntStops.length})</h1>
          <p className="text-sm text-gray-600">Total Est. Distance: {totalDist} mi</p>
        </div>
        <div className="flex gap-2">
          {huntStops.length > 0 && (
            <Button variant="destructive" size="sm" onClick={clearHunt}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      {huntStops.length === 0 ? (
        <div className="text-center py-12 bg-white/50 rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">Your hunt list is empty.</p>
          <Button onClick={() => navigate(createPageUrl("Home"))}>
            Find Sales on Map
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6 sticky top-0 bg-[#F3E6CF] py-2 z-10">
            <Button 
              className={`flex-1 ${isHuntActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
              onClick={() => {
                toggleHuntMode();
                if (!isHuntActive) {
                  navigate(createPageUrl("Home"));
                  toast.success("Hunt Mode Active! Map updated.");
                } else {
                  toast.info("Hunt Mode Paused");
                }
              }}
            >
              {isHuntActive ? "Pause Hunt Mode" : "Map My Hunt"}
            </Button>
            
            <Button variant="outline" className="flex-1" onClick={handleNavigate}>
              <Navigation className="w-4 h-4 mr-2" />
              Directions
            </Button>
            
            <Button variant="outline" size="icon" onClick={handleRecalculate} title="Recalculate Route from My Location">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {huntStops.map((stop, index) => (
              <Card key={stop.id} className={`border-l-4 ${
                stop.huntStatus === 'completed' ? 'border-l-gray-400 bg-gray-50 opacity-75' : 
                stop.huntStatus === 'arrived' ? 'border-l-blue-500 bg-blue-50' : 
                'border-l-amber-500'
              }`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold">
                        {index + 1}
                      </span>
                      <h3 className="font-semibold text-lg leading-tight">{stop.title}</h3>
                    </div>
                    <Badge variant={stop.huntStatus === 'completed' ? "secondary" : "outline"}>
                      {stop.huntStatus === 'not_started' ? 'Not Started' : 
                       stop.huntStatus === 'arrived' ? 'Arrived' : 'Completed'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 ml-8">{stop.addressText}</p>
                  
                  <div className="flex flex-wrap gap-2 ml-8">
                    {stop.huntStatus !== 'completed' && (
                      <Button 
                        size="sm" 
                        variant={stop.huntStatus === 'arrived' ? "default" : "secondary"}
                        onClick={() => updateStopStatus(stop.id, stop.huntStatus === 'arrived' ? 'completed' : 'arrived')}
                        className="h-8"
                      >
                        {stop.huntStatus === 'arrived' ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" /> Complete
                          </>
                        ) : (
                          <>
                            <MapPin className="w-3 h-3 mr-1" /> Arrived
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openExternalMaps([stop])}
                      className="h-8"
                    >
                      <Navigation className="w-3 h-3 mr-1" /> Go
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto"
                      onClick={() => removeStop(stop.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Integrity Notice Modal */}
      <Dialog open={showIntegrityModal} onOpenChange={setShowIntegrityModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hunt Integrity Notice</DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>Welcome to Yardit Hunt Mode!</p>
              <p>Please drive safely and obey all traffic laws. Do not interact with the app while driving.</p>
              <p>Your hunt progress is saved on this device only.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleIntegrityAck}>I Understand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Navigation Batch Modal */}
      <Dialog open={navigateModalOpen} onOpenChange={setNavigateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Large Route Detected</DialogTitle>
            <DialogDescription>
              Navigation apps limit the number of stops. Please choose a batch to navigate.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button onClick={() => handleBatchNavigate(1)} className="w-full justify-between">
              Navigate Stops 1-10 <Play className="w-4 h-4" />
            </Button>
            <Button onClick={() => handleBatchNavigate(2)} className="w-full justify-between" variant="secondary">
              Navigate Remaining Stops <Play className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}