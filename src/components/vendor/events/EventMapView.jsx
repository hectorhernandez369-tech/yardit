import { useState } from "react";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function EventMapView({ events, onViewEvent }) {
  const [selectedPin, setSelectedPin] = useState(null);

  // Placeholder map - in production, integrate with Leaflet or Mapbox
  return (
    <div className="relative w-full h-[600px] bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg overflow-hidden border">
      {/* Map Placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-16 w-16 mx-auto text-blue-300 mb-4" />
          <p className="text-gray-500 font-medium">Map View</p>
          <p className="text-gray-400 text-sm mt-1">Events would be displayed as pins on an interactive map</p>
        </div>
      </div>

      {/* Event Pins (Mock) */}
      <div className="absolute inset-0 pointer-events-none">
        {events.slice(0, 5).map((event, index) => {
          const positions = [
            { top: "20%", left: "30%" },
            { top: "40%", left: "60%" },
            { top: "60%", left: "40%" },
            { top: "30%", left: "70%" },
            { top: "70%", left: "50%" },
          ];
          const pos = positions[index % positions.length];

          return (
            <button
              key={event.id}
              onClick={() => setSelectedPin(event)}
              className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="relative group">
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg hover:bg-amber-600 transition-colors">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                  <p className="text-xs text-gray-600">{event.distance} miles</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Pin Preview Dialog */}
      {selectedPin && (
        <Dialog open={true} onOpenChange={() => setSelectedPin(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedPin.title}</span>
                <Button variant="ghost" size="icon" onClick={() => setSelectedPin(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-amber-500" />
                <span>{selectedPin.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{selectedPin.distance} miles away</span>
              </div>
              <p className="text-sm text-gray-600">{selectedPin.description}</p>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    setSelectedPin(null);
                    onViewEvent(selectedPin);
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-600"
                >
                  View Event
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}