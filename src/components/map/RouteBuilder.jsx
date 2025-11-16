import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Route, X, Navigation, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function RouteBuilder({ selectedLocations, onRemoveLocation, onClearAll, onBuildRoute, routeActive }) {
  if (selectedLocations.length === 0) {
    return (
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="p-6 text-center">
          <Route className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Click on locations to add them to your route</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-500 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="w-5 h-5 text-blue-600" />
            Route Builder
            <Badge variant="outline" className="ml-2">{selectedLocations.length} stops</Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-40">
          <div className="space-y-2 pr-4">
            {selectedLocations.map((location, index) => (
              <div key={location.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{location.title}</p>
                  <p className="text-xs text-gray-500 truncate">{location.address}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveLocation(location.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Button
          onClick={onBuildRoute}
          disabled={selectedLocations.length < 2 || routeActive}
          className="w-full gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
        >
          <Navigation className="w-4 h-4" />
          {routeActive ? "Route Active" : "Build Optimal Route"}
        </Button>

        {selectedLocations.length === 1 && (
          <p className="text-xs text-center text-gray-500">Add at least one more location to build a route</p>
        )}
      </CardContent>
    </Card>
  );
}