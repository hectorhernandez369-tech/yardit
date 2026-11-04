import React from 'react';
import HolidayLightRating from '@/components/holiday-lights/HolidayLightRating';

// Keep the legacy entry point using the same protected 1-5 star voting flow.
export default function LightRatingForm(props) {
  return <HolidayLightRating {...props} />;
}
