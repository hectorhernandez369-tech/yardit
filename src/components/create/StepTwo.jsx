import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddressFields from "@/components/shared/AddressFields";
import ListingAddressReview from "@/components/create/ListingAddressReview";
import { useAppMode } from "@/components/shared/DemoMode";
import { MapPin, Navigation, Loader2, Map as MapIcon } from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

const MAPBOX_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";

function getDistanceFeet(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 20902231;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function MapEventsHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function RecenterHandler({ center, zoom, trigger }) {
  const map = useMap();
  useEffect(() => {
    if (trigger > 0) {
      map.setView(center, zoom);
    }
  }, [trigger, center, zoom, map]);
  return null;
}

function MapPickerModal({ isOpen, onClose, onConfirm, initialLat, initialLng }) {
  const [selectedCenter, setSelectedCenter] = useState(initialLat && initialLng ? [initialLat, initialLng] : null);
  const [mapCenter, setMapCenter] = useState([39.8283, -98.5795]);
  const [mapZoom, setMapZoom] = useState(4);
  const [isLocating, setIsLocating] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (initialLat && initialLng) {
        setSelectedCenter([initialLat, initialLng]);
        setMapCenter([initialLat, initialLng]);
        setMapZoom(15);
        setRecenterTrigger((prev) => prev + 1);
      } else if (navigator.geolocation) {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = [pos.coords.latitude, pos.coords.longitude];
            setMapCenter(coords);
            setMapZoom(15);
            setRecenterTrigger((prev) => prev + 1);
            setIsLocating(false);
          },
          () => setIsLocating(false)
        );
      }
    }
  }, [isOpen, initialLat, initialLng]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-[#F3E6CF] flex flex-col">
      <div className="bg-[#5DADA5] text-white p-4 flex items-center justify-between shadow-md">
        <h2 className="text-lg font-bold">Pick Event Center</h2>
        <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/20">Close</Button>
      </div>
      <div className="flex-1 relative">
        <MapContainer center={mapCenter} zoom={mapZoom} className="w-full h-full" zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`}

            tileSize={512}
            zoomOffset={-1}
          />
          <MapEventsHandler onClick={setSelectedCenter} />
          <RecenterHandler center={mapCenter} zoom={mapZoom} trigger={recenterTrigger} />
          {selectedCenter && (
            <>
              <Marker position={selectedCenter} />
              <Circle center={selectedCenter} radius={152.4} pathOptions={{ color: "#5DADA5", fillColor: "#5DADA5", fillOpacity: 0.2 }} />
            </>
          )}
        </MapContainer>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex gap-3 w-[90%] max-w-sm">
          <Button
            variant="outline"
            className="flex-1 bg-white text-[#2C4F4E] border-[#2C4F4E] shadow-lg hover:bg-gray-50"
            onClick={() => {
              if (!navigator.geolocation) return;
              setIsLocating(true);
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const coords = [pos.coords.latitude, pos.coords.longitude];
                  setMapCenter(coords);
                  setMapZoom(16);
                  setRecenterTrigger((prev) => prev + 1);
                  setSelectedCenter(coords);
                  setIsLocating(false);
                },
                () => setIsLocating(false)
              );
            }}
          >
            {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4 mr-2" />}
            {isLocating ? "" : "My Location"}
          </Button>
          <Button
            className="flex-1 bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border border-[#2C4F4E] shadow-lg font-bold"
            disabled={!selectedCenter}
            onClick={() => onConfirm(selectedCenter[0], selectedCenter[1])}
          >
            Confirm Center
          </Button>
        </div>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-md text-sm text-[#2C4F4E] font-medium border border-[#2C4F4E]/20">
          Tap the map to place center
        </div>
      </div>
    </div>
  );
}

export default function StepTwo({ formData, setFormData, onGeocodeRef, user }) {
  const { isDemoMode } = useAppMode();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [debugInfo, setDebugInfo] = useState({ lastQueryString: "", lastResponseCount: null, lastErrorMessage: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [showHostDialog, setShowHostDialog] = useState(false);
  const [hostForm, setHostForm] = useState({
    street_address: "",
    city: "",
    state: "",
    zip_code: "",
  });
  const [hostLookupResult, setHostLookupResult] = useState(null);
  const [isCheckingHost, setIsCheckingHost] = useState(false);
  const isNeighborhood = formData.listingType === "neighborhood_sale";

  const formDataRef = React.useRef(formData);
  const didPrefillProfileRef = React.useRef(false);
  const confirmedAddressKeyRef = React.useRef("");
  const buildAddressKey = (value) =>
    [value?.addressText, value?.city, value?.state, value?.zip]
      .map((part) => String(part || "").trim().toLowerCase())
      .join("|");
  formDataRef.current = formData;

  const confirmedUserAddress = useMemo(() => {
    if (!user?.street_address || !user?.city || !user?.state || !user?.zip_code) return null;
    return `${user.street_address}, ${user.city}, ${user.state} ${user.zip_code}`;
  }, [user]);

  const userHasConfirmedAddress = !!(user?.street_address && user?.city && user?.state && user?.zip_code && user?.address_lat && user?.address_lng);
  const userAddressInRadius = !!(
    isNeighborhood &&
    userHasConfirmedAddress &&
    formData.event_center_lat &&
    formData.event_center_lng &&
    getDistanceFeet(user.address_lat, user.address_lng, formData.event_center_lat, formData.event_center_lng) <= 500
  );

  const validateHostWithinRadius = React.useCallback((hostLat, hostLng, showToastMessage = true) => {
    const centerLat = formDataRef.current.event_center_lat;
    const centerLng = formDataRef.current.event_center_lng;

    if (!centerLat || !centerLng || !hostLat || !hostLng) {
      if (showToastMessage) {
        toast.error("Host must be within 500 ft of the selected Neighborhood Sale center.");
      }
      return false;
    }

    const distanceFeet = getDistanceFeet(centerLat, centerLng, hostLat, hostLng);
    if (distanceFeet > 500) {
      if (showToastMessage) {
        toast.error("Host must be within 500 ft of the selected Neighborhood Sale center.");
      }
      return false;
    }

    return true;
  }, []);

  const geocodeHostAddress = React.useCallback(async () => {
    const query = [hostForm.street_address, hostForm.city, hostForm.state, hostForm.zip_code].filter(Boolean).join(", ");
    if (!query) {
      toast.error("Complete host address is required.");
      return null;
    }

    const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1`);
    const data = await response.json();
    const feature = data.features?.[0];

    if (!feature) {
      toast.error("Could not locate that host address.");
      return null;
    }

    return {
      lat: feature.center[1],
      lng: feature.center[0],
    };
  }, [hostForm.city, hostForm.state, hostForm.street_address, hostForm.zip_code]);

  useEffect(() => {
    if (!isNeighborhood || !userAddressInRadius || formData.host_mode === "cohost") return;
    setFormData((prev) => ({
      ...prev,
      host_mode: "self",
      host_addressText: user.street_address,
      host_city: user.city,
      host_state: user.state,
      host_zip: user.zip_code,
      host_address_lat: user.address_lat,
      host_address_lng: user.address_lng,
      cohost_invite_id: "",
      cohost_invite_status: "",
    }));
  }, [formData.host_mode, isNeighborhood, userAddressInRadius, setFormData, user]);

  const getCurrentLocation = () => {
    setIsGettingLocation(true);

    if (!navigator.geolocation) {
      setIsGettingLocation(false);
      toast.error("Geolocation is not supported on this device");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setFormData((prev) => ({
          ...prev,
          lat,
          lng,
        }));

        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`
          );
          const data = await response.json();
          const feature = data.features?.[0];

          if (feature) {
            let city = "", state = "", zip = "";
            feature.context?.forEach((c) => {
              if (c.id.startsWith("place")) city = c.text;
              if (c.id.startsWith("region")) state = c.text;
              if (c.id.startsWith("postcode")) zip = c.text;
            });
            setFormData((prev) => ({
              ...prev,
              addressText: feature.address ? `${feature.address} ${feature.text}` : feature.text,
              city: city || prev.city,
              state: state || prev.state,
              zip: zip || prev.zip,
            }));
          }
        } catch (error) {
          console.error("Error getting address:", error);
        } finally {
          setIsGettingLocation(false);
        }

        toast.success("Location detected!");
      },
      () => {
        setIsGettingLocation(false);
        toast.error("Could not get your location");
      }
    );
  };

  const geocodeAddress = React.useCallback(async () => {
    const fd = formDataRef.current;
    const missing = [];
    if (!fd.addressText?.trim()) missing.push("Street Address");
    if (!fd.city?.trim()) missing.push("City");
    if (!fd.state?.trim()) missing.push("State");
    if (!fd.zip?.trim()) missing.push("ZIP Code");

    if (missing.length > 0) {
      const errors = {};
      if (!fd.addressText?.trim()) errors.addressText = true;
      if (!fd.city?.trim()) errors.city = true;
      if (!fd.state?.trim()) errors.state = true;
      if (!fd.zip?.trim()) errors.zip = true;
      setFieldErrors(errors);
      toast.error(`Missing: ${missing.join(", ")}`);
      return false;
    }

    const currentAddressKey = buildAddressKey(fd);
    if (
      currentAddressKey &&
      currentAddressKey === confirmedAddressKeyRef.current &&
      typeof fd.lat === "number" &&
      typeof fd.lng === "number" &&
      addressSuggestions.length === 0
    ) {
      return true;
    }

    toast.info("Locating address...");
    setIsGeocoding(true);
    setAddressSuggestions([]);
    setDebugInfo({ lastQueryString: "", lastResponseCount: null, lastErrorMessage: "" });

    try {
      const queries = [
        `${fd.addressText}, ${fd.city}, ${fd.state}, ${fd.zip}`,
        `${fd.addressText}, ${fd.city}, ${fd.state}`,
        `${fd.addressText}, ${fd.city}`,
        `${fd.city}, ${fd.state} ${fd.zip}`,
      ];

      let data = [];
      let usedQuery = "";

      for (const query of queries) {
        usedQuery = query;
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5`;
        const response = await fetch(url);

        if (!response.ok) {
          const errMsg = `HTTP ${response.status}`;
          setDebugInfo((prev) => ({ ...prev, lastQueryString: query, lastErrorMessage: errMsg }));
          toast.error("Address search failed. Please try again.");
          return false;
        }

        const json = await response.json();
        data = json.features || [];
        if (data.length > 0) break;
      }

      setDebugInfo({ lastQueryString: usedQuery, lastResponseCount: data?.length ?? 0, lastErrorMessage: "" });

      if (data.length > 0) {
        if (data.length === 1) {
          confirmedAddressKeyRef.current = currentAddressKey;
          setFormData((prev) => ({
            ...prev,
            lat: data[0].center[1],
            lng: data[0].center[0],
          }));
          toast.success("Address located!");
          return true;
        }

        confirmedAddressKeyRef.current = "";
        setAddressSuggestions(data.slice(0, 5));
        toast.info(`Found ${data.length} possible matches. Select one below.`);
        return false;
      }

      confirmedAddressKeyRef.current = "";
      setDebugInfo((prev) => ({ ...prev, lastErrorMessage: "Zero results" }));
      toast.error("No match found. Try a suggestion or adjust spelling.");
      return false;
      } catch (error) {
      confirmedAddressKeyRef.current = "";
      setDebugInfo((prev) => ({ ...prev, lastErrorMessage: error.message }));
      toast.error("Address search failed. Please try again.");
      return false;
    } finally {
      setIsGeocoding(false);
    }
  }, [addressSuggestions.length, setFormData]);

  useEffect(() => {
    if (onGeocodeRef) {
      onGeocodeRef(geocodeAddress);
    }
  }, [geocodeAddress, onGeocodeRef]);

  const handleCheckHostAddress = async (requestInvite = false) => {
    let hostCoords = null;

    if (requestInvite) {
      if (!formData.event_center_lat || !formData.event_center_lng) {
        toast.error("Please pick the Neighborhood Sale center first.");
        return;
      }

      hostCoords = await geocodeHostAddress();
      if (!hostCoords) return;
      if (!validateHostWithinRadius(hostCoords.lat, hostCoords.lng)) return;
    }

    setIsCheckingHost(true);
    try {
      const response = await base44.functions.invoke("manageNeighborhoodCoHostInvite", {
        action: requestInvite ? "request" : "lookup",
        ...hostForm,
        event_title: formData.title,
        ...(requestInvite ? {
          event_center_lat: formData.event_center_lat,
          event_center_lng: formData.event_center_lng,
          host_address_lat: hostCoords.lat,
          host_address_lng: hostCoords.lng,
        } : {}),
      });

      const data = response.data;
      setHostLookupResult(data);

      if (data?.invite?.status === "accepted") {
        setFormData((prev) => ({
          ...prev,
          host_mode: "cohost",
          cohost_invite_id: data.invite.id,
          cohost_invite_status: "accepted",
          host_addressText: data.invite.street_address,
          host_city: data.invite.city,
          host_state: data.invite.state,
          host_zip: data.invite.zip_code,
          host_address_lat: data.invite.address_lat,
          host_address_lng: data.invite.address_lng,
        }));
        toast.success("Accepted co-host address ready to use.");
        setShowHostDialog(false);
        return;
      }

      if (requestInvite && data?.invite) {
        setFormData((prev) => ({
          ...prev,
          host_mode: "cohost",
          cohost_invite_id: data.invite.id,
          cohost_invite_status: data.invite.status,
          host_addressText: data.invite.street_address,
          host_city: data.invite.city,
          host_state: data.invite.state,
          host_zip: data.invite.zip_code,
          host_address_lat: data.invite.address_lat,
          host_address_lng: data.invite.address_lng,
        }));

        if (data.has_match) {
          toast.success("Co-host request sent.");
        } else {
          const inviteText = `${window.location.origin}\nCreate an account, confirm the matching address, then accept the co-host request from Notifications.`;
          await navigator.clipboard.writeText(inviteText);
          toast.success("Invite link copied.");
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || "Could not check host address.");
    } finally {
      setIsCheckingHost(false);
    }
  };

  const hostStatusLabel = useMemo(() => {
    if (formData.host_mode === "self") return "Using your confirmed address";
    if (formData.cohost_invite_status === "accepted") return "Accepted co-host address selected";
    if (formData.cohost_invite_status === "pending") return "Co-host request pending acceptance";
    if (formData.host_mode === "cohost") return "Alternate host flow selected";
    return "No host address selected yet";
  }, [formData]);

  const hasProfileAddress = !!(user?.street_address && user?.city && user?.state && user?.zip_code);

  const handleUseConfirmedAddress = () => {
    if (!userHasConfirmedAddress) return;

    const hasSelectedCenter = !!(formData.event_center_lat && formData.event_center_lng);
    if (hasSelectedCenter && !validateHostWithinRadius(user.address_lat, user.address_lng)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      event_center_lat: prev.event_center_lat || user.address_lat,
      event_center_lng: prev.event_center_lng || user.address_lng,
      lat: prev.event_center_lat && prev.event_center_lng ? prev.lat : user.address_lat,
      lng: prev.event_center_lat && prev.event_center_lng ? prev.lng : user.address_lng,
      addressText: prev.event_center_lat && prev.event_center_lng ? prev.addressText : user.street_address,
      city: prev.event_center_lat && prev.event_center_lng ? prev.city : user.city,
      state: prev.event_center_lat && prev.event_center_lng ? prev.state : user.state,
      zip: prev.event_center_lat && prev.event_center_lng ? prev.zip : user.zip_code,
      host_mode: "self",
      host_addressText: user.street_address,
      host_city: user.city,
      host_state: user.state,
      host_zip: user.zip_code,
      host_address_lat: user.address_lat,
      host_address_lng: user.address_lng,
      cohost_invite_id: "",
      cohost_invite_status: "",
    }));
    setShowHostDialog(false);
    toast.success("Using your confirmed address.");
  };

  const handleUseAlternateHostFlow = () => {
    setFormData((prev) => ({
      ...prev,
      host_mode: "cohost",
      host_addressText: "",
      host_city: "",
      host_state: "",
      host_zip: "",
      host_address_lat: null,
      host_address_lng: null,
      cohost_invite_id: "",
      cohost_invite_status: "",
    }));
    setHostLookupResult(null);
    setShowHostDialog(true);
  };

  useEffect(() => {
    if (isNeighborhood || !user || didPrefillProfileRef.current) return;

    didPrefillProfileRef.current = true;
    setFormData((prev) => ({
      ...prev,
      addressText: user.street_address || "",
      city: user.city || "",
      state: (user.state || "").toUpperCase().slice(0, 2),
      zip: user.zip_code || "",
      lat: user.address_lat ?? prev.lat ?? null,
      lng: user.address_lng ?? prev.lng ?? null,
      locationMethod: "profile",
    }));

    if (user.street_address && user.city && user.state && user.zip_code && (!user.address_lat || !user.address_lng)) {
      const query = `${user.street_address}, ${user.city}, ${user.state}, ${user.zip_code}`;
      fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=1&access_token=${MAPBOX_TOKEN}`)
        .then((response) => response.json())
        .then((data) => {
          const feature = data?.features?.[0];
          if (!feature) return;
          setFormData((prev) => ({
            ...prev,
            lat: feature.center[1],
            lng: feature.center[0],
          }));
        })
        .catch(() => {});
    }
  }, [isNeighborhood, setFormData, user]);

  return (
    <div className="space-y-6">
      {isNeighborhood && (
        <div className="space-y-4">
          <Button
            type="button"
            onClick={() => setIsMapModalOpen(true)}
            className="w-full py-8 text-lg bg-[#5DADA5] hover:bg-[#4A9B93] text-white flex gap-3 shadow-md border-2 border-[#2C4F4E]"
          >
            <MapIcon className="w-6 h-6" />
            Pick center on map
          </Button>

          {formData.event_center_lat && formData.event_center_lng && (
            <div className="rounded-lg border border-[#2C4F4E]/40 bg-[#F3E6CF] px-4 py-3">
              <p className="text-sm font-medium text-[#2C4F4E] flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Center selected on map.
              </p>
              <p className="text-xs text-[#1F2937] opacity-80 mt-1">
                {Number(formData.event_center_lat).toFixed(4)}, {Number(formData.event_center_lng).toFixed(4)}
              </p>
            </div>
          )}

          <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-[#2C4F4E]">Confirmed host address</p>
                <p className="text-sm text-[#1F2937] opacity-80">If your confirmed address is inside the radius, you must use your own address.</p>
              </div>
              <div className="text-xs font-semibold text-[#2C4F4E] uppercase">{hostStatusLabel}</div>
            </div>

            {confirmedUserAddress ? (
              <div className="rounded-lg border border-[#2C4F4E]/30 bg-[#F3E6CF] p-3">
                <p className="text-sm font-medium text-[#2C4F4E]">{confirmedUserAddress}</p>
                <p className="text-xs text-[#1F2937] opacity-80 mt-1">Read-only confirmed signup address</p>
              </div>
            ) : (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                You do not have a confirmed address on your account yet. If you live inside the radius, confirm your address in Settings first. Otherwise use the co-host path below.
              </div>
            )}

            {formData.event_center_lat && formData.event_center_lng && userHasConfirmedAddress && (
              <div className={`rounded-lg p-3 text-sm ${userAddressInRadius ? "border border-green-200 bg-green-50 text-green-800" : "border border-amber-200 bg-amber-50 text-amber-800"}`}>
                {userAddressInRadius
                  ? "Your confirmed address is inside the 500-foot radius and will be used for this sale."
                  : "Your confirmed address is not inside the 500-foot radius for this selected center."}
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <Button
                type="button"
                variant="outline"
                disabled={!userHasConfirmedAddress}
                className="border-[#2C4F4E] text-[#2C4F4E]"
                onClick={handleUseConfirmedAddress}
              >
                Use My Confirmed Address
              </Button>

              {!userAddressInRadius && (
                <Button
                  type="button"
                  className="bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border border-[#2C4F4E]"
                  disabled={!formData.event_center_lat || !formData.event_center_lng}
                  onClick={handleUseAlternateHostFlow}
                >
                  I don’t live in the radius
                </Button>
              )}
            </div>

            {formData.host_mode === "cohost" && !formData.host_addressText && (
              <div className="rounded-lg border border-[#2C4F4E]/30 bg-white p-3 text-sm text-[#2C4F4E]">
                <p className="font-medium">Alternate host flow selected</p>
                <p className="mt-1">Your confirmed address is not being used for this sale. Enter or request a host address inside the radius.</p>
              </div>
            )}

            {formData.host_addressText && (
              <div className="rounded-lg border border-[#2C4F4E]/30 bg-white p-3 text-sm text-[#2C4F4E]">
                <p className="font-medium">Selected host address</p>
                <p className="mt-1">{`${formData.host_addressText}, ${formData.host_city}, ${formData.host_state} ${formData.host_zip}`}</p>
              </div>
            )}
          </div>

          <MapPickerModal
            isOpen={isMapModalOpen}
            onClose={() => setIsMapModalOpen(false)}
            initialLat={formData.event_center_lat || formData.lat}
            initialLng={formData.event_center_lng || formData.lng}
            onConfirm={async (lat, lng) => {
              setIsMapModalOpen(false);
              toast.info("Saving location...");
              try {
                          const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`);
                const data = await response.json();
                const feature = data.features?.[0];
                let city = "Unknown", state = "XX", zip = "00000";
                if (feature) {
                  feature.context?.forEach((c) => {
                    if (c.id.startsWith("place")) city = c.text;
                    if (c.id.startsWith("region")) state = c.text;
                    if (c.id.startsWith("postcode")) zip = c.text;
                  });
                }
                setFormData((prev) => ({
                  ...prev,
                  event_center_lat: lat,
                  event_center_lng: lng,
                  lat,
                  lng,
                  addressText: feature ? (feature.address ? `${feature.address} ${feature.text}` : feature.text) : "Map Location",
                  city,
                  state,
                  zip,
                }));
                toast.success("Center location saved!");
              } catch {
                setFormData((prev) => ({
                  ...prev,
                  event_center_lat: lat,
                  event_center_lng: lng,
                  lat,
                  lng,
                  addressText: "Map Location",
                  city: "Unknown",
                  state: "XX",
                  zip: "00000",
                }));
                toast.success("Center location saved!");
              }
            }}
          />
        </div>
      )}

      {!isNeighborhood && (
        <ListingAddressReview
          formData={formData}
          setFormData={setFormData}
          isDemoMode={isDemoMode}
          hasProfileAddress={hasProfileAddress}
          isGettingLocation={isGettingLocation}
          isGeocoding={isGeocoding}
          onUseCurrentLocation={getCurrentLocation}
          onLocateAddress={() => geocodeAddress()}
          addressSuggestions={addressSuggestions}
          onSelectSuggestion={(suggestion) => {
            let city = formData.city, state = formData.state, zip = formData.zip;
            suggestion.context?.forEach((c) => {
              if (c.id.startsWith("place")) city = c.text;
              if (c.id.startsWith("region")) state = c.text;
              if (c.id.startsWith("postcode")) zip = c.text;
            });
            const nextAddressText = suggestion.address ? `${suggestion.address} ${suggestion.text}` : suggestion.text;
            confirmedAddressKeyRef.current = buildAddressKey({
              addressText: nextAddressText,
              city,
              state,
              zip,
            });
            setFormData((prev) => ({
              ...prev,
              addressText: nextAddressText,
              city,
              state,
              zip,
              lat: suggestion.center[1],
              lng: suggestion.center[0],
            }));
            setAddressSuggestions([]);
            toast.success("Address selected");
          }}
        />
      )}

      {isNeighborhood && (
        <div className="pt-6 mt-6 border-t-2 border-[#2C4F4E]/20">
          <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4 mb-4">
            <h3 className="text-[#2C4F4E] font-semibold">Event Dates</h3>
            <p className="text-sm text-[#1F2937] opacity-80">Select the start and end dates for your Neighborhood Sale (up to 3 days).</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[#2C4F4E]">Start Date *</Label>
              <Input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={formData.selectedRangeStartDate || ""}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setFormData((prev) => ({ ...prev, selectedRangeStartDate: newStart }));
                  if (formData.selectedRangeEndDate) {
                    const start = new Date(newStart);
                    const end = new Date(formData.selectedRangeEndDate);
                    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
                    if (diffDays > 3 || end < start) {
                      toast.error("Event can be a maximum of 3 days and end date must be after start date.");
                      setFormData((prev) => ({ ...prev, selectedRangeEndDate: "" }));
                    }
                  }
                }}
                className="bg-[#F3E6CF] border-[#2C4F4E]"
                required
              />
            </div>
            <div>
              <Label className="text-[#2C4F4E]">End Date *</Label>
              <Input
                type="date"
                min={formData.selectedRangeStartDate || new Date().toISOString().split("T")[0]}
                value={formData.selectedRangeEndDate || ""}
                onChange={(e) => {
                  const newEnd = e.target.value;
                  if (!formData.selectedRangeStartDate) {
                    toast.error("Please select a start date first.");
                    return;
                  }
                  const start = new Date(formData.selectedRangeStartDate);
                  const end = new Date(newEnd);
                  const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
                  if (diffDays > 3) {
                    toast.error("Event can be a maximum of 3 days.");
                    return;
                  }
                  if (end < start) {
                    toast.error("End date cannot be before start date.");
                    return;
                  }
                  setFormData((prev) => ({ ...prev, selectedRangeEndDate: newEnd }));
                }}
                className="bg-[#F3E6CF] border-[#2C4F4E]"
                required
              />
            </div>
          </div>
        </div>
      )}

      {isDemoMode && (debugInfo.lastQueryString || debugInfo.lastErrorMessage) && !isNeighborhood && (
        <div className="mt-4 rounded border border-dashed border-gray-400 bg-gray-100 p-2 text-[11px] font-mono text-gray-600">
          <p><strong>DEBUG</strong></p>
          <p>Query: {debugInfo.lastQueryString || "—"}</p>
          <p>Results: {debugInfo.lastResponseCount ?? "—"}</p>
          <p>Error: {debugInfo.lastErrorMessage || "none"}</p>
        </div>
      )}

      <Dialog open={showHostDialog} onOpenChange={setShowHostDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Enter Host Address Here</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto pr-1">
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-2">
                <p>Neighborhood Sales must be anchored to a confirmed address within the 500-foot radius.</p>
                <p>If you do not live within the radius, you must designate a co-host who does.</p>
                <p>The co-host must have (or create) an account with the matching confirmed address and must accept the invitation before the sale can use that address.</p>
              </div>

              <div className="space-y-4">
                <AddressFields formData={hostForm} setFormData={setHostForm} />
              </div>

              {hostLookupResult && (
                <div className="rounded-lg border border-[#2C4F4E]/20 bg-slate-50 p-4 space-y-3 text-sm">
                  {hostLookupResult.has_match ? (
                    <>
                      <p className="font-semibold text-slate-900">Active account found at this confirmed address</p>
                      <p className="text-slate-700">
                        {hostLookupResult.matched_host?.full_name} — {hostLookupResult.matched_host?.street_address}, {hostLookupResult.matched_host?.city}, {hostLookupResult.matched_host?.state} {hostLookupResult.matched_host?.zip_code}
                      </p>
                      <p className="text-slate-600">
                        {hostLookupResult.invite?.status === "pending" ? "A co-host request can be sent to this user." : "This co-host invite has already been created."}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-slate-900">No active account exists for that address</p>
                      <p className="text-slate-600">You can still create the invite now and share the app link so the host can create an account, confirm the same address, and receive the co-host request.</p>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-3 flex-wrap pb-1">
                <Button variant="outline" onClick={() => handleCheckHostAddress(false)} disabled={isCheckingHost}>
                  {isCheckingHost ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Check Host Address
                </Button>
                <Button
                  className="bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border border-[#2C4F4E]"
                  onClick={() => handleCheckHostAddress(true)}
                  disabled={isCheckingHost}
                >
                  {isCheckingHost ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {hostLookupResult?.has_match ? "Send Co-Host Request" : "Send Invite Link"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}