import React, { useEffect, useMemo, useState } from 'react';
import { Marker, Popup, useMapEvents } from 'react-leaflet';
import { useInfiniteQuery } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { holidayLightState, isHolidayLightsSeason } from '@/lib/holidayLights';
import { CHRISTMAS_SPOT_TYPES, ChristmasIcon } from './ChristmasDesign';
import HolidayLightsSummary from './HolidayLightsSummary';
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

export default function HolidayLightsMapLayer({enabled=true,now}) {
 const [bounds,setBounds]=useState(null);
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
 const spots=useMemo(()=>query.data?.pages.flatMap(page=>page.items||[])||[],[query.data]);
 if(!season) return null;
 return <>
  <HolidayLightsMapCard enabled={enabled} query={query}/>
  {enabled&&spots.map(spot=><Marker key={spot.id} position={[spot.latitude,spot.longitude]} icon={getIcon(spot,holidayLightState(spot,now)==='Lights on now')} eventHandlers={{click:()=>map.panTo([spot.latitude,spot.longitude])}}>
    <Popup maxWidth={310} autoPan className="yardit-christmas-popup">
     <div className="w-[235px] max-w-[70vw]"><HolidayLightsSummary spot={spot} now={now} compact/>
       <Button asChild className="mt-2 w-full bg-emerald-800 font-bold text-white hover:bg-emerald-700"><Link to={'/HolidayLightsDetail?id='+spot.id}>View Details</Link></Button>
     </div>
    </Popup>
  </Marker>)}
 </>;
}