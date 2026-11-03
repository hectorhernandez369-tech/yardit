import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { holidayLightState } from '@/lib/holidayLights';
import { ChristmasIcon, getChristmasType } from './ChristmasDesign';

export default function MyHolidayLights({user}) {
 const client=useQueryClient();
 const query=useQuery({
  queryKey:['holidayLights','owned',user?.id],
  enabled:!!user?.id,
  queryFn:async()=>{
    const data=await base44.entities.Location.filter({type:'holiday_lights',owner_user_id:user.id},'-created_date',200);
    return Array.isArray(data)?data:(data?.items||[]);
  },
 });
 const mutation=useMutation({
  mutationFn:async ({spot,remove,value})=>{const result=await base44.functions.invoke('manageChristmasListing',remove?{action:'remove',id:spot.id}:{action:'toggle',id:spot.id,display_active:value}); if(result?.data?.error)throw new Error(result.data.error); return result;},
  onSuccess:()=>client.invalidateQueries({queryKey:['holidayLights']}),
 });
 return <section className="mb-6 space-y-4 rounded-2xl border border-amber-400/40 bg-card p-5 text-card-foreground">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <h2 className="text-lg font-bold">My Christmas Displays</h2>
    <Button asChild variant="outline" size="sm"><Link to="/CreateHolidayLights">Post a Display</Link></Button>
  </div>
  {query.isPending&&<p className="text-sm text-muted-foreground">Loading Christmas displays…</p>}
  {query.isError&&<p role="alert" className="text-sm text-destructive">Could not load displays. <button onClick={()=>query.refetch()} className="underline">Retry</button></p>}
  {query.data?.length===0&&<p className="text-sm text-muted-foreground">Your Christmas displays will appear here, separately from Halloween.</p>}
  {query.data?.map(spot=><div key={spot.id} className="relative flex flex-wrap gap-3 rounded-xl border-2 border-holiday-gold bg-gradient-to-br from-christmas-red to-christmas-green p-4 text-holiday-snow shadow-md">
    <Link to={'/HolidayLightsDetail?id='+spot.id} aria-label={'View details for '+(spot.display_title||spot.title)} className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-holiday-gold focus-visible:ring-offset-2" />
    <div className="pointer-events-none relative"><ChristmasIcon type={spot.christmas_spot_type} size={58}/></div>
    <div className="pointer-events-none relative min-w-0 flex-1">
     <h3 className="font-black text-holiday-gold">{spot.display_title||spot.title}</h3>
     <p className="mt-1 text-xs text-holiday-snow">{getChristmasType(spot.christmas_spot_type).label} • {holidayLightState(spot)}</p>
     <p className="mt-1 text-xs text-holiday-snow/85">{spot.address}</p>
    </div>
    <div className="pointer-events-none relative flex w-full flex-wrap items-center gap-2">
      <label className="pointer-events-auto flex items-center gap-2 text-xs"><Switch aria-label={'Display running: '+spot.title} checked={!!spot.display_active} disabled={mutation.isPending} onCheckedChange={value=>mutation.mutate({spot,value})}/>Display running</label>
      <Button asChild size="sm" variant="outline" className="pointer-events-auto border-holiday-gold bg-holiday-snow text-christmas-green hover:bg-holiday-gold hover:text-christmas-green"><Link to={'/CreateHolidayLights?id='+spot.id}>Edit</Link></Button>
      <Button size="sm" variant="ghost" className="pointer-events-auto text-holiday-snow hover:bg-christmas-red hover:text-holiday-snow" disabled={mutation.isPending} onClick={()=>{if(window.confirm('Remove this Christmas display?'))mutation.mutate({spot,remove:true});}}>Remove</Button>
    </div>
  </div>)}
  {mutation.isError&&<p role="alert" className="text-sm text-destructive">Could not update this display. Try again.</p>}
 </section>;
}