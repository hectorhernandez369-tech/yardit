import React, { useMemo } from 'react';
import { Star } from 'lucide-react';
import { Marker, Popup, useMap } from 'react-leaflet';
import HolidayLightsPopupActions from '@/components/holiday-lights/HolidayLightsPopupActions';
import HolidayLightsSummary from '@/components/holiday-lights/HolidayLightsSummary';
import HolidayLightRating from '@/components/holiday-lights/HolidayLightRating';
import { centerChristmasPopup } from './centerChristmasPopup';

export default function HolidayLightsMapMarker({ spot, icon, now, onSelect, markerRef }) {
  const map = useMap();
  const position = useMemo(() => [spot.latitude, spot.longitude], [spot.latitude, spot.longitude]);
  const eventHandlers = useMemo(() => ({
    popupopen: event => {
      onSelect(spot);
      // Leaflet opens the popup on a marker click. Wait until the card is
      // measured, then pan the map so both card and icon are visible.
      const popup = event.popup;
      const element = popup?.getElement?.();
      requestAnimationFrame(() => {
        if (map.hasLayer(popup)) {
          centerChristmasPopup(map, position, element, true);
        }
      });
    },
    popupclose: () => onSelect(current => current?.id === spot.id ? null : current),
  }), [spot, onSelect, map, position]);
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