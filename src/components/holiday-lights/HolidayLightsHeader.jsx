import React from 'react';
import { TreePine } from 'lucide-react';

export default function HolidayLightsHeader({ editing }) {
  return <header className="relative isolate overflow-hidden rounded-2xl border-2 border-holiday-gold bg-gradient-to-br from-christmas-red via-christmas-red to-christmas-green p-6 pt-12 text-holiday-snow">
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex h-9 justify-around border-t-2 border-christmas-green">
      {Array.from({ length: 14 }, (_, index) => <span key={index} className="holiday-header-light relative h-5 w-px bg-christmas-green" style={{ '--light-delay': `${index % 4 * -0.6}s` }}><span className={`absolute -left-1 bottom-0 h-3 w-2 rounded-full ${['bg-holiday-gold text-holiday-gold', 'bg-holiday-snow text-holiday-snow', 'bg-christmas-green text-christmas-green', 'bg-christmas-red text-christmas-red'][index % 4]}`} /></span>)}
    </div>
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 28 }, (_, index) => <span key={index} className="holiday-header-snow absolute top-0 rounded-full bg-holiday-snow" style={{ left: `${(index * 37) % 100}%`, width: `${3 + index % 4}px`, height: `${3 + index % 4}px`, '--snow-duration': `${5 + index % 6}s`, '--snow-delay': `${-index * 1.3}s`, '--snow-drift': `${index % 2 ? 24 : -24}px` }} />)}
    </div>
    <div className="relative z-10">
      <div className="mb-3 inline-flex rounded-xl border border-holiday-gold bg-christmas-green p-2"><TreePine className="h-9 w-9 text-holiday-gold" /></div>
      <h1 className="text-2xl font-bold">{editing ? 'Edit Holiday Lights' : 'Post Holiday Lights'}</h1>
      <p className="mt-2 text-sm">Help neighbors discover your festive display. Free to post, separate from Halloween.</p>
    </div>
  </header>;
}