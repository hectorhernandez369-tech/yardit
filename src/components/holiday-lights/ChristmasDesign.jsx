import React from 'react';
import { TreePine, Gift, Music2, Sparkles, Baby, Footprints, Camera, Radio, UserRound, Snowflake } from 'lucide-react';

export const CHRISTMAS_SPOT_TYPES = [
  {value:'christmas_decorations', label:'Christmas Decorations', description:'Decorated homes, inflatables, yard ornaments, wreaths, and festive displays.', icon:TreePine},
  {value:'christmas_lights', label:'Christmas Lights', description:'Homes and yards featuring beautiful holiday lighting.', icon:Sparkles},
  {value:'light_show', label:'Christmas Light Show', description:'Synchronized music, animated lights, or colorful projections.', icon:Music2},
  {value:'christmas_experience', label:'Christmas Experience', description:'Santa visits, interactive displays, walk-throughs, or community holiday attractions.', icon:Gift},
];
export const CHRISTMAS_FEATURES = [
  {value:'kid_friendly',label:'Kid Friendly',icon:Baby},
  {value:'walkthrough',label:'Walk-Through',icon:Footprints},
  {value:'music',label:'Music / Sound',icon:Music2},
  {value:'synchronized_lights',label:'Synchronized Lights',icon:Radio},
  {value:'santa',label:'Santa Visit',icon:UserRound},
  {value:'photo_op',label:'Photo Opportunity',icon:Camera},
];
export function getChristmasType(value) {
 return CHRISTMAS_SPOT_TYPES.find(item=>item.value===value)||CHRISTMAS_SPOT_TYPES[0];
}
export function ChristmasIcon({type,size=34,className=''}) {
  const selected=getChristmasType(type);
  const Icon=selected.icon;
  return <div className={'relative flex shrink-0 items-center justify-center rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-red-800 via-emerald-950 to-emerald-900 text-amber-200 shadow-lg '+className} style={{width:size,height:size}}>
   <Snowflake aria-hidden="true" className="absolute right-0.5 top-0.5 h-2.5 w-2.5 text-white/70"/>
   <Icon aria-hidden="true" style={{width:size*.64,height:size*.64}} strokeWidth={2.2}/>
  </div>;
}
export function ChristmasTags({tags=[],compact=false}) {
 return <div className="flex flex-wrap gap-1.5">
  {CHRISTMAS_FEATURES.filter(f=>tags.includes(f.value)).map(f=>{
    const Icon=f.icon;
    return <span key={f.value} className={'inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-emerald-700/30 font-semibold text-amber-100 '+(compact?'px-2 py-0.5 text-[9px]':'px-3 py-1.5 text-xs')}>
      <Icon className="h-3 w-3"/>{f.label}
    </span>;
  })}
 </div>;
}
