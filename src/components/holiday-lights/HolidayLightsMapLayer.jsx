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

const ICON_CACHE=new Map();
function getIcon(spot,on) {
 const type=CHRISTMAS_SPOT_TYPES.some(x=>x.value===spot.christmas_spot_type)?spot.christmas_spot_type:'christmas_decorations';
 const key=type+(on?'on':'off');
 if (ICON_CACHE.has(key)) return ICON_CACHE.get(key);
 const size=on?54:45;
 const html=renderToStaticMarkup(<div className={on?'drop-shadow-[0_0_9px_rgba(251,191,36,0.85)]':''}><ChristmasIcon type={type} size={size} className={on?'':'opacity-70'}/></div>);
 const icon=L.divIcon({className:'yardit-christmas-marker',html,iconSize:[size,size],iconAnchor:[size/2,size/2],popupAnchor:[0,-size/2]});
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
  const mapHeight=map.getSize().y||0;
  const offset=Math.min(150,Math.max(75,mapHeight*0.2));
  const targetPoint=map.project(target,zoom).subtract([0,offset]);
  const center=map.unproject(targetPoint,zoom);
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