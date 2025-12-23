import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Tier-based icons
const createIcon = (tier) => {
  const colors = {
    free: "#64748b",
    featured: "#9333ea",
    premium: "#d97706",
    neighborhood_tier: "#059669"
  };

  const labels = {
    free: "F",
    featured: "★",
    premium: "💎",
    neighborhood_tier: "N"
  };

  return new L.Icon({
    iconUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='${encodeURIComponent(colors[tier])}' stroke='white' stroke-width='2'/%3E%3Ctext x='16' y='21' text-anchor='middle' fill='white' font-size='14' font-weight='bold'%3E${labels[tier]}%3C/text%3E%3C/svg%3E`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

// Calculate distance in feet
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 5280; // Convert to feet
}

export default function MapView({ listings, userLocation }) {
  const navigate = useNavigate();
  const [mapCenter, setMapCenter] = useState([37.7749, -122.4194]);
  const [zoom, setZoom] = useState(13);

  useEffect(() => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng]);
    }
  }, [userLocation]);

  // Filter listings based on tier and distance (zoom thresholding)
  const visibleListings = listings.filter((listing) => {
    if (!userLocation) return true;

    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      listing.lat,
      listing.lng
    );

    // Tier-based zoom thresholding
    const limits = {
      free: 1000, // 1000 ft
      featured: 5280, // 1 mile
      premium: 26400, // 5 miles
      neighborhood_tier: 26400 // Same as premium
    };

    return distance <= limits[listing.tier];
  });

  const tierColors = {
    free: "bg-slate-500",
    featured: "bg-purple-600",
    premium: "bg-amber-600",
    neighborhood_tier: "bg-emerald-600"
  };

  return (
    <div className="h-full w-full">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={true}
      >
        <MapController center={mapCenter} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {visibleListings.map((listing) => (
          <Marker
            key={listing.id}
            position={[listing.lat, listing.lng]}
            icon={createIcon(listing.tier)}
          >
            <Popup>
              <div className="p-2">
                <Badge className={`${tierColors[listing.tier]} mb-2`}>
                  {listing.tier === "neighborhood_tier" ? "Neighborhood" : listing.tier.toUpperCase()}
                </Badge>
                <h3 className="font-bold text-base mb-1">{listing.title}</h3>
                <p className="text-sm text-slate-600 mb-2">{listing.addressText}</p>
                <p className="text-sm mb-2">{listing.description.slice(0, 100)}...</p>
                
                <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(listing.startDateTime), "MMM d, h:mm a")}
                </div>

                <Button
                  size="sm"
                  onClick={() => navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`)}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  View Details
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}