import React, { useEffect, useState } from 'react';
import { Marker, Popup, useMapEvents } from 'react-leaflet';
import { useInfiniteQuery } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { TreePine } from 'lucide-react';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { holidayLightState, isHolidayLightsSeason } from '@/lib/holidayLights';
import HolidayLightsSummary from '@/components/holiday-lights/HolidayLightsSummary';
import HolidayLightsMapCard from '@/components/holiday-lights/HolidayLightsMapCard';

const makeIcon = on => L.divIcon({ className: 'yardit-holiday-lights-marker', html: renderToStaticMarkup(<div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-holiday-gold bg-holiday-night text-holiday-gold shadow-lg ${on ? '' : 'opacity-60'}`}><TreePine size={32} /></div>), iconSize: [48, 48], iconAnchor: [24, 24], popupAnchor: [0, -22] });
const icons = { on: makeIcon(true), off: makeIcon(false) };
export default function HolidayLightsMapLayer({ enabled = true, now }) {
  const [bounds, setBounds] = useState(null);
  const map = useMapEvents({ moveend: () => updateBounds() });
  function updateBounds() {
    const b = map.getBounds();
    setBounds({ south: b.getSouth(), north: b.getNorth(), west: b.getWest(), east: b.getEast() });
  }
  useEffect(() => { updateBounds(); }, [map]);
  const center = map.getCenter();
  const season = isHolidayLightsSeason(now, { lat: center.lat, lng: center.lng });
  const query = useInfiniteQuery({ queryKey: ['holidayLights', 'map', bounds], enabled: season && enabled && !!bounds, initialPageParam: null,
    queryFn: async ({ pageParam }) => (await base44.functions.invoke('getPublicMapData', { holidayLights: true, bounds, cursor: pageParam })).data,
    getNextPageParam: page => page.has_more ? page.next_cursor : undefined,
  });
  if (!season) return null;
  return <>
    <HolidayLightsMapCard enabled={enabled} query={query} />
    {enabled && query.data?.pages.flatMap(page => page.items).map(spot => <Marker key={spot.id} position={[spot.latitude, spot.longitude]} icon={holidayLightState(spot, now) === 'Lights on now' ? icons.on : icons.off} eventHandlers={{ click: () => map.panTo([spot.latitude, spot.longitude]) }}>
      <Popup maxWidth={290} autoPan><HolidayLightsSummary spot={spot} now={now} compact /><Button asChild className="mt-2 w-full"><Link to={`/HolidayLightsDetail?id=${spot.id}`}>View display</Link></Button></Popup>
    </Marker>)}
  </>;
}