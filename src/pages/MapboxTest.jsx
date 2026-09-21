import React, { useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Map as MapIcon, ShieldAlert, Search, Crosshair, Layers3, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isHalloweenSpotVisible } from "@/lib/halloweenSpots";
import { getHalloweenSpotIconUrl, getHalloweenSpotMapOpacity, getHalloweenSpotMapSize } from "@/lib/halloweenMapIcons";
import { isLiveVendorCheckIn } from "@/lib/vendorTiers";
import { getVendorPinActiveSchedule } from "@/lib/vendorPinSchedule";
import { shouldShowVendorPinAtZoom } from "@/components/map/vendorMarkerIcons";
import { isPublishedVendorEvent, toVendorEventListing } from "@/lib/vendorEvents";
import { useAuth } from "@/lib/AuthContext";
import loadMapboxGl from "@/components/map/loadMapboxGl";

const MAPBOX_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";
const DEFAULT_CENTER = [-119.055, 36.135];
const STREET_STYLE = "mapbox://styles/mapbox/streets-v12";
const SATELLITE_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function normalizeListing(item) {
  const lat = Number(item?.lat ?? item?.latitude);
  const lng = Number(item?.lng ?? item?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    ...item,
    id: item?.id,
    lat,
    lng,
    title: item?.title || item?.display_title || item?.event_name || "Yardit location",
    tier: item?.tier || item?.event_tier || "free",
    listingType: item?.listingType || item?.listing_type || item?.type || "yard_sale",
  };
}

function listingThreshold(item) {
  if (item.listingType === "neighborhood_sale") return 12;
  if (item.listingType === "event") {
    const tier = item.event_tier || item.tier;
    if (tier === "marquee") return 11;
    if (tier === "premium") return 12;
    if (tier === "featured") return 13;
    return 14;
  }
  if (item.tier === "premium") return 11;
  if (item.tier === "featured" || item.tier === "map_pin") return 13;
  return 15;
}

function toFeature(item) {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [item.lng, item.lat] },
    properties: {
      id: String(item.id),
      title: item.title || "Yardit location",
      tier: item.tier || "free",
      listingType: item.listingType || "yard_sale",
      minZoom: listingThreshold(item),
      status: item.status || "",
      address: item.display_address || item.addressText || item.address || "",
      isVendorEvent: item.is_vendor_event ? 1 : 0,
      vendorEventId: item.vendor_event_id || "",
    },
  };
}

function buildGeoJson(items) {
  return { type: "FeatureCollection", features: items.map(toFeature) };
}

function popupHtml(item) {
  const isHalloween = item.listingType === "halloween_candy" || item.type === "halloween_candy";
  const href = isHalloween
    ? `/HalloweenSpotDetail?id=${encodeURIComponent(item.id)}`
    : item.is_vendor_event
      ? `/VendorEventPublicPage?id=${encodeURIComponent(item.vendor_event_id)}`
      : `/ListingDetail?id=${encodeURIComponent(item.id)}`;
  const badge = isHalloween ? "Halloween" : item.listingType === "neighborhood_sale" ? "Neighborhood Sale" : item.listingType === "event" ? "Event" : (item.tier || "Free");
  const address = item.display_address || item.addressText || item.address || "";
  return `
    <div style="font-family:system-ui,sans-serif;min-width:210px;max-width:270px;padding:2px">
      <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#5DADA5;margin-bottom:4px">${esc(badge)}</div>
      <div style="font-size:14px;font-weight:800;color:#0f172a;line-height:1.2">${esc(item.title)}</div>
      ${address ? `<div style="font-size:11px;color:#64748b;margin-top:6px;line-height:1.3">${esc(address)}</div>` : ""}
      <a href="${href}" style="display:block;margin-top:9px;background:#2C4F4E;color:white;text-decoration:none;text-align:center;border-radius:8px;padding:7px 10px;font-size:11px;font-weight:700">View Details</a>
    </div>`;
}

function installMainLayers(map, data) {
  if (!map.getSource("yardit-main")) {
    map.addSource("yardit-main", {
      type: "geojson",
      data,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });
  } else {
    map.getSource("yardit-main").setData(data);
  }

  if (!map.getLayer("yardit-clusters")) {
    map.addLayer({
      id: "yardit-clusters",
      type: "circle",
      source: "yardit-main",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": ["step", ["get", "point_count"], "#5DADA5", 10, "#5DADA5", 25, "#F4A849"],
        "circle-radius": ["step", ["get", "point_count"], 14, 10, 16, 25, 20],
        "circle-stroke-color": "#2C4F4E",
        "circle-stroke-width": 2,
      },
    });
    map.addLayer({
      id: "yardit-cluster-count",
      type: "symbol",
      source: "yardit-main",
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 13,
      },
      paint: { "text-color": "#ffffff" },
    });
  }

  if (!map.getLayer("yardit-pins")) {
    // Mapbox only permits zoom at the input of a top-level step/interpolate.
    const visibleExpression = ["step", ["zoom"], 0];
    [11, 12, 13, 14, 15].forEach((level) => {
      visibleExpression.push(level, ["case", ["<=", ["to-number", ["get", "minZoom"]], level], 1, 0]);
    });
    map.addLayer({
      id: "yardit-pins",
      type: "circle",
      source: "yardit-main",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": [
          "case",
          ["==", ["get", "listingType"], "neighborhood_sale"], 15,
          ["==", ["get", "tier"], "premium"], 14,
          ["any", ["==", ["get", "tier"], "featured"], ["==", ["get", "tier"], "map_pin"]], 12.5,
          11
        ],
        "circle-color": [
          "case",
          ["==", ["get", "listingType"], "neighborhood_sale"], "#F4A849",
          ["==", ["get", "listingType"], "event"], "#006168",
          ["==", ["get", "tier"], "premium"], "#5DADA5",
          ["any", ["==", ["get", "tier"], "featured"], ["==", ["get", "tier"], "map_pin"]], "#5DADA5",
          "#6b7280"
        ],
        "circle-stroke-color": [
          "case",
          ["==", ["get", "tier"], "premium"], "#F4A849",
          ["==", ["get", "listingType"], "event"], "#ffffff",
          "#2C4F4E"
        ],
        "circle-stroke-width": 2.5,
        "circle-opacity": visibleExpression,
        "circle-stroke-opacity": visibleExpression,
      },
    });
  }
}

function installHalloweenClusterLayers(map, data) {
  if (!map.getSource("yardit-halloween")) {
    map.addSource("yardit-halloween", {
      type: "geojson",
      data,
      cluster: true,
      clusterMaxZoom: 10,
      clusterRadius: 52,
    });
  } else {
    map.getSource("yardit-halloween").setData(data);
  }

  if (!map.getLayer("yardit-halloween-clusters")) {
    map.addLayer({
      id: "yardit-halloween-clusters",
      type: "circle",
      source: "yardit-halloween",
      minzoom: 0,
      maxzoom: 11,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#f97316",
        "circle-radius": ["step", ["get", "point_count"], 14, 10, 17, 25, 20],
        "circle-stroke-color": "#581c87",
        "circle-stroke-width": 2,
      },
    });
    map.addLayer({
      id: "yardit-halloween-count",
      type: "symbol",
      source: "yardit-halloween",
      minzoom: 0,
      maxzoom: 11,
      filter: ["has", "point_count"],
      layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
      paint: { "text-color": "#ffffff" },
    });
  }
}

function makeVendorElement(pin, account) {
  const tier = account?.vendor_tier || "free";
  const image = tier !== "free" && pin?.pin_icon_style === "truck_logo"
    ? (pin?.pin_logo_url || pin?.pin_icon_url || account?.business_logo)
    : null;
  const el = document.createElement("button");
  el.type = "button";
  el.title = account?.business_name || pin?.pin_name || "Vendor";
  el.style.width = "34px";
  el.style.height = "34px";
  el.style.border = "0";
  el.style.background = "transparent";
  el.style.padding = "0";
  el.style.cursor = "pointer";
  if (image) {
    el.innerHTML = `<img src="${esc(image)}" alt="Vendor" style="width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 3px 6px rgba(0,0,0,.35))" />`;
  } else {
    el.innerHTML = '<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#F4A849;border:3px solid #2C4F4E;box-shadow:0 3px 8px rgba(0,0,0,.3);transform:rotate(-45deg)"><div style="width:8px;height:8px;border-radius:50%;background:#2C4F4E;margin:7px auto"></div></div>';
  }
  return el;
}

export default function MapboxTest() {
  const navigate = useNavigate();
  const { user, isLoadingAuth, navigateToLogin } = useAuth();
  const [mapAllowed, setMapAllowed] = useState(false);
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const mapboxRef = useRef(null);
  const halloweenMarkersRef = useRef([]);
  const vendorMarkersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const allListingsRef = useRef([]);
  const filteredListingsRef = useRef([]);
  const halloweenRef = useRef([]);
  const mainGeoJsonRef = useRef(buildGeoJson([]));
  const halloweenGeoJsonRef = useRef(buildGeoJson([]));

  const [status, setStatus] = useState("checking");
  const [error, setError] = useState("");
  const [rawData, setRawData] = useState({});
  const [search, setSearch] = useState("");
  const [mapStyle, setMapStyle] = useState("streets");
  const [zoom, setZoom] = useState(12);
  const [filters, setFilters] = useState({
    yardSales: true,
    neighborhoodSales: true,
    events: true,
    vendors: true,
    halloween: true,
  });

  useEffect(() => {
    document.title = "Yardit | Mapbox Test";
  }, []);

  const normalized = useMemo(() => {
    const now = new Date();
    const halloween = (rawData.halloweenLocations || [])
      .map((item) => normalizeListing({
        ...item,
        id: item.id,
        title: item.display_title || item.title || "Halloween Spot",
        listingType: "halloween_candy",
        lat: item.latitude,
        lng: item.longitude,
        tier: "premium",
        addressText: item.address || [item.street_address, item.city, item.state, item.zip_code].filter(Boolean).join(", "),
        startDateTime: item.start_date_time,
        endDateTime: item.end_date_time || item.expires_at,
      }))
      .filter(Boolean)
      .filter((item) => isHalloweenSpotVisible(item, now));

    const vendorEvents = (rawData.vendorEvents || [])
      .filter((event) => isPublishedVendorEvent(event, now))
      .map((event) => normalizeListing(toVendorEventListing(event, now)))
      .filter(Boolean);

    const base = (rawData.listings || []).map(normalizeListing).filter(Boolean);
    return { base, halloween, vendorEvents };
  }, [rawData]);

  const filteredMain = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...normalized.base, ...normalized.vendorEvents].filter((item) => {
      if (item.listingType === "yard_sale" && !filters.yardSales) return false;
      if (item.listingType === "neighborhood_sale" && !filters.neighborhoodSales) return false;
      if (item.listingType === "event" && !filters.events) return false;
      if (!q) return true;
      return [item.title, item.city, item.display_address, item.addressText, item.category, ...(item.categories || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [normalized.base, normalized.vendorEvents, filters, search]);

  useEffect(() => {
    allListingsRef.current = [...normalized.base, ...normalized.vendorEvents];
    filteredListingsRef.current = filteredMain;
    halloweenRef.current = normalized.halloween;
    mainGeoJsonRef.current = buildGeoJson(filteredMain);
    halloweenGeoJsonRef.current = buildGeoJson(filters.halloween ? normalized.halloween : []);

    const map = mapRef.current;
    if (map?.getSource("yardit-main")) map.getSource("yardit-main").setData(mainGeoJsonRef.current);
    if (map?.getSource("yardit-halloween")) map.getSource("yardit-halloween").setData(halloweenGeoJsonRef.current);

    halloweenMarkersRef.current.forEach(({ marker, item }) => {
      const show = filters.halloween && map && map.getZoom() >= 11 && normalized.halloween.some((x) => String(x.id) === String(item.id));
      marker.getElement().style.display = show ? "" : "none";
    });

    vendorMarkersRef.current.forEach(({ marker }) => {
      marker.getElement().style.display = filters.vendors ? "" : "none";
    });
  }, [normalized, filteredMain, filters.halloween, filters.vendors]);

  useEffect(() => {
    if (isLoadingAuth) return;
    let cancelled = false;
    setMapAllowed(false);
    if (!user?.id) {
      setStatus("sign-in");
      return;
    }
    if (user.email?.trim().toLowerCase() !== "hectorhernandez369@gmail.com") {
      setStatus("denied");
      return;
    }
    setStatus("checking");

    const init = async () => {
      try {
        const settingsResponse = await base44.functions.invoke("getPublicAppSettings", {});
        const publicSettings = settingsResponse?.data?.settings || [];
        const getSetting = (key, fallback) => publicSettings.find((item) => item.key === key)?.value ?? fallback;
        const emergencyLock = String(getSetting("cost_emergency_lock", "false")).toLowerCase() === "true";
        const mapboxEnabled = String(getSetting("cost_mapbox_enabled", "true")).toLowerCase() !== "false";
        if (emergencyLock || !mapboxEnabled) {
          if (!cancelled) {
            setError(emergencyLock ? "Emergency Cost Lock is active. Mapbox is intentionally disabled." : "Mapbox is disabled by Yardit Cost Protection.");
            setStatus("error");
          }
          return;
        }

        const response = await base44.functions.invoke("getPublicMapData", {});
        const data = response?.data || {};
        if (cancelled) return;
        setRawData(data);
        setStatus("loading-map");
        setMapAllowed(true);
      } catch (err) {
        if (!cancelled) {
          const needsLogin = [401, 403].includes(err?.status || err?.response?.status);
          setError(err?.message || "Unable to prepare the Mapbox map.");
          setStatus(needsLogin ? "sign-in" : "error");
        }
      }
    };
    init();
    return () => { cancelled = true; };
  }, [user?.id, user?.email, isLoadingAuth]);

  useEffect(() => {
    if (!mapAllowed || !mapNodeRef.current) return;
    // Effects run after React commits the map container; no frame guessing.
    let cancelled = false;
    let loadTimeout;
    const data = rawData;
    const init = async () => {
      try {
        const mapboxgl = await loadMapboxGl();
        if (cancelled) return;
        if (!mapboxgl.supported()) throw new Error("This browser cannot start WebGL. Enable hardware acceleration or open Yardit in a WebGL-enabled browser.");
        mapboxRef.current = mapboxgl;
        mapboxgl.accessToken = MAPBOX_TOKEN;

        const savedCenter = (() => {
          try {
            const raw = sessionStorage.getItem("yardit_last_map_center") || localStorage.getItem("yardit_last_map_center");
            const parsed = raw ? JSON.parse(raw) : null;
            if (Array.isArray(parsed) && Number.isFinite(Number(parsed[0])) && Number.isFinite(Number(parsed[1]))) {
              return [Number(parsed[1]), Number(parsed[0])];
            }
          } catch {}
          return DEFAULT_CENTER;
        })();

        const savedZoom = (() => {
          try {
            const stored = sessionStorage.getItem("yardit_last_map_zoom");
            const value = stored === null ? NaN : Number(stored);
            if (Number.isFinite(value) && value >= 0 && value <= 22) return value;
          } catch {}
          return 12;
        })();

        const map = new mapboxgl.Map({
          accessToken: MAPBOX_TOKEN,
          container: mapNodeRef.current,
          style: STREET_STYLE,
          center: savedCenter,
          zoom: savedZoom,
          attributionControl: true,
        });
        mapRef.current = map;
        setZoom(savedZoom);

        let mapReady = false;
        let lastMapError = "";
        loadTimeout = window.setTimeout(() => {
          if (!mapReady && !cancelled) {
            setError(lastMapError ? `Mapbox did not finish loading: ${lastMapError}` : "Mapbox did not finish loading. This is usually caused by a token/style permission problem or blocked Mapbox web resources.");
            setStatus("error");
          }
        }, 12000);

        // Mapbox GL fires non-fatal `error` events during normal startup (e.g. a
        // missing glyph range 404s). These must NOT flip the page into the error
        // overlay — only a real failure (thrown init error or the 12s timeout
        // above) should. We keep the last message for the timeout to surface.
        map.on("error", (event) => {
          lastMapError = event?.error?.message || event?.message || "Unknown Mapbox error";
          console.error("Mapbox GL error:", event?.error || event);
        });

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

        const install = () => {
          installMainLayers(map, mainGeoJsonRef.current);
          installHalloweenClusterLayers(map, halloweenGeoJsonRef.current);
        };

        const refreshSpecialMarkerVisibility = () => {
          const z = map.getZoom();
          setZoom(z);
          halloweenMarkersRef.current.forEach(({ marker }) => {
            marker.getElement().style.display = filters.halloween && z >= 11 ? "" : "none";
          });
          vendorMarkersRef.current.forEach(({ marker, account }) => {
            marker.getElement().style.display = filters.vendors && shouldShowVendorPinAtZoom(account, z) ? "" : "none";
          });
        };

        map.on("load", () => {
          mapReady = true;
          window.clearTimeout(loadTimeout);
          install();

          const halloweenItems = (data.halloweenLocations || []).map((item) => normalizeListing({
            ...item,
            title: item.display_title || item.title || "Halloween Spot",
            listingType: "halloween_candy",
            lat: item.latitude,
            lng: item.longitude,
            tier: "premium",
            addressText: item.address || [item.street_address, item.city, item.state, item.zip_code].filter(Boolean).join(", "),
            startDateTime: item.start_date_time,
            endDateTime: item.end_date_time || item.expires_at,
          })).filter(Boolean).filter((item) => isHalloweenSpotVisible(item, new Date()));

          halloweenMarkersRef.current = halloweenItems.map((item) => {
            const size = getHalloweenSpotMapSize(item, false, new Date(), map.getZoom());
            const el = document.createElement("button");
            el.type = "button";
            el.title = item.title;
            el.style.width = `${size}px`;
            el.style.height = `${size}px`;
            el.style.border = "0";
            el.style.padding = "0";
            el.style.background = "transparent";
            el.style.cursor = "pointer";
            el.innerHTML = `<img src="${esc(getHalloweenSpotIconUrl(item, new Date(), false))}" alt="Halloween" style="width:100%;height:100%;object-fit:contain;opacity:${getHalloweenSpotMapOpacity(item, new Date())};filter:drop-shadow(0 3px 5px rgba(0,0,0,.35))" />`;
            const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
              .setLngLat([item.lng, item.lat])
              .setPopup(new mapboxgl.Popup({ offset: 22 }).setHTML(popupHtml(item)))
              .addTo(map);
            return { marker, item };
          });

          const accounts = data.vendorAccounts || [];
          const pins = data.vendorPins || [];
          const checkIns = data.vendorCheckIns || [];
          const live = checkIns.filter(isLiveVendorCheckIn).map((checkIn) => {
            const pin = pins.find((p) => p.id === checkIn.vendor_pin_id);
            const account = accounts.find((a) => a.id === checkIn.vendor_account_id);
            if (!pin || !account || account.is_active === false || pin.is_active === false) return null;
            return { checkIn, pin, account, lat: checkIn.checkin_latitude, lng: checkIn.checkin_longitude };
          }).filter(Boolean);

          const livePinIds = new Set(live.map((item) => item.pin.id));
          const scheduled = pins.map((pin) => {
            if (livePinIds.has(pin.id)) return null;
            const account = accounts.find((a) => a.id === pin.vendor_account_id);
            if (!account || account.is_active === false || pin.is_active === false) return null;
            const active = getVendorPinActiveSchedule(pin, new Date());
            if (!active) return null;
            return { pin, account, lat: Number(pin.scheduled_lat), lng: Number(pin.scheduled_lng), active };
          }).filter((item) => item && Number.isFinite(item.lat) && Number.isFinite(item.lng));

          vendorMarkersRef.current = [...live, ...scheduled].map((item) => {
            const el = makeVendorElement(item.pin, item.account);
            const vendorTitle = item.account.business_name || item.pin.pin_name || "Vendor";
            const popup = new mapboxgl.Popup({ offset: 20 }).setHTML(`
              <div style="font-family:system-ui,sans-serif;min-width:200px">
                <div style="font-size:10px;font-weight:800;color:#7c3aed;text-transform:uppercase">Vendor</div>
                <div style="font-size:14px;font-weight:800;margin-top:3px">${esc(vendorTitle)}</div>
                <div style="font-size:11px;color:#64748b;margin-top:4px">${esc(item.checkIn?.checkin_display_address || item.pin.scheduled_location_label || "Live vendor location")}</div>
                <a href="/VendorPublicPage?accountId=${encodeURIComponent(item.account.id)}" style="display:block;margin-top:8px;background:#2C4F4E;color:#fff;text-decoration:none;text-align:center;border-radius:8px;padding:7px;font-size:11px;font-weight:700">View Vendor</a>
              </div>`);
            const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
              .setLngLat([Number(item.lng), Number(item.lat)])
              .setPopup(popup)
              .addTo(map);
            return { marker, account: item.account };
          });

          refreshSpecialMarkerVisibility();
          setStatus("ready");
        });

        map.on("style.load", install);

        map.on("click", "yardit-clusters", (event) => {
          const feature = map.queryRenderedFeatures(event.point, { layers: ["yardit-clusters"] })[0];
          const clusterId = feature?.properties?.cluster_id;
          if (clusterId == null) return;
          map.getSource("yardit-main").getClusterExpansionZoom(clusterId, (err, nextZoom) => {
            if (err) return;
            map.easeTo({ center: feature.geometry.coordinates, zoom: Math.min(nextZoom, 18) });
          });
        });

        map.on("click", "yardit-halloween-clusters", (event) => {
          const feature = map.queryRenderedFeatures(event.point, { layers: ["yardit-halloween-clusters"] })[0];
          const clusterId = feature?.properties?.cluster_id;
          if (clusterId == null) return;
          map.getSource("yardit-halloween").getClusterExpansionZoom(clusterId, (err, nextZoom) => {
            if (err) return;
            map.easeTo({ center: feature.geometry.coordinates, zoom: Math.min(nextZoom, 18) });
          });
        });

        map.on("click", "yardit-pins", (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const id = String(feature.properties.id);
          const item = allListingsRef.current.find((x) => String(x.id) === id);
          if (!item || map.getZoom() < listingThreshold(item)) return;
          new mapboxgl.Popup({ offset: 16 })
            .setLngLat(feature.geometry.coordinates)
            .setHTML(popupHtml(item))
            .addTo(map);
        });

        ["yardit-clusters", "yardit-halloween-clusters", "yardit-pins"].forEach((layer) => {
          map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
        });

        map.on("zoomend", refreshSpecialMarkerVisibility);
        map.on("moveend", () => {
          const center = map.getCenter();
          try {
            sessionStorage.setItem("yardit_last_map_center", JSON.stringify([center.lat, center.lng]));
            localStorage.setItem("yardit_last_map_center", JSON.stringify([center.lat, center.lng]));
            sessionStorage.setItem("yardit_last_map_zoom", String(map.getZoom()));
          } catch {}
        });
      } catch (err) {
        console.error("Mapbox test init failed", err);
        if (!cancelled) {
          setError(err?.message || "Unable to load Mapbox test.");
          setStatus("error");
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimeout);
      halloweenMarkersRef.current.forEach(({ marker }) => marker?.remove?.());
      vendorMarkersRef.current.forEach(({ marker }) => marker?.remove?.());
      userMarkerRef.current?.remove?.();
      mapRef.current?.remove?.();
      mapRef.current = null;
      halloweenMarkersRef.current = [];
      vendorMarkersRef.current = [];
    };
  }, [mapAllowed, rawData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    const style = mapStyle === "satellite" ? SATELLITE_STYLE : STREET_STYLE;
    if (map.getStyle()?.sprite?.includes(mapStyle === "satellite" ? "satellite" : "streets")) return;
    map.setStyle(style);
  }, [mapStyle, status]);

  const handleSearch = () => {
    const q = search.trim().toLowerCase();
    if (!q) return;
    const match = [...filteredMain, ...(filters.halloween ? normalized.halloween : [])].find((item) =>
      [item.title, item.city, item.display_address, item.addressText, item.address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
    if (!match || !mapRef.current) return;
    mapRef.current.flyTo({ center: [match.lng, match.lat], zoom: Math.max(listingThreshold(match), 15), speed: 1.2 });
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation || !mapRef.current || !mapboxRef.current) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const lngLat = [position.coords.longitude, position.coords.latitude];
      mapRef.current.flyTo({ center: lngLat, zoom: 15 });
      userMarkerRef.current?.remove?.();
      const el = document.createElement("div");
      el.style.width = "18px";
      el.style.height = "18px";
      el.style.borderRadius = "50%";
      el.style.background = "#2563eb";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,.35)";
      userMarkerRef.current = new mapboxRef.current.Marker({ element: el, anchor: "center" }).setLngLat(lngLat).addTo(mapRef.current);
    });
  };

  const stats = {
    listings: filteredMain.length,
    halloween: filters.halloween ? normalized.halloween.length : 0,
    vendors: filters.vendors ? vendorMarkersRef.current.length : 0,
  };

  if (status === "checking") {
    return <div className="min-h-[70vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#5DADA5]" /></div>;
  }

  if (status === "sign-in") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        <h1 className="font-bold text-lg">Sign in to open the Mapbox test</h1>
        <p className="text-sm text-muted-foreground">Sign in with your Yardit account to continue.</p>
        <Button onClick={() => navigateToLogin(window.location.href)}>Sign In</Button>
        <Button variant="outline" onClick={() => navigate("/")}>Return to Yardit</Button>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldAlert className="h-8 w-8 text-amber-600" />
        <h1 className="font-bold text-lg">Developer Mapbox Test</h1>
        <p className="text-sm text-slate-600">This map is restricted to the Yardit developer account.</p>
        <Button onClick={() => navigate("/")}>Return to Yardit</Button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] sm:h-[calc(100vh-140px)] flex flex-col bg-white">
      <div className="border-b border-slate-200 bg-white px-3 py-2 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 px-4 text-slate-600">Main</Button>
            <Button size="sm" className="h-8 px-4 bg-[#2C4F4E] hover:bg-[#2C4F4E] text-white">Mapbox</Button>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={handleMyLocation} className="h-8 w-8"><Crosshair className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setMapStyle((v) => v === "streets" ? "satellite" : "streets")} className="h-8 px-2 gap-1">
              <Layers3 className="h-4 w-4" /><span className="hidden sm:inline">{mapStyle === "streets" ? "Satellite" : "Streets"}</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              placeholder="Search Yardit map..."
              className="h-9 pl-9"
            />
          </div>
          <Button size="sm" onClick={handleSearch} className="h-9 bg-[#2C4F4E]">Search</Button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {[
            ["yardSales", "Yard Sales"],
            ["neighborhoodSales", "Neighborhood"],
            ["events", "Events"],
            ["vendors", "Vendors"],
            ["halloween", "Halloween"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilters((prev) => ({ ...prev, [key]: !prev[key] }))}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${filters[key] ? "border-[#2C4F4E] bg-[#2C4F4E] text-white" : "border-slate-200 bg-white text-slate-400"}`}
            >
              {label}
            </button>
          ))}
          <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">{zoom.toFixed(1)}x</Badge>
        </div>
      </div>

      <div className="bg-emerald-50 border-b border-emerald-200 px-3 py-1.5 text-[11px] text-emerald-800 text-center">
        Mapbox GL build • {stats.listings} listings • {stats.halloween} Halloween • {stats.vendors} vendors
      </div>

      <div className="relative flex-1 min-h-0">
        <div ref={mapNodeRef} className="absolute inset-0" />
        {(status === "loading-map" || status === "error") && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85">
            {status === "loading-map" ? (
              <div className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Building Mapbox GL map…</div>
            ) : (
              <div className="max-w-sm px-5 text-center">
                <p className="font-semibold text-red-700">Mapbox map could not load.</p>
                <p className="mt-1 text-sm text-slate-600">{error}</p>
                <Button className="mt-3" onClick={() => window.location.reload()}>Retry Map</Button>
              </div>
            )}
          </div>
        )}

        <div className="absolute left-3 bottom-3 z-10 rounded-xl border border-white/60 bg-white/90 backdrop-blur px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-600">
            <MapIcon className="h-3.5 w-3.5 text-[#5DADA5]" />
            <span>Mapbox GL engine</span>
            <SlidersHorizontal className="h-3 w-3 text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
}