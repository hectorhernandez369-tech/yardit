import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HUNT_ENABLED, useHunt } from '@/components/hunt/HuntContext';
import { calculateTotalDistance } from '@/components/hunt/huntUtils';

export default function HolidayLightsPopupHuntButton({ listing, guardAction, isGuest }) {
  const hunt = useHunt();
  if (!HUNT_ENABLED || !hunt) return null;
  const stop = hunt.huntStops.find(item => item.id === listing.id);
  const className = 'h-6 px-2 py-0 text-[10px] border-holiday-gold/40 bg-holiday-snow text-christmas-green hover:bg-holiday-snow/90';
  if (!stop) return <Button size="sm" variant="outline" className={className} onClick={() => guardAction(() => hunt.addToHunt(listing), { allowGuest: isGuest && hunt.huntStops.length < 2, modal: { title: 'Create a Free Account to Save More Stops', description: 'Guests can preview up to 2 Hunt stops.', detail: 'Create a free account to save more stops and continue your hunt.' } })}><Plus className="mr-1 h-3 w-3" />Add Stop</Button>;
  const status = stop.huntStatus || 'not_started';
  if (status === 'completed') return <span className="px-2 text-[10px] text-holiday-snow">Completed</span>;
  if (status === 'skipped') return <><span className="text-[10px] text-holiday-snow">Skipped</span><Button size="sm" variant="outline" className={className} onClick={() => hunt.updateStopStatus(listing.id, 'not_started')}>Reset</Button></>;
  if (status === 'arrived') return <Button size="sm" className={className} onClick={() => hunt.updateStopStatus(listing.id, 'completed')}>Complete</Button>;
  const distanceFeet = hunt.gpsLocation ? calculateTotalDistance([hunt.gpsLocation, listing]) * 5280 : Infinity;
  const withinDistance = Number.isFinite(distanceFeet) && distanceFeet <= 50;
  return <div className="flex flex-col items-center">
    <Button size="sm" variant="outline" className={className} disabled={!withinDistance} onClick={() => hunt.updateStopStatus(listing.id, 'arrived')}>Check In</Button>
    {!withinDistance && <span className="mt-0.5 text-[9px] text-holiday-snow">Move within 50ft{Number.isFinite(distanceFeet) ? ` (${distanceFeet.toFixed(0)}ft)` : ''}</span>}
  </div>;
}