import React, { useMemo } from 'react';
import { Star } from 'lucide-react';
import { Marker, Popup } from 'react-leaflet';
import HolidayLightsPopupActions from '@/components/holiday-lights/HolidayLightsPopupActions';
import HolidayLightsSummary from '@/components/holiday-lights/HolidayLightsSummary';
import HolidayLightRating from '@/components/holiday-lights/HolidayLightRating';

export default function HolidayLightsMapMarker({ spot, icon, now, onSelect, markerRef }) {
  const position = useMemo(() => [spot.latitude, spot.longitude], [spot.latitude, spot.longitude]);
  const eventHandlers = useMemo(() => ({
    popupopen: () => onSelect(spot),
    popupclose: () => onSelect(current => current?.id === spot.id ? null : current),
  }), [spot, onSelect]);
  const average = Number(spot.average_rating || 0);
  const ratings = Number(spot.ratings_count || 0);
  return <Marker ref={markerRef} position={position} icon={icon} eventHandlers={eventHandlers}>
    <Popup maxWidth={310} autoPan={false} className="yardit-christmas-popup yardit-halloween-popup">
      <div className="w-[280px] max-w-[calc(100vw-48px)] overflow-hidden rounded-2xl border border-holiday-gold/60 bg-[#123f30] text-holiday-snow shadow-xl">
        <HolidayLightsSummary spot={spot} now={now} compact embedded />
        <div className="px-2 pb-2"><HolidayLightRating locationId={spot.id} displayActive={spot.display_active} compact /></div>
        <HolidayLightsPopupActions spot={spot} />
      </div>
    </Popup>
  </Marker>;
}