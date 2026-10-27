import React from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { SPECIALTY_COLORS, SPECIALTY_FONTS, specialtyStyle, escapeSpecialtyText } from "@/lib/specialtyMarquee";

// Independent emergency switch: disable this layer without touching any other map pins.
export const SPECIALTY_MARQUEES_ENABLED = true;
const css = `
.yardit-specialty-marker { background:transparent; border:0 }
.yardit-specialty-scene { position:relative; width:164px; height:152px }
.yardit-specialty-beam { position:absolute; bottom:57px; left:75px; width:16px; height:83px; transform-origin:50% 100%; opacity:.78; background:linear-gradient(to top,rgba(255,213,105,.9),rgba(255,239,183,.18) 80%,transparent); clip-path:polygon(38% 100%,62% 100%,100% 0,0 0); filter:drop-shadow(0 0 8px #ffd58a) }
.yardit-specialty-beam.left {animation:yardit-specialty-left 3.6s ease-in-out infinite alternate}
.yardit-specialty-beam.right {animation:yardit-specialty-right 3.6s ease-in-out infinite alternate}
@keyframes yardit-specialty-left {from{transform:rotate(-36deg)}to{transform:rotate(12deg)}}
@keyframes yardit-specialty-right {from{transform:rotate(36deg)}to{transform:rotate(-12deg)}}
@media(prefers-reduced-motion:reduce){.yardit-specialty-beam{animation:none!important}.yardit-specialty-beam.left{transform:rotate(-22deg)}.yardit-specialty-beam.right{transform:rotate(22deg)}}
`;
function iconFor(listing) {
  const preset = specialtyStyle({ color:listing.specialty_marquee_color, font:listing.specialty_marquee_font, headline:listing.specialty_marquee_headline || listing.title });
  const palette = SPECIALTY_COLORS[preset.color];
  const headline = escapeSpecialtyText(preset.headline);
  const html = `<div class="yardit-specialty-scene"><div class="yardit-specialty-beam left"></div><div class="yardit-specialty-beam right"></div><div style="position:absolute;bottom:13px;left:13px;width:138px;box-sizing:border-box;padding:8px 5px;text-align:center;border:5px dotted ${palette.border};border-radius:10px;background:${palette.background};box-shadow:0 0 0 3px #a66a28,0 0 19px rgba(255,180,62,.8);color:#ffe8aa;font-family:${SPECIALTY_FONTS[preset.font]}"><div style="font-size:10px;font-weight:900">YARDIT'S ON!</div><div style="font-size:16px;font-weight:900;line-height:1.15;overflow-wrap:anywhere">${headline}</div><div style="font-size:9px;font-weight:800;color:white">COMING SOON</div></div></div>`;
  return L.divIcon({className:"yardit-specialty-marker",html,iconSize:[164,152],iconAnchor:[82,139],popupAnchor:[0,-70]});
}
export default function SpecialtyMarqueeMarkers({ listings = [], enabled = SPECIALTY_MARQUEES_ENABLED }) {
  const map = useMap();
  if (!enabled) return null;
  const now = Date.now();
  const visible = listings.filter(x => x.listingType === "event" && x.specialty_marquee_enabled === true && x.created_by_admin === true && ["active","scheduled","activated_locked"].includes(x.status) && Number.isFinite(Number(x.lat)) && Number.isFinite(Number(x.lng)) && (!x.endDateTime || Date.parse(x.endDateTime) >= now)).slice(0, 3);
  return <><style>{css}</style>{visible.map(x=><Marker key={x.id} position={[Number(x.lat),Number(x.lng)]} icon={iconFor(x)} zIndexOffset={1100}
    eventHandlers={{ popupopen:(e)=>{ requestAnimationFrame(()=>{const m=e.target.getElement()?.getBoundingClientRect(),p=e.popup.getElement()?.getBoundingClientRect(),c=map.getContainer().getBoundingClientRect();if(m&&p)map.panBy([(Math.min(m.left,p.left)+Math.max(m.right,p.right)-c.left-c.right)/2,(Math.min(m.top,p.top)+Math.max(m.bottom,p.bottom)-c.top-c.bottom)/2],{animate:true,duration:.35});}); } }}>
    <Popup maxWidth={195} minWidth={165} autoPan={false}><div style={{maxWidth:190,padding:5}}><strong>{x.title}</strong><p>{x.display_address || x.addressText}</p><p>{x.startDateTime ? new Date(x.startDateTime).toLocaleString() : ""}</p></div></Popup>
  </Marker>)}</>;
}
