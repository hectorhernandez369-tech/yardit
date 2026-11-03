import React, { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import HolidayLightsPopupActions from '@/components/holiday-lights/HolidayLightsPopupActions';
import HolidayLightsSummary from '@/components/holiday-lights/HolidayLightsSummary';

export default function HolidayLightsMapMarker({ spot, icon, now, onSelect }) {
  const position = useMemo(() => [spot.latitude, spot.longitude], [spot.latitude, spot.longitude]);
  const eventHandlers = useMemo(() => ({
    popupopen: () => onSelect(spot),
    popupclose: () => onSelect(current => current?.id === spot.id ? null : current),
  }), [spot, onSelect]);
  return <Marker position={position} icon={icon} eventHandlers={eventHandlers}>
    <Popup maxWidth={310} autoPan className="yardit-christmas-popup">
      <div className="w-[280px] max-w-[calc(100vw-48px)] overflow-hidden rounded-2xl border border-holiday-gold/60 bg-gradient-to-br from-christmas-red to-christmas-green text-holiday-snow shadow-xl">
        <HolidayLightsSummary spot={spot} now={now} compact embedded />
        <HolidayLightsPopupActions spot={spot} />
      </div>
    </Popup>
  </Marker>;
}