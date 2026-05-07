import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";

const MAX_DISTANCE_METERS = 45.72;
const TIME_SLOTS = [
  { label: "2 hours", hours: 2 },
  { label: "4 hours", hours: 4 },
  { label: "8 hours", hours: 8 },
  { label: "12 hours", hours: 12 },
];

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function toDegrees(value) {
  return (value * 180) / Math.PI;
}

function getDistanceMeters(a, b) {
  const earthRadius = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function clampToRadius(center, point) {
  const distance = getDistanceMeters(center, point);
  if (distance <= MAX_DISTANCE_METERS) return point;

  const bearing = Math.atan2(
    Math.sin(toRadians(point.lng - center.lng)) * Math.cos(toRadians(point.lat)),
    Math.cos(toRadians(center.lat)) * Math.sin(toRadians(point.lat)) -
      Math.sin(toRadians(center.lat)) * Math.cos(toRadians(point.lat)) * Math.cos(toRadians(point.lng - center.lng))
  );
  const angularDistance = MAX_DISTANCE_METERS / 6371000;
  const lat1 = toRadians(center.lat);
  const lng1 = toRadians(center.lng);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing));
  const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1), Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: toDegrees(lat2), lng: toDegrees(lng2) };
}

function ClickToMove({ gpsLocation, onMove }) {
  useMapEvents({
    click(event) {
      onMove(clampToRadius(gpsLocation, event.latlng));
    },
  });
  return null;
}

export default function VendorPinPreview() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const pinId = params.get("pinId");
  const accountId = params.get("accountId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [pin, setPin] = useState(null);
  const [account, setAccount] = useState(null);
  const [latestCheckIn, setLatestCheckIn] = useState(null);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [pinLocation, setPinLocation] = useState(null);
  const [address, setAddress] = useState("");
  const [selectedHours, setSelectedHours] = useState(4);

  useEffect(() => {
    const loadData = async () => {
      const currentUser = await base44.auth.me();
      const [pins, accounts, checkIns] = await Promise.all([
        base44.entities.VendorPin.filter({ id: pinId }),
        base44.entities.VendorAccount.filter({ id: accountId }),
        base44.entities.VendorPinCheckIn.filter({ vendor_pin_id: pinId }, "-created_date"),
      ]);
      setUser(currentUser);
      setPin(pins[0] || null);
      setAccount(accounts[0] || null);
      setLatestCheckIn(checkIns[0] || null);
      setLoading(false);
    };

    loadData();
  }, [pinId, accountId]);

  const handleCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setGpsLocation(nextLocation);
        setPinLocation(nextLocation);
        toast.success("GPS location found");
      },
      () => toast.error("Could not get your GPS location."),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  useEffect(() => {
    if (!gpsLocation) handleCurrentLocation();
  }, [gpsLocation]);

  const endTime = useMemo(() => {
    const end = new Date(Date.now() + selectedHours * 60 * 60 * 1000);
    return end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }, [selectedHours]);

  const distanceFeet = gpsLocation && pinLocation ? Math.round(getDistanceMeters(gpsLocation, pinLocation) * 3.28084) : 0;

  const handleMarkerDrag = (event) => {
    const next = event.target.getLatLng();
    setPinLocation(clampToRadius(gpsLocation, next));
  };

  const startCheckIn = async () => {
    if (!pinLocation || !account || !pin) return toast.error("Set your pin location first.");
    setSaving(true);
    const start = new Date();
    const end = new Date(start.getTime() + selectedHours * 60 * 60 * 1000);
    const payload = {
      vendor_pin_id: pin.id,
      vendor_account_id: account.id,
      checked_in_by_email: user?.email || "",
      checkin_latitude: pinLocation.lat,
      checkin_longitude: pinLocation.lng,
      checkin_display_address: address,
      checkin_start_time: start.toISOString(),
      checkin_end_time: end.toISOString(),
      pin_animation: latestCheckIn?.pin_animation || "none",
      status: "live",
    };

    const liveExisting = latestCheckIn && ["live", "paused"].includes(latestCheckIn.status);
    const saved = liveExisting
      ? await base44.entities.VendorPinCheckIn.update(latestCheckIn.id, payload)
      : await base44.entities.VendorPinCheckIn.create(payload);

    await base44.functions.invoke("syncPublicMapRecord", { recordType: "vendor_pin_checkin", recordId: liveExisting ? latestCheckIn.id : saved.id });
    toast.success("Pin location is live");
    navigate("/VendorDashboard");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FBFAF7]"><Loader2 className="h-8 w-8 animate-spin text-[#5DADA5]" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#FBFAF7] p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => navigate("/VendorDashboard")} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Button>

        <Card className="rounded-3xl overflow-hidden">
          <CardHeader className="bg-[#5DADA5] text-white">
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Preview Pin: {pin?.pin_name || "Truck Pin"}</CardTitle>
            <p className="text-sm text-white/80">Move the pin within 150 feet of your GPS location, then choose how long it should stay live.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[420px] bg-slate-100">
              {gpsLocation && pinLocation ? (
                <MapContainer center={pinLocation} zoom={19} className="h-full w-full" scrollWheelZoom>
                  <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Circle center={gpsLocation} radius={MAX_DISTANCE_METERS} pathOptions={{ color: "#5DADA5", fillColor: "#5DADA5", fillOpacity: 0.12 }} />
                  <Marker position={pinLocation} draggable eventHandlers={{ dragend: handleMarkerDrag }} />
                  <ClickToMove gpsLocation={gpsLocation} onMove={setPinLocation} />
                </MapContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-6">
                  <Navigation className="h-8 w-8 text-[#5DADA5]" />
                  <p className="text-sm text-slate-600">Waiting for GPS location...</p>
                  <Button onClick={handleCurrentLocation}>Use GPS Location</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card className="rounded-3xl"><CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold text-[#2C4F4E]">Display address or note</p>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Example: Parked near the north entrance" />
            <p className="text-xs text-muted-foreground">Current adjustment from GPS: {distanceFeet} ft / 150 ft max.</p>
          </CardContent></Card>

          <Card className="rounded-3xl"><CardContent className="p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#2C4F4E]">Time slot</p>
              <p className="text-xs text-muted-foreground">Live until about {endTime}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOTS.map((slot) => (
                <Button key={slot.hours} type="button" variant={selectedHours === slot.hours ? "default" : "outline"} onClick={() => setSelectedHours(slot.hours)} className="rounded-xl">
                  {slot.label}
                </Button>
              ))}
            </div>
            <Button onClick={startCheckIn} disabled={saving || !pinLocation} className="w-full rounded-xl bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E]">
              {saving ? "Going live..." : "Confirm Live Pin"}
            </Button>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}