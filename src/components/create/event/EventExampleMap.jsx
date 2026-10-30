import React from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { getEventMarkerIcon } from "@/components/map/eventMarkerIcons";
import { getMarqueeBoardCollapsedHtml, getMarqueeBoardExpandedHtml } from "@/components/map/MarqueeBoard";
import "leaflet/dist/leaflet.css";

const tiles = "https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";
export default function EventExampleMap({ listing, marqueeStage = "mini", onStage, onDetails }) {
  const marquee = !!listing.event_add_ons?.marquee;
  const board = marqueeStage === "expanded" ? getMarqueeBoardExpandedHtml(listing, { isActive: true }) : marqueeStage === "collapsed" ? getMarqueeBoardCollapsedHtml(listing, { isActive: true }) : "";
  const icon = getEventMarkerIcon(listing, false, marquee && marqueeStage !== "mini", board, 14);
  const handleClick = (event) => {
    const target = event.originalEvent?.target;
    if (target?.closest("[data-marquee-details]")) onDetails();
    else if (target?.closest("[data-marquee-collapse]")) onStage("collapsed");
    else if (marquee) onStage(marqueeStage === "mini" ? "collapsed" : "expanded");
    else onDetails();
  };
  return (
    <div className="isolate min-w-0 overflow-hidden rounded-xl border bg-muted">
      <MapContainer center={[listing.lat, listing.lng]} zoom={14} minZoom={14} maxZoom={16} scrollWheelZoom={false} attributionControl={true} style={{ height: 280, width: "100%" }}>
        <TileLayer url={tiles} tileSize={512} zoomOffset={-1} maxZoom={22} maxNativeZoom={22} attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        <Marker position={[listing.lat, listing.lng]} icon={icon} eventHandlers={{ click: handleClick }} keyboard={true} title="Illustrative event marker. Activate to explore." />
      </MapContainer>
    </div>
  );
}