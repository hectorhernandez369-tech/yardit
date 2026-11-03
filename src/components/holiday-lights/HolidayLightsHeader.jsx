import React from 'react';
import { TreePine } from 'lucide-react';
import HolidayHeaderDecorations from '@/components/holiday-lights/HolidayHeaderDecorations';

export default function HolidayLightsHeader({ editing }) {
  return <header className="relative isolate overflow-hidden rounded-2xl border-2 border-holiday-gold bg-gradient-to-br from-christmas-red via-christmas-red to-christmas-green p-6 pt-12 text-holiday-snow">
    <HolidayHeaderDecorations />
    <div className="relative z-10">
      <div className="mb-3 inline-flex rounded-xl border border-holiday-gold bg-christmas-green p-2"><TreePine className="h-9 w-9 text-holiday-gold" /></div>
      <h1 className="text-2xl font-bold">{editing ? 'Edit Holiday Lights' : 'Post Holiday Lights'}</h1>
      <p className="mt-2 text-sm">Help neighbors discover your festive display. Free to post, separate from Halloween.</p>
    </div>
  </header>;
}