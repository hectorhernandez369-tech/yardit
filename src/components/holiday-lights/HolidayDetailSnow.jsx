import React from 'react';

export default function HolidayDetailSnow() {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
    {Array.from({ length: 40 }, (_, index) => <span key={index} className="holiday-detail-snow absolute rounded-full bg-holiday-snow" style={{ left: `${index * 37 % 100}%`, width: `${3 + index % 4}px`, height: `${3 + index % 4}px`, '--snow-duration': `${8 + index % 7}s`, '--snow-delay': `${-index * 1.7}s`, '--snow-drift': `${index % 2 ? 30 : -30}px` }} />)}
  </div>;
}