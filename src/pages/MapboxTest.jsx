import React, { useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Map as MapIcon, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MAPBOX_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";
const DEFAULT_CENTER = [-119.055, 36.135];

function loadMapboxGl() {
  return new Promise((resolve, reject) => {
    if (window.mapboxgl) {
      resolve(window.mapboxgl);
      return;
    }

    if (!document.querySelector('link[data-yardit-mapbox-gl="true"]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.css";
      css.dataset.yarditMapboxGl = "true";
      document.head.appendChild(css);
    }

    const existing = document.querySelector('script[data-yardit-mapbox-gl="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.mapboxgl), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.js";
    script.async = true;
    script.dataset.yarditMapboxGl = "true";
    script.onload = () => resolve(window.mapboxgl);
    script.onerror = reject;
    document.head.appendChild(script);
  });
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
    title: item?.title || item?.display_title || "Yardit location",
    tier: item?.tier || "free",
    listingType: item?.listingType || item?.listing_type || item?.type || "yard_sale",
  };
}

function pinStyle(listing) {
  if (listing.listingType === "halloween_candy" || listing.type === "halloween_candy") {
    return { background: "#f97316", border: "#581c87", size: 24 };
  }
  if (listing.tier === "premium") return { background: "#5DADA5", border: "#F4A849", size: 28 };
  if (listing.tier === "featured" || listing.tier === "map_pin") return { background: "#5DADA5", border: "#2C4F4E", size: 25 };
  if (listing.listingType === "neighborhood_sale") return { background: "#F4A849", border: "#2C4F4E", size: 30 };
  return { background: "#6b7280", border: "#4b5563", size: 22 };
}

export default function MapboxTest() {
  const navigate = useNavigate();
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef([]);
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState("");
  const [listings, setListings] = useState([]);

  useEffect(() => {
    document.title = "Yardit | Mapbox Test";
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        const [byUser, byEmail] = await Promise.all([
          base44.entities.AdminProfile.filter({ user_id: currentUser.id }).catch(() => []),
          currentUser.email ? base44.entities.AdminProfile.filter({ email: currentUser.email.toLowerCase() }).catch(() => []) : Promise.resolve([]),
        ]);
        const adminProfile = [...(byUser || []), ...(byEmail || [])].find((profile) => profile?.is_active === true);
        if (!adminProfile) {
          if (!cancelled) setStatus("denied");
          return;
        }

        const response = await base44.functions.invoke("getPublicMapData", {});
        const data = response?.data || {};
        const combined = [
          ...(data.listings || []),
          ...(data.halloweenLocations || []).map((item) => ({
            ...item,
            listingType: "halloween_candy",
            lat: item.latitude,
            lng: item.longitude,
            tier: "free",
          })),
        ].map(normalizeListing).filter(Boolean);

        if (cancelled) return;
        setListings(combined);
        setStatus("loading-map");

        const mapboxgl = await loadMapboxGl();
        if (cancelled || !mapNodeRef.current) return;

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
            const z = Number(sessionStorage.getItem("yardit_last_map_zoom"));
            if (Number.isFinite(z)) return z;
          } catch {}
          return 12;
        })();

        const map = new mapboxgl.Map({
          container: mapNodeRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: savedCenter,
          zoom: savedZoom,
        });
        mapRef.current = map;

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

        map.on("load", () => {
          if (cancelled) return;
          markerRefs.current = combined.map((listing) => {
            const style = pinStyle(listing);
            const el = document.createElement("button");
            el.type = "button";
            el.title = listing.title;
            el.style.width = `${style.size}px`;
            el.style.height = `${style.size}px`;
            el.style.borderRadius = "9999px";
            el.style.background = style.background;
            el.style.border = `3px solid ${style.border}`;
            el.style.boxShadow = "0 2px 6px rgba(0,0,0,.28)";
            el.style.cursor = "pointer";

            const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(
              `<div style="min-width:180px"><strong>${String(listing.title).replace(/[<>]/g, "")}</strong><br/><span style="font-size:12px;color:#64748b">Mapbox GL test marker</span></div>`
            );

            return new mapboxgl.Marker({ element: el, anchor: "center" })
              .setLngLat([listing.lng, listing.lat])
              .setPopup(popup)
              .addTo(map);
          });

          setStatus("ready");
        });

        map.on("moveend", () => {
          const center = map.getCenter();
          try {
            sessionStorage.setItem("yardit_last_map_center", JSON.stringify([center.lat, center.lng]));
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
      markerRefs.current.forEach((marker) => marker?.remove?.());
      markerRefs.current = [];
      mapRef.current?.remove?.();
      mapRef.current = null;
    };
  }, []);

  const pinCount = useMemo(() => listings.length, [listings]);

  if (status === "checking") {
    return <div className="min-h-[70vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#5DADA5]" /></div>;
  }

  if (status === "denied") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldAlert className="h-8 w-8 text-amber-600" />
        <h1 className="font-bold text-lg">Private Mapbox Test</h1>
        <p className="text-sm text-slate-600">This test map is available only to active Yardit admins.</p>
        <Button onClick={() => navigate("/")}>Return to Yardit</Button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] sm:h-[calc(100vh-140px)] flex flex-col bg-white">
      <div className="border-b border-slate-200 bg-white px-3 py-2 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 px-4 text-slate-600">Main</Button>
          <Button size="sm" className="h-8 px-4 bg-[#2C4F4E] hover:bg-[#2C4F4E] text-white">Mapbox</Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <MapIcon className="h-4 w-4" />
          <span>{pinCount} test locations</span>
          <span className="hidden sm:inline">• Phase 1</span>
        </div>
      </div>

      <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 text-[11px] text-amber-800 text-center">
        Private Mapbox GL test — the public Yardit map is still using the current Leaflet engine.
      </div>

      <div className="relative flex-1 min-h-0">
        <div ref={mapNodeRef} className="absolute inset-0" />
        {(status === "loading-map" || status === "error") && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85">
            {status === "loading-map" ? (
              <div className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Loading Mapbox GL…</div>
            ) : (
              <div className="max-w-sm px-5 text-center">
                <p className="font-semibold text-red-700">Mapbox test could not load.</p>
                <p className="mt-1 text-sm text-slate-600">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
