import { TileLayer } from "react-leaflet";

const MAPBOX_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";

export default function VendorEventMapboxTileLayer({ mapStyle = "standard" }) {
  const styleId = mapStyle === "satellite" ? "satellite-streets-v12" : "streets-v12";

  return (
    <TileLayer
      key={styleId}
      attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      url={`https://api.mapbox.com/styles/v1/mapbox/${styleId}/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`}
      tileSize={512}
      zoomOffset={-1}
    />
  );
}