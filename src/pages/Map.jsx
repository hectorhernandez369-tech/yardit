import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar, User, Search, Candy, ShoppingBag, ChevronDown } from "lucide-react";
import { format } from "date-fns";

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom marker icons
const yardSaleIcon = new L.Icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%23f97316' stroke='white' stroke-width='2'/%3E%3Ctext x='16' y='21' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3E$%3C/text%3E%3C/svg%3E",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const halloweenIcon = new L.Icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%239333ea' stroke='white' stroke-width='2'/%3E%3Ctext x='16' y='21' text-anchor='middle' fill='white' font-size='16'%3E🎃%3C/text%3E%3C/svg%3E",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

export default function MapPage() {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState([37.7749, -122.4194]); // Default to SF
  const [showSidebar, setShowSidebar] = useState(true);

  const { data: locations, isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: () => base44.entities.Location.list("-created_date"),
    initialData: [],
  });

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          console.log("Location access denied");
        }
      );
    }
  }, []);

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesFilter = filter === "all" || loc.type === filter;
      const matchesSearch =
        !searchQuery ||
        loc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch && loc.active;
    });
  }, [locations, filter, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: locations.filter((l) => l.active).length,
      yard_sale: locations.filter((l) => l.type === "yard_sale" && l.active).length,
      halloween_candy: locations.filter((l) => l.type === "halloween_candy" && l.active).length,
    };
  }, [locations]);

  return (
    <div className="h-[calc(100vh-140px)] relative">
      {/* Stats Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <Card className="bg-white/95 backdrop-blur-md shadow-xl border-0">
            <div className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by address or title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filter Tabs */}
                <Tabs value={filter} onValueChange={setFilter}>
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="all" className="gap-1">
                      <MapPin className="w-3 h-3" />
                      All ({stats.total})
                    </TabsTrigger>
                    <TabsTrigger value="yard_sale" className="gap-1">
                      <ShoppingBag className="w-3 h-3" />
                      Sales ({stats.yard_sale})
                    </TabsTrigger>
                    <TabsTrigger value="halloween_candy" className="gap-1">
                      <Candy className="w-3 h-3" />
                      Candy ({stats.halloween_candy})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Toggle Sidebar */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="sm:hidden"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSidebar ? "" : "rotate-180"}`} />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Map */}
      <div className="h-full w-full">
        <MapContainer
          center={mapCenter}
          zoom={13}
          className="h-full w-full"
          zoomControl={true}
        >
          <MapController center={mapCenter} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredLocations.map((location) => (
            <Marker
              key={location.id}
              position={[location.latitude, location.longitude]}
              icon={location.type === "yard_sale" ? yardSaleIcon : halloweenIcon}
            >
              <Popup>
                <div className="p-2">
                  <Badge
                    className={
                      location.type === "yard_sale"
                        ? "bg-orange-500 mb-2"
                        : "bg-purple-600 mb-2"
                    }
                  >
                    {location.type === "yard_sale" ? "🏡 Yard Sale" : "🎃 Halloween Candy"}
                  </Badge>
                  <h3 className="font-bold text-base mb-1">{location.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                  {location.description && (
                    <p className="text-sm mb-2">{location.description}</p>
                  )}
                  {location.date && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(location.date), "MMM d, yyyy")}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <User className="w-3 h-3" />
                    Added by {location.created_by?.split("@")[0] || "Anonymous"}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Sidebar - Mobile */}
      {showSidebar && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] sm:hidden">
          <Card className="rounded-t-2xl bg-white shadow-2xl max-h-64 overflow-y-auto">
            <div className="p-4 space-y-2">
              <h3 className="font-bold text-sm text-gray-700 mb-3">
                {filteredLocations.length} Location{filteredLocations.length !== 1 ? "s" : ""} Found
              </h3>
              {filteredLocations.slice(0, 5).map((location) => (
                <button
                  key={location.id}
                  onClick={() => setMapCenter([location.latitude, location.longitude])}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="text-lg">
                      {location.type === "yard_sale" ? "🏡" : "🎃"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{location.title}</p>
                      <p className="text-xs text-gray-500 truncate">{location.address}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}