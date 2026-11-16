import React from 'react';
import React, {useState} from 'react';
import { AI_TYPE_LABELS } from '@/components/create/ai/aiListingClient';
const labels={title:'Title',description:'Description',category:'Category',startDate:'First date',endDate:'Last date',startTime:'Opening time',endTime:'Closing time',address:'Suggested street',city:'City',state:'State',zip:'ZIP',postingFor:'Posting for',homeownerName:'Homeowner',homeownerEmail:'Homeowner email',tierPreference:'Requested tier / promotion',admission:'Admission',christmasType:'Christmas display type'};
export default function AIListingSummary({draft,expandedInitially=false}) {
  const [expanded,setExpanded]=useState(expandedInitially);
  const facts=draft.facts||{};
  return <aside className="space-y-3 rounded-xl border bg-card p-4 text-card-foreground">
    <button type="button" aria-expanded={expanded} className="flex w-full items-center justify-between gap-2 text-left font-semibold" onClick={()=>setExpanded(value=>!value)}>Collected listing details <span className="text-xs font-normal">{expanded?'Hide details −':'Show details +'}</span></button>
    <p className="text-sm font-medium">{facts.title||'Untitled listing'} · {AI_TYPE_LABELS[facts.listingType]||'Type not selected'}</p>
    <p className="text-xs text-muted-foreground">{draft.location_confirmed?('Location confirmed: '+draft.location?.formatted):'Location confirmation still needed'}</p>
    {expanded&&<>
    <p className="text-xs text-muted-foreground">{draft.details_confirmed?'Reviewed draft facts, not a published listing.':'Proposed details. Review and correct these before confirming.'}</p>
    <dl className="space-y-2 break-words text-sm"><div><dt className="font-semibold">Listing type</dt><dd>{AI_TYPE_LABELS[facts.listingType]||'Not confirmed'}</dd></div>
      {Object.entries(labels).filter(([key]) => facts[key] && (key!=='christmasType' || facts.listingType==='holiday_lights') && (key!=='admission'||facts.listingType==='event')).map(([key,label])=><div key={key}><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap">{facts[key]||'Not provided'}</dd></div>)}
      <div><dt className="font-semibold">Map location</dt><dd>{draft.location_confirmed?`Confirmed: ${draft.location.formatted}`:'Not confirmed on the map'}</dd></div>
      {draft.location?.timeZoneId&&<div><dt className="font-semibold">Location time zone</dt><dd>{draft.location.timeZoneId}</dd></div>}
      <div><dt className="font-semibold">Payment / approval</dt><dd>Not evaluated. No payment waiver or homeowner approval has been granted.</dd></div>
    </dl></>}
  </aside>;
}