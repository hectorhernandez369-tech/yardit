import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import attachMapHoldZoom from '@/lib/mapHoldZoom';

export default function MapHoldZoom() {
  const map = useMap();
  useEffect(() => attachMapHoldZoom(map), [map]);
  return null;
}