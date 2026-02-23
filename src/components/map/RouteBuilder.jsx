import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Route, X, Navigation, Trash2, Map as MapIcon, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHunt } from "@/components/hunt/HuntContext";
import { openExternalMaps } from "@/components/hunt/huntUtils";

export default function RouteBuilder({ selectedLocations, onRemoveLocation, onClearAll, onBuildRoute, routeActive }) {
  const { huntStops, updateStopStatus, huntMode, setHuntMode, getTotalDistance } = useHunt() || { 
    huntStops: selectedLocations || [], 
    updateStopStatus: () => {}, 
    huntMode: false, 
    setHuntMode: () => {}, 
    getTotalDistance: () => 0 
  };

  if (huntStops.length === 0) {
    return (
      <Card className="border-2 border-dashed border-[#2C4F4E] bg-[#E7D7B8]">
        <CardContent className="p-3 text-center">
          <Route className="w-5 h-5 text-[#2C4F4E] mx-auto mb-1" />
          <p className="text-xs text-[#2C4F4E]">Click locations to add to route</p>
        </CardContent>
      </Card>
    );
  }

  const handleDirections = () => {
    const remaining = huntStops.filter(s => s.huntStatus !== 'completed');
    openExternalMaps(remaining);
  };

  return (
    <Card className="border-2 border-[#2C4F4E] bg-[#E7D7B8] shadow-lg">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5 text-[#2C4F4E]">
            <MapIcon className="w-4 h-4 text-[#5DADA5]" />
            Treasure Map
            <Badge variant="outline" className="ml-1 text-xs border-[#2C4F4E] text-[#2C4F4E]">{huntStops.length} Stops</Badge>
            {huntMode && huntStops.length > 1 && (
              <Badge variant="outline" className="ml-1 text-xs border-[#2C4F4E] text-[#2C4F4E]">{getTotalDistance().toFixed(1)} mi</Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        <ScrollArea className="h-40">
          <div className="space-y-1.5 pr-2">
            {huntStops.map((location, index) => {
              const isCompleted = location.huntStatus === 'completed';
              return (
                <div key={location.id} className={`flex items-start gap-1.5 p-1.5 bg-[#F3E6CF] rounded border border-[#2C4F4E] transition-opacity ${isCompleted ? 'opacity-50 grayscale' : ''}`}>
                  <div className="w-5 h-5 bg-[#5DADA5] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#2C4F4E] line-clamp-1">{location.title}</p>
                    <div className="mt-1 flex gap-1">
                      {location.huntStatus === 'not_started' || !location.huntStatus ? (
                        <Button size="sm" variant="outline" className="h-5 text-[10px] px-2 bg-white" onClick={() => updateStopStatus(location.id, 'arrived')}>
                          Checked In
                        </Button>
                      ) : location.huntStatus === 'arrived' ? (
                        <Button size="sm" className="h-5 text-[10px] px-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => updateStopStatus(location.id, 'completed')}>
                          Complete
                        </Button>
                      ) : (
                        <span className="text-[10px] text-green-700 flex items-center gap-1 font-semibold"><CheckCircle className="w-3 h-3"/> Completed</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveLocation(location.id)}
                    className="h-5 w-5 p-0 hover:bg-red-100"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {!huntMode ? (
          <Button
            onClick={() => { onBuildRoute(); setHuntMode(true); }}
            disabled={huntStops.length < 2}
            className="w-full gap-1.5 bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] h-8 text-xs font-semibold"
          >
            <Navigation className="w-3 h-3" />
            Map My Yardsail
          </Button>
        ) : (
          <Button
            onClick={handleDirections}
            className="w-full gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-800 h-8 text-xs font-semibold"
          >
            <Navigation className="w-3 h-3" />
            Get Directions
          </Button>
        )}

        {huntStops.length === 1 && (
          <p className="text-[10px] text-center text-[#2C4F4E]/70">Add one more location</p>
        )}
      </CardContent>
    </Card>
  );
}