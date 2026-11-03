import React from 'react';
import { MapPin, CalendarDays, Clock3, Star } from 'lucide-react';
import FounderBadge from '@/components/founder/FounderBadge';
import { holidayDate, holidayLightState } from '@/lib/holidayLights';
import { ChristmasIcon, ChristmasTags, getChristmasType } from './ChristmasDesign';

export const christmasDate=value=>value?new Date(value+'T12:00:00').toLocaleDateString([], {month:'short',day:'numeric',year:'numeric'}):'TBD';
export const christmasTime=value=>value?new Date('2000-01-01T'+value).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):'TBD';

export default function HolidayLightsSummary({spot,now=new Date(),compact=false}) {
 const title=spot.display_title||spot.title||'Christmas Display';
 const type=getChristmasType(spot.christmas_spot_type);
 const state=holidayLightState(spot,now);
 const start=holidayDate(spot,'start_date_time'), end=holidayDate(spot,'end_date_time');
 const address=spot.address||[spot.street_address,spot.city,spot.state,spot.zip_code].filter(Boolean).join(', ');
 return <section className={'overflow-hidden rounded-2xl border border-holiday-gold/60 bg-gradient-to-br from-christmas-red to-christmas-green text-holiday-snow shadow-xl '+(compact?'p-2.5':'p-5 sm:p-7')}>
   <div className="relative flex items-center gap-3">
    <ChristmasIcon type={type.value} size={compact?50:105}/>
    <div className="min-w-0 flex-1">
      <span className="rounded-full border border-amber-300/40 bg-red-700/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-200">Christmas Display</span>
      <h1 className={'mt-1 font-black leading-tight '+(compact?'text-base':'text-3xl sm:text-4xl')}>{title}</h1>
      <p className="mt-1 text-xs font-bold text-amber-200">{type.label}</p>
    </div>
   </div>
   {spot.christmas_featured_badge==='must_see' && <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-xs font-bold text-emerald-950"><Star className="h-3 w-3"/>Yardit Must See</div>}
   <div className="mt-3 inline-flex rounded-full border border-amber-300/30 bg-emerald-800/60 px-3 py-1 text-xs font-bold text-amber-100">{state}</div>
   {!compact && <FounderBadge userId={spot.owner_user_id}/>}
   {spot.description && <p className={'mt-3 text-sm leading-relaxed text-holiday-snow '+(compact?'line-clamp-2':'whitespace-pre-wrap')}>{spot.description}</p>}
   {!compact && spot.photos?.length>0 && <div className="mt-4 grid gap-2 sm:grid-cols-3">{spot.photos.slice(0,3).map((url,i)=><img key={url} src={url} alt={title+' photo '+(i+1)} className="h-48 w-full rounded-xl border border-white/20 object-cover"/>)}</div>}
   <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-holiday-snow">
     <p className="flex items-start gap-2"><MapPin className="h-4 w-4 shrink-0 text-amber-200"/><span className="break-words">{address}</span></p>
     <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0 text-amber-200"/>{christmasDate(start)} – {christmasDate(end)}</p>
     <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 shrink-0 text-amber-200"/>{christmasTime(spot.viewing_start_time)} – {christmasTime(spot.viewing_end_time)} nightly</p>
   </div>
   {spot.christmas_tags?.length>0 && <div className="mt-3"><ChristmasTags compact={compact} tags={spot.christmas_tags}/></div>}
   {!compact && (spot.christmas_suggested_age||spot.christmas_host_name||spot.christmas_admission||spot.christmas_parking_notes||spot.christmas_activities) && <div className="mt-4 space-y-2 rounded-xl border border-amber-200/20 bg-white/5 p-4 text-sm">
      <h2 className="font-black uppercase tracking-wide text-amber-200">What to Expect</h2>
      {spot.christmas_suggested_age && <p><strong>Suggested age:</strong> {spot.christmas_suggested_age}</p>}
      {spot.christmas_host_name && <p><strong>Host:</strong> {spot.christmas_host_name}</p>}
      {spot.christmas_admission && <p><strong>Admission:</strong> {spot.christmas_admission}</p>}
      {spot.christmas_parking_notes && <p><strong>Parking:</strong> {spot.christmas_parking_notes}</p>}
      {spot.christmas_activities && <p><strong>Activities:</strong> {spot.christmas_activities}</p>}
   </div>}
 </section>;
}