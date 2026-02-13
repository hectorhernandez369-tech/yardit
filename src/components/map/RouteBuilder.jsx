import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Route, X, Navigation, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function RouteBuilder({ selectedLocations, onRemoveLocation, onClearAll, onBuildRoute, routeActive }) {
  if (selectedLocations.length === 0) {
    return (
      <Card className="border-2 border-dashed border-[#2C4F4E] bg-[#E7D7B8]">
        <CardContent className="p-3 text-center">
          <Route className="w-5 h-5 text-[#2C4F4E] mx-auto mb-1" />
          <p className="text-xs text-[#2C4F4E]">Click locations to add to route</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-[#2C4F4E] bg-[#E7D7B8] shadow-lg">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5 text-[#2C4F4E]">
            <Route className="w-4 h-4 text-[#5DADA5]" />
            Route
            <Badge variant="outline" className="ml-1 text-xs border-[#2C4F4E] text-[#2C4F4E]">{selectedLocations.length}</Badge>
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
        <ScrollArea className="h-24">
          <div className="space-y-1.5 pr-2">
            {selectedLocations.map((location, index) => (
              <div key={location.id} className="flex items-center gap-1.5 p-1.5 bg-[#F3E6CF] rounded border border-[#2C4F4E]">
                <div className="w-5 h-5 bg-[#5DADA5] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-[#2C4F4E]">{location.title}</p>
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
            ))}
          </div>
        </ScrollArea>

        <Button
          onClick={onBuildRoute}
          disabled={selectedLocations.length < 2 || routeActive}
          className="w-full gap-1.5 bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] h-8 text-xs font-semibold"
        >
          <Navigation className="w-3 h-3" />
          {routeActive ? "Active" : "Build Route"}
        </Button>

        {selectedLocations.length === 1 && (
          <p className="text-[10px] text-center text-[#2C4F4E]/70">Add one more location</p>
        )}
      </CardContent>
    </Card>
  );
}