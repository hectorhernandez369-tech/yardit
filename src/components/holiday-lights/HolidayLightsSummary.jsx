import React from 'react';
import { TreePine, MapPin, Clock, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import FounderBadge from '@/components/founder/FounderBadge';
import { holidayDate, holidayLightState, holidayTimeZone } from '@/lib/holidayLights';

export default function HolidayLightsSummary({ spot, now = new Date(), compact = false }) {
  const formatDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not specified';
  const formatTime = value => value ? new Date(`2000-01-01T${value}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Not specified';
  return <section className="space-y-4 rounded-2xl bg-holiday-night p-5 text-holiday-snow">
    <div className="flex items-center gap-3"><TreePine className="h-10 w-10 shrink-0 text-holiday-gold" /><div><p className="text-xs font-semibold uppercase tracking-widest text-holiday-gold">Holiday Lights</p><h1 className={compact ? 'text-base font-bold' : 'text-2xl font-bold sm:text-3xl'}>{spot.display_title || spot.title}</h1></div></div>
    <Badge className="border-holiday-gold/40 bg-holiday-gold/15 text-holiday-gold">{holidayLightState(spot, now)}</Badge>
    {!compact && <FounderBadge userId={spot.owner_user_id} />}
    <p className="flex items-start gap-2 text-sm"><MapPin className="h-4 w-4 shrink-0" />{spot.address || [spot.street_address, spot.city, spot.state, spot.zip_code].filter(Boolean).join(', ')}</p>
    <p className="flex items-start gap-2 text-sm"><CalendarDays className="h-4 w-4 shrink-0" />{formatDate(holidayDate(spot, 'start_date_time'))} – {formatDate(holidayDate(spot, 'end_date_time'))}</p>
    <p className="flex items-start gap-2 text-sm"><Clock className="h-4 w-4 shrink-0" /><span>{formatTime(spot.viewing_start_time)} – {formatTime(spot.viewing_end_time)} nightly<span className="block text-xs opacity-70">{holidayTimeZone(spot).replaceAll('_', ' ')}</span></span></p>
    {!compact && spot.description && <p className="whitespace-pre-wrap text-sm leading-relaxed">{spot.description}</p>}
    {!compact && spot.photos?.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{spot.photos.map((url, i) => <img key={url} src={url} alt={`${spot.title} display ${i + 1}`} className="w-full rounded-xl object-contain" />)}</div>}
  </section>;
}