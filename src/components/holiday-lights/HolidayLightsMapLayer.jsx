import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMapEvents } from 'react-leaflet';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import HolidayLightsMapMarker from '@/components/holiday-lights/HolidayLightsMapMarker';
import { base44 } from '@/api/base44Client';
import { holidayLightState, isHolidayLightsSeason } from '@/lib/holidayLights';
import { CHRISTMAS_SPOT_TYPES, ChristmasIcon } from './ChristmasDesign';
import HolidayLightsMapCard from './HolidayLightsMapCard';
import { Star } from 'lucide-react';

const ICON_CACHE=new Map();
function getIcon(spot,on) {
 const type=CHRISTMAS_SPOT_TYPES.some(x=>x.value===spot.christmas_spot_type)?spot.christmas_spot_type:'christmas_decorations';
 const score=Number(spot.average_rating||0), votes=Number(spot.ratings_count||0);
 const label=votes>0&&score>0?score.toFixed(1):'';
 const key=type+(on?'on':'off')+'-'+label;
 if (ICON_CACHE.has(key)) return ICON_CACHE.get(key);
 const size=on?54:45;
 const html=renderToStaticMarkup(<div className={'flex flex-col items-center '+(on?'drop-shadow-[0_0_9px_rgba(251,191,36,0.85)]':'')}>{label&&<div className="mb-0.5 flex items-center gap-0.5 rounded-full border border-amber-300 bg-[#123f30] px-1.5 py-0.5 text-[11px] font-bold text-amber-200"><Star size={10} className="fill-amber-400 text-amber-400"/>{label}</div>}<ChristmasIcon type={type} size={size} className={on?'':'opacity-70'}/></div>);
 const icon=L.divIcon({className:'yardit-christmas-marker',html,iconSize:[size, size+(label?20:0)],iconAnchor:[size/2,size+(label?20:0)],popupAnchor:[0,-size-(label?20:0)]});
 ICON_CACHE.set(key,icon);
 return icon;
}

export default function HolidayLightsMapLayer({enabled=true,now,targetId=''}) {
 const [bounds,setBounds]=useState(null);
 const [selectedSpot,setSelectedSpot]=useState(null);
 const targetMarkerRef=useRef(null);
 const lastFocusedId=useRef(null);
 const setTargetMarker=useCallback(ref=>{ targetMarkerRef.current=ref; },[]);
 const map=useMapEvents({moveend:updateBounds});
 function updateBounds() {
  const b=map.getBounds();
  setBounds({south:b.getSouth(),north:b.getNorth(),west:b.getWest(),east:b.getEast()});
 }
 useEffect(()=>{updateBounds();},[map]);
 const center=map.getCenter();
 const season=isHolidayLightsSeason(now,{lat:center.lat,lng:center.lng});
 const query=useInfiniteQuery({queryKey:['holidayLights','map',bounds],enabled:season&&enabled&&!!bounds,initialPageParam:null,
  queryFn:async ({pageParam})=>(await base44.functions.invoke('getPublicMapData',{holidayLights:true,bounds,cursor:pageParam})).data,
  placeholderData:previous=>previous,
  getNextPageParam:page=>page.has_more?page.next_cursor:undefined,
 });
 // Fetch the linked listing independently from the visible map bounds.
 const targetQuery=useQuery({
  queryKey:['holidayLights','map-focus',targetId],
  enabled:season&&enabled&&!!targetId,
  queryFn:async()=>{
   const result=await base44.functions.invoke('getPublicMapData',{holidayLightId:targetId});
   return result?.data?.location||null;
  },
 });
 const spots=useMemo(()=>{
  const items=query.data?.pages.flatMap(page=>page.items||[])||[];
  const additional=[selectedSpot,targetQuery.data].filter(Boolean);
  const combined=[...items];
  for(const spot of additional){if(!combined.some(item=>item.id===spot.id))combined.push(spot);}
  return combined;
 },[query.data,selectedSpot,targetQuery.data]);
 useEffect(()=>{lastFocusedId.current=null;},[targetId]);
 useEffect(()=>{
  if(!season||!enabled||!targetId||targetQuery.data?.id!==targetId||lastFocusedId.current===targetId)return;
  const spot=targetQuery.data;
  if(!Number.isFinite(spot.latitude)||!Number.isFinite(spot.longitude))return;
  lastFocusedId.current=targetId;
  setSelectedSpot(spot);
  const target=[spot.latitude,spot.longitude];
  const zoom=Math.max(16,map.getZoom());
  const center=target;
  let cancelled=false;
  const open=()=>{if(!cancelled)targetMarkerRef.current?.openPopup?.();};
  // Give Leaflet time to mount the marker before opening its popup.
  map.once('moveend',open);
  map.flyTo(center,zoom,{animate:true,duration:0.65});
  const fallback=window.setTimeout(open,850);
  return ()=>{cancelled=true;map.off('moveend',open);window.clearTimeout(fallback);};
 },[season,enabled,targetId,targetQuery.data,map]);
 useEffect(()=>{if(!enabled) setSelectedSpot(null);},[enabled]);
 if(!season) return null;
 return <>
  <HolidayLightsMapCard enabled={enabled} query={query}/>
  {enabled&&spots.map(spot=><HolidayLightsMapMarker key={spot.id} spot={spot} now={now} icon={getIcon(spot,holidayLightState(spot,now)==='Lights on now')} onSelect={setSelectedSpot} markerRef={spot.id===targetId?setTargetMarker:undefined}/>)}
 </>;
}