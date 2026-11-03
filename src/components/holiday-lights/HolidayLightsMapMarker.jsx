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
      <div className="w-[235px] max-w-[70vw]">
        <HolidayLightsSummary spot={spot} now={now} compact />
        <HolidayLightsPopupActions spot={spot} />
      </div>
    </Popup>
  </Marker>;
}