import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MapContainer, TileLayer, Marker, Polygon, Polyline, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import { Search, Loader2, Crosshair, Undo2, MapPin } from "lucide-react";
import MapZoomControl from "@/components/map/MapZoomControl";
import "leaflet/dist/leaflet.css";

const MAPBOX_TILE_URL = "https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";

function milesBetween(a, b) {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function getPolygonStats(points) {
  if (!points?.length) return { perimeter: 0, area: 0 };
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    if (points.length > 1) perimeter += milesBetween(points[i], next);
  }
  if (points.length < 3) return { perimeter, area: 0 };

  const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const milesPerLat = 69.0;
  const milesPerLng = 69.172 * Math.cos((avgLat * Math.PI) / 180);
  const origin = points[0];
  const xy = points.map((p) => ({ x: (p.lng - origin.lng) * milesPerLng, y: (p.lat - origin.lat) * milesPerLat }));
  let area = 0;
  for (let i = 0; i < xy.length; i++) {
    const j = (i + 1) % xy.length;
    area += xy[i].x * xy[j].y - xy[j].x * xy[i].y;
  }
  return { perimeter, area: Math.abs(area) / 2 };
}

function MapClickHandler({ onAddPoint }) {
  useMapEvents({ click: (e) => onAddPoint(e.latlng.lat, e.latlng.lng) });
  return null;
}

function MapFlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target?.lat && target?.lng) map.flyTo([target.lat, target.lng], 12, { animate: true, duration: 0.8 });
  }, [target, map]);
  return null;
}

function MapResize({ open }) {
  const map = useMap();
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(timer);
  }, [open, map]);
  return null;
}

export default function PolygonAreaModal({ open, onOpenChange, points, onChangePoints, label, onChangeLabel }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);

  const polygonPoints = Array.isArray(points) ? points : [];
  const center = polygonPoints.length ? [polygonPoints[0].lat, polygonPoints[0].lng] : [36.2, -119.0];
  const stats = useMemo(() => getPolygonStats(polygonPoints), [polygonPoints]);

  const addPoint = (lat, lng) => {
    onChangePoints([...polygonPoints, { lat, lng }]);
    if (!label) onChangeLabel("Custom map area");
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      if (data?.[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const display = data[0].display_name?.split(",").slice(0, 3).join(",").trim();
        setFlyTarget({ lat, lng });
        if (display) onChangeLabel(display);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Location is not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy };
        setUserLocation(loc);
        setFlyTarget(loc);
        setLocationError(null);
        setLocating(false);
      },
      () => {
        setLocationError("Location permission is off or unavailable.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] w-[1100px] h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b bg-white">
          <DialogTitle className="flex items-center gap-2 text-[#2C4F4E]">
            <MapPin className="h-5 w-5 text-[#5DADA5]" /> Draw Promo Area
          </DialogTitle>
        </DialogHeader>

        <div className="grid h-[calc(90vh-61px)] grid-rows-[auto_1fr_auto] bg-white">
          <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search city, state, or address..."
                className="pl-9"
              />
            </div>
            <button type="button" onClick={handleSearch} disabled={searching} className="rounded-lg bg-[#5DADA5] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4A9B93] disabled:opacity-50">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </button>
            <button type="button" onClick={handleMyLocation} disabled={locating} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />} My location
            </button>
          </div>

          <div className="relative min-h-0">
            <MapContainer center={center} zoom={polygonPoints.length ? 12 : 7} className="h-full w-full" zoomControl={false} scrollWheelZoom>
              <MapResize open={open} />
              <MapClickHandler onAddPoint={addPoint} />
              <MapFlyTo target={flyTarget} />
              <MapZoomControl onMyLocation={handleMyLocation} isLocating={locating} locationError={locationError} />
              <TileLayer attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>' url={MAPBOX_TILE_URL} tileSize={512} zoomOffset={-1} maxZoom={22} maxNativeZoom={22} />
              {polygonPoints.length >= 3 ? (
                <Polygon positions={polygonPoints.map((p) => [p.lat, p.lng])} pathOptions={{ color: "#5DADA5", fillColor: "#5DADA5", fillOpacity: 0.16, weight: 3 }} />
              ) : polygonPoints.length > 0 ? (
                <Polyline positions={polygonPoints.map((p) => [p.lat, p.lng])} pathOptions={{ color: "#5DADA5", weight: 3 }} />
              ) : null}
              {polygonPoints.map((point, index) => <Marker key={`${point.lat}-${point.lng}-${index}`} position={[point.lat, point.lng]} />)}
              {userLocation && (
                <>
                  <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={7} pathOptions={{ fillColor: "#2A93EE", fillOpacity: 1, color: "#ffffff", weight: 2 }} />
                </>
              )}
            </MapContainer>

            <div className="absolute right-3 top-3 z-[1000] w-[260px] rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Area summary</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-[11px] text-slate-500">Points</p><p className="font-bold text-slate-800">{polygonPoints.length}</p></div>
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-[11px] text-slate-500">Approx. border</p><p className="font-bold text-slate-800">{stats.perimeter.toFixed(1)} mi</p></div>
                <div className="col-span-2 rounded-lg bg-[#f0faf9] p-2"><p className="text-[11px] text-[#2C4F4E]/70">Approx. area</p><p className="font-bold text-[#2C4F4E]">{stats.area.toFixed(2)} sq mi</p></div>
              </div>
              {locationError && <p className="mt-2 text-xs text-orange-700">{locationError}</p>}
              <p className="mt-2 text-xs text-slate-500">Click the map to add points around the eligible area.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t p-3 sm:flex-row sm:items-center sm:justify-between">
            <Input value={label || ""} onChange={(e) => onChangeLabel(e.target.value)} placeholder="Display label, e.g. Lindsay launch area" className="sm:max-w-sm" />
            <div className="flex gap-2">
              <button type="button" onClick={() => onChangePoints(polygonPoints.slice(0, -1))} disabled={!polygonPoints.length} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><Undo2 className="h-4 w-4" /> Undo</button>
              <button type="button" onClick={() => onChangePoints([])} disabled={!polygonPoints.length} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Clear</button>
              <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg bg-[#2C4F4E] px-4 py-2 text-sm font-semibold text-white">Done</button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}