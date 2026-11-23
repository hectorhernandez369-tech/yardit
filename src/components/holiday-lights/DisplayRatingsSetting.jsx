import React, {useId} from 'react';
import {Switch} from '@/components/ui/switch';

export default function DisplayRatingsSetting({enabled=false,onChange,disabled=false}) {
 const id=useId();
 return <section aria-labelledby={id+'-title'} className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-4 text-emerald-950">
   <div className="flex items-center justify-between gap-4">
     <div>
       <p className="text-xs font-bold uppercase tracking-wide">Your display, your choice</p>
       <label id={id+'-title'} htmlFor={id} className="mt-1 block text-base font-bold">Let visitors rate my display</label>
     </div>
     <Switch id={id} checked={enabled===true} onCheckedChange={onChange} disabled={disabled} aria-describedby={id+'-help'}/>
   </div>
   <p className="mt-2 text-sm font-bold" role="status">Ratings {enabled?'ON':'OFF'}</p>
   <p id={id+'-help'} className="mt-1 text-sm">{enabled?'Visitors can rate your display, and it can appear on Christmas leaderboards.':'Your display stays on the map. Stars, scores, and leaderboard placement are hidden.'}</p>
   <p className="mt-2 text-xs">Change this anytime in Edit My Display. Turning ratings off keeps previous ratings saved; turning them back on restores them.</p>
 </section>;
}
