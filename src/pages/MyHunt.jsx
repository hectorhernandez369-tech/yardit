import React, { useEffect, useState } from 'react';
import { useHunt, HUNT_ENABLED } from '../components/hunt/HuntContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, Navigation, Trash2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function MyHuntPage() {
  const navigate = useNavigate();
  const hunt = useHunt();

  const huntStops = hunt?.huntStops || [];
  const removeFromHunt = hunt?.removeFromHunt || (() => {});
  const updateStopStatus = hunt?.updateStopStatus || (() => {});
  const integrityAccepted = hunt?.integrityAccepted || false;
  const acceptIntegrityNotice = hunt?.acceptIntegrityNotice || (() => {});
  const setHuntMode = hunt?.setHuntMode || (() => {});
  const getTotalDistance = hunt?.getTotalDistance || (() => 0);
  const clearHunt = hunt?.clearHunt || (() => {});
  const optimizeRoute = hunt?.optimizeRoute || (() => {});

  const [showIntegrity, setShowIntegrity] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [incompleteStops, setIncompleteStops] = useState([]);

  useEffect(() => {
    setShowIntegrity(HUNT_ENABLED && !integrityAccepted && huntStops.length > 0);
  }, [integrityAccepted, huntStops.length]);

  const handleMapMyHunt = () => {
    setHuntMode(true);
    navigate(createPageUrl("Home"));
  };

  const handleNavigate = (stops) => {
    if (stops.length === 0) return;
    const origin = "Current+Location";
    const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
    const waypoints = stops.slice(0, -1).map((stop) => `${stop.lat},${stop.lng}`).join('|');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const handleGlobalDirections = () => {
    const incomplete = huntStops.filter((stop) => stop.huntStatus !== 'completed');
    if (incomplete.length === 0) return;
    if (incomplete.length <= 10) {
      handleNavigate(incomplete);
      return;
    }
    setIncompleteStops(incomplete);
    setShowBatchModal(true);
  };

  if (!HUNT_ENABLED) {
    return <div className="p-8 text-center">Hunt feature is disabled.</div>;
  }

  return (
    <div className="p-4 max-w-3xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2C4F4E]">My Hunt ({huntStops.length})</h1>
          <p className="text-sm text-gray-500">Est. Distance: {getTotalDistance().toFixed(1)} mi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={optimizeRoute} disabled={huntStops.length < 3}>Optimize</Button>
          <Button variant="outline" size="sm" onClick={clearHunt} disabled={huntStops.length === 0}>Clear</Button>
          <Button onClick={handleMapMyHunt} className="bg-[#5DADA5] hover:bg-[#4A9B93]" disabled={huntStops.length === 0}>
            <Map className="w-4 h-4 mr-2" />
            Map My Hunt
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <Button variant="secondary" className="w-full border-2 border-[#2C4F4E]" onClick={handleGlobalDirections} disabled={huntStops.length === 0}>
          <Navigation className="w-4 h-4 mr-2" />
          Get Directions (Google/Apple Maps)
        </Button>
      </div>

      <div className="space-y-4">
        {huntStops.map((stop, index) => (
          <Card
            key={stop.id}
            className={`border-l-4 ${stop.huntStatus === 'completed' ? 'border-l-green-500 opacity-60' : stop.huntStatus === 'arrived' ? 'border-l-blue-500' : 'border-l-gray-300'}`}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-gray-500">#{index + 1}</span>
                    <h3 className="font-bold text-[#2C4F4E]">{stop.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600">{stop.addressText}</p>
                </div>
                <Badge variant={stop.huntStatus === 'completed' ? 'default' : 'outline'}>
                  {stop.huntStatus === 'not_started' ? 'Pending' : stop.huntStatus === 'arrived' ? 'Arrived' : 'Done'}
                </Badge>
              </div>

              <div className="flex gap-2 mt-4 overflow-x-auto">
                {stop.huntStatus !== 'completed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => updateStopStatus(stop.id, 'arrived')}
                    disabled={stop.huntStatus === 'arrived'}
                  >
                    Arrived
                  </Button>
                )}

                <Button
                  size="sm"
                  variant={stop.huntStatus === 'completed' ? 'secondary' : 'default'}
                  className={stop.huntStatus === 'completed' ? '' : 'bg-green-600 hover:bg-green-700'}
                  onClick={() => updateStopStatus(stop.id, stop.huntStatus === 'completed' ? 'not_started' : 'completed')}
                >
                  {stop.huntStatus === 'completed' ? 'Undo' : 'Complete'}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => removeFromHunt(stop.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {huntStops.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Map className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No stops added yet.</p>
            <p className="text-sm">Go to the map or list to add sales to your hunt.</p>
            <Button variant="link" onClick={() => navigate(createPageUrl("Home"))}>Find Sales</Button>
          </div>
        )}
      </div>

      <Dialog open={showBatchModal} onOpenChange={setShowBatchModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Navigate in Batches</DialogTitle>
            <DialogDescription>
              Maps only supports navigating up to 10 stops at a time. You have {incompleteStops.length} stops left.
              Which batch would you like to navigate to?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            {Array.from({ length: Math.ceil(incompleteStops.length / 10) }).map((_, i) => {
              const start = i * 10;
              const end = Math.min((i + 1) * 10, incompleteStops.length);
              return (
                <Button
                  key={i}
                  variant="outline"
                  onClick={() => {
                    handleNavigate(incompleteStops.slice(start, end));
                    setShowBatchModal(false);
                  }}
                >
                  Navigate stops {start + 1} to {end}
                </Button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBatchModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIntegrity} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Hunt Integrity Notice
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <p>Please drive safely and respect neighborhood rules.</p>
              <p><strong>Do not block driveways.</strong></p>
              <p><strong>Do not enter properties before start times.</strong></p>
              <p>Yardit Hunt is a tool to help you organize your route. Navigation is provided by external apps.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                acceptIntegrityNotice();
                setShowIntegrity(false);
              }}
            >
              I Agree & Start Hunt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}