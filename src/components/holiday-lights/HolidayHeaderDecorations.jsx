import React from 'react';

export default function HolidayHeaderDecorations() {
  return <>
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex h-9 justify-around border-t-2 border-christmas-green">
      {Array.from({ length: 14 }, (_, index) => <span key={index} className="holiday-header-light relative h-5 w-px bg-christmas-green" style={{ '--light-delay': `${index % 4 * -0.6}s` }}><span className={`absolute -left-1 bottom-0 h-3 w-2 rounded-full ${['bg-holiday-gold text-holiday-gold', 'bg-holiday-snow text-holiday-snow', 'bg-christmas-green text-christmas-green', 'bg-christmas-red text-christmas-red'][index % 4]}`} /></span>)}
    </div>
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 28 }, (_, index) => <span key={index} className="holiday-header-snow absolute top-0 rounded-full bg-holiday-snow" style={{ left: `${(index * 37) % 100}%`, width: `${3 + index % 4}px`, height: `${3 + index % 4}px`, '--snow-duration': `${5 + index % 6}s`, '--snow-delay': `${-index * 1.3}s`, '--snow-drift': `${index % 2 ? 24 : -24}px` }} />)}
    </div>
  </>;
}