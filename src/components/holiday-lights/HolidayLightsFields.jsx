import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EventPhotoUpload from '@/components/create/event/EventPhotoUpload';
import { CHRISTMAS_SPOT_TYPES, CHRISTMAS_FEATURES, ChristmasIcon } from './ChristmasDesign';

export default function HolidayLightsFields({form,setForm}) {
 const change=(key,value)=>setForm(prev=>({...prev,[key]:value}));
 const kind=CHRISTMAS_SPOT_TYPES.find(x=>x.value===form.christmas_spot_type)||CHRISTMAS_SPOT_TYPES[0];
 const tags=form.christmas_tags||[];
 const toggle=tag=>change('christmas_tags',tags.includes(tag)?tags.filter(x=>x!==tag):[...tags,tag]);
 return <div className="space-y-5">
  <section className="space-y-3 rounded-2xl border border-amber-300/50 bg-emerald-950 p-4 text-white">
   <Label className="font-bold text-amber-200">Christmas Display Type *</Label>
   <p className="text-xs text-emerald-100/80">Have both lights and inflatables? Choose Lights, Inflatables & Decorations. Choose Christmas Lights for a lighting-focused display.</p>
   <Select value={form.christmas_spot_type||'christmas_decorations'} onValueChange={value=>change('christmas_spot_type',value)}>
    <SelectTrigger className="bg-white text-slate-950"><SelectValue placeholder="Choose a Christmas type"/></SelectTrigger>
    <SelectContent>{CHRISTMAS_SPOT_TYPES.map(item=><SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
   </Select>
   <div className="flex items-center gap-3 rounded-xl border border-amber-300/30 bg-white/10 p-3">
     <ChristmasIcon type={kind.value} size={64}/>
     <div><p className="font-bold">{kind.label}</p><p className="text-xs text-emerald-100/80">{kind.description}</p></div>
   </div>
  </section>
  <div className="space-y-1.5"><Label htmlFor="lights-title">Display Name *</Label><Input id="lights-title" required maxLength={120} placeholder="e.g., Winter Wonderland on Maple Street" value={form.title||''} onChange={e=>change('title',e.target.value)}/></div>
  <div className="space-y-1.5"><Label htmlFor="lights-description">Description</Label><Textarea id="lights-description" rows={4} maxLength={3000} placeholder="Tell visitors about your decorations, lights, attractions, or holiday traditions." value={form.description||''} onChange={e=>change('description',e.target.value)}/></div>
  <div className="grid grid-cols-2 gap-3">
   <div className="space-y-1.5"><Label htmlFor="lights-start">First night *</Label><Input id="lights-start" type="date" required value={form.start||''} onChange={e=>change('start',e.target.value)}/></div>
   <div className="space-y-1.5"><Label htmlFor="lights-end">Last night *</Label><Input id="lights-end" type="date" required min={form.start} value={form.end||''} onChange={e=>change('end',e.target.value)}/></div>
   <div className="space-y-1.5"><Label htmlFor="lights-open">Starts at *</Label><Input id="lights-open" type="time" required value={form.viewing_start_time||''} onChange={e=>change('viewing_start_time',e.target.value)}/></div>
   <div className="space-y-1.5"><Label htmlFor="lights-close">Ends at *</Label><Input id="lights-close" type="time" required value={form.viewing_end_time||''} onChange={e=>change('viewing_end_time',e.target.value)}/></div>
  </div>
  <p className="text-xs text-muted-foreground">All dates must be November 1–January 2. Visitors can see your display ahead of opening marked Coming Soon; viewing hours determine the Lights On badge.</p>
  <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
   <h2 className="font-bold text-emerald-950">What should visitors know?</h2>
   <p className="text-xs text-slate-600">Choose any that apply. These are tags, not separate map pins.</p>
   <div className="grid grid-cols-2 gap-2">{CHRISTMAS_FEATURES.map(f=>{
      const Icon=f.icon; const active=tags.includes(f.value);
      return <button key={f.value} type="button" aria-pressed={active} onClick={()=>toggle(f.value)} className={'flex items-center gap-2 rounded-xl border p-3 text-left text-xs font-bold '+(active?'border-emerald-600 bg-emerald-100 text-emerald-950':'border-amber-200 bg-white text-slate-700')}>
       <Icon className="h-4 w-4 shrink-0"/>{f.label}
      </button>;
   })}</div>
   <div className="space-y-1.5"><Label>Suggested age (optional)</Label><Input value={form.christmas_suggested_age||''} onChange={e=>change('christmas_suggested_age',e.target.value)} placeholder="All ages, 8+, etc."/></div>
  </section>
  <section className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
    <div className="space-y-1"><Label>Host / Organization (optional)</Label><Input value={form.christmas_host_name||''} onChange={e=>change('christmas_host_name',e.target.value)} placeholder="Homeowner, church, organization"/></div>
    <div className="space-y-1"><Label>Admission (optional)</Label><Input value={form.christmas_admission||''} onChange={e=>change('christmas_admission',e.target.value)} placeholder="Free"/></div>
    <div className="space-y-1 sm:col-span-2"><Label>Parking notes (optional)</Label><Input value={form.christmas_parking_notes||''} onChange={e=>change('christmas_parking_notes',e.target.value)} placeholder="Where should people park?"/></div>
    <div className="space-y-1 sm:col-span-2"><Label>Activities (optional)</Label><Input value={form.christmas_activities||''} onChange={e=>change('christmas_activities',e.target.value)} placeholder="Photos with Santa, walking tour, music, hot cocoa..."/></div>
  </section>
  <section className="space-y-2 rounded-xl border p-4">
   <h2 className="font-bold">Photos (optional, up to 3)</h2>
   <EventPhotoUpload value={form.photos||[]} maxPhotos={3} onChange={photos=>change('photos',photos)}/>
  </section>
  <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
   <div><Label htmlFor="lights-enabled">Display is running</Label><p className="text-xs text-muted-foreground">Turn off for weather or a night off without removing your listing.</p></div>
   <Switch id="lights-enabled" checked={form.display_active===true} onCheckedChange={value=>change('display_active',value)}/>
  </div>
 </div>;
}