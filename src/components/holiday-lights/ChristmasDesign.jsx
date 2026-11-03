import React from 'react';
import { TreePine, Gift, Music2, Sparkles, Baby, Footprints, Camera, Radio, UserRound, Snowflake } from 'lucide-react';

export const CHRISTMAS_SPOT_TYPES = [
  {value:'christmas_decorations', label:'Lights, Inflatables & Decorations', description:'For displays with both lights and inflatables, or any mix of holiday decorations, yard ornaments, and wreaths.', icon:TreePine},
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
export const CHRISTMAS_ICON_ASSETS = {
  christmas_decorations:'/assets/christmas/christmas-decorations.svg',
  christmas_lights:'/assets/christmas/christmas-lights.svg',
  light_show:'/assets/christmas/light-show.svg',
  christmas_experience:'/assets/christmas/christmas-experience.svg',
};
export function ChristmasIcon({type,size=34,className=''}) {
  return <img src={CHRISTMAS_ICON_ASSETS[type]||CHRISTMAS_ICON_ASSETS.christmas_decorations} alt="" aria-hidden="true" className={'shrink-0 object-contain '+className} style={{width:size,height:size}} />;
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