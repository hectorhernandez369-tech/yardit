import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPin, Navigation, X } from "lucide-react";

if (L.Icon?.Default?.prototype?._getIconUrl) {
  delete L.Icon.Default.prototype._getIconUrl;
}

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const MAP_ANIMATION_CSS = `
  @keyframes yarditPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.18); opacity: 0.8; }
  }

  @keyframes yarditBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  .yanim-pulse { animation: yarditPulse 1.6s ease-in-out infinite; }
  .yanim-bounce { animation: yarditBounce 0.9s ease-in-out infinite; }
`;

const TIER_Z_INDEX = {
  starter: 100,
  pro: 200,
  growth: 300,
};

function injectAnimationStyles() {
  if (!document.getElementById("yardit-map-animation-styles")) {
    const style = document.createElement("style");
    style.id = "yardit-map-animation-styles";
    style.textContent = MAP_ANIMATION_CSS;
    document.head.appendChild(style);
  }
}

function getRecordImage(record) {
  return record.event_icon || record.icon_url || record.icon || record.logo_url || "";
}

function isFuture(value) {
  return value && new Date(value) > new Date();
}

function hasCoordinates(record) {
  return Number.isFinite(record.lat) && Number.isFinite(record.lng);
}

function shouldShowRecord(record) {
  if (!record || record.visibility !== "public" || !hasCoordinates(record)) return false;
  if (record.visibility_rules?.should_render === false) return false;

  if (record.type === "vendor_pin_checkin") {
    return record.status === "live" && record.checkin_status === "live" && isFuture(record.checkin_end_time || record.end_datetime);
  }

  if (record.type === "event") {
    return ["active", "scheduled"].includes(record.status) && isFuture(record.end_datetime);
  }

  return false;
}

function createMapIcon(record, zoom = 13) {
  injectAnimationStyles();

  const imageUrl = getRecordImage(record);
  const animationType = record.animation_type || record.pin_animation || record.animation?.type || "none";
  const animationEnabled = record.animation_enabled || record.animation?.enabled;
  const animationClass = animationEnabled && animationType !== "none" ? `yanim-${animationType}` : "";

  if (imageUrl) {
    const size = Math.max(28, Math.min(56, 28 + (zoom - 10) * 8));
    const tailSize = Math.max(8, Math.round(size * 0.22));
    const totalHeight = size + tailSize;

    return L.divIcon({
      className: "yardit-custom-marker",
      html: `
        <div class="${animationClass}" style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 10px rgba(0,0,0,.35));">
          <img src="${imageUrl}" style="width:${size}px;height:${size}px;border-radius:999px;object-fit:cover;border:3px solid white;background:white;" />
          <div style="width:0;height:0;border-left:${tailSize / 2}px solid transparent;border-right:${tailSize / 2}px solid transparent;border-top:${tailSize}px solid white;margin-top:-1px;"></div>
        </div>
      `,
      iconSize: [size, totalHeight],
      iconAnchor: [size / 2, totalHeight],
    });
  }

  return L.divIcon({
    className: "yardit-default-marker",
    html: `
      <div class="${animationClass}" style="width:42px;height:42px;border-radius:999px;background:hsl(174,62%,38%);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 42],
  });
}

function MapController({ center, onZoomChange }) {
  const map = useMap();

  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);

  useEffect(() => {
    const updateZoom = () => onZoomChange(map.getZoom());
    map.on("zoomend", updateZoom);
    updateZoom();

    return () => map.off("zoomend", updateZoom);
  }, [map, onZoomChange]);

  return null;
}

function InfoCard({ record, onClose }) {
  if (!record) return null;

  const imageUrl = getRecordImage(record);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${record.lat},${record.lng}`;
  const endTime = record.checkin_end_time || record.end_datetime;

  return (
    <div className="absolute left-3 right-3 bottom-4 z-[1000] mx-auto max-w-md rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          {imageUrl ? (
            <img src={imageUrl} alt={record.title} className="h-14 w-14 rounded-2xl object-cover border" />
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MapPin className="h-7 w-7 text-primary" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <h2 className="font-bold text-base truncate">{record.title}</h2>
                <p className="text-xs text-muted-foreground capitalize">
                  {record.type === "event" ? "Event" : "Live Vendor"} · {record.tier || record.event_tier || "starter"}
                </p>
              </div>

              <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            {record.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{record.description}</p>}
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {record.display_address && (
            <div className="flex gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{record.display_address}</span>
            </div>
          )}

          {endTime && <div className="text-xs text-muted-foreground">Live until {new Date(endTime).toLocaleString()}</div>}
        </div>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
        >
          <Navigation className="h-4 w-4" />
          Get Directions
        </a>
      </div>
    </div>
  );
}

export default function VendorPortal() {
  const [center, setCenter] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [zoom, setZoom] = useState(13);

  useEffect(() => {
    injectAnimationStyles();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setCenter([position.coords.latitude, position.coords.longitude]),
        () => setCenter([40.7128, -74.006]),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setCenter([40.7128, -74.006]);
    }
  }, []);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["publicMapRecords"],
    queryFn: () => base44.entities.PublicMapRecord.list("-updated_date", 500),
    refetchInterval: 60000,
  });

  const visibleRecords = useMemo(() => records.filter(shouldShowRecord), [records]);

  return (
    <div className="relative h-[calc(100vh-106px)] min-h-[620px] w-full overflow-hidden bg-background">
      <div className="absolute left-0 right-0 top-0 z-[1000] border-b bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h1 className="font-bold leading-tight">Yardit Map</h1>
            <p className="text-xs text-muted-foreground">{visibleRecords.length} live now</p>
          </div>
        </div>
      </div>

      {isLoading || !center ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : (
        <MapContainer center={center} zoom={13} zoomControl={false} className="h-full w-full">
          <MapController center={center} onZoomChange={setZoom} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />

          {visibleRecords.map((record) => (
            <Marker
              key={record.id}
              position={[record.lat, record.lng]}
              icon={createMapIcon(record, zoom)}
              zIndexOffset={TIER_Z_INDEX[record.tier || record.event_tier] || 100}
              eventHandlers={{ click: () => setSelectedRecord(record) }}
            />
          ))}
        </MapContainer>
      )}

      <InfoCard record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </div>
  );
}