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
        <CardContent className="p-3 text-center">
          <Route className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <p className="text-xs text-gray-600">Click locations to add to route</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-500 shadow-lg">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Route className="w-4 h-4 text-blue-600" />
            Route
            <Badge variant="outline" className="ml-1 text-xs">{selectedLocations.length}</Badge>
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
              <div key={location.id} className="flex items-center gap-1.5 p-1.5 bg-gray-50 rounded">
                <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{location.title}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveLocation(location.id)}
                  className="h-5 w-5 p-0"
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
          className="w-full gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 h-8 text-xs"
        >
          <Navigation className="w-3 h-3" />
          {routeActive ? "Active" : "Build Route"}
        </Button>

        {selectedLocations.length === 1 && (
          <p className="text-[10px] text-center text-gray-500">Add one more location</p>
        )}
      </CardContent>
    </Card>
  );
}