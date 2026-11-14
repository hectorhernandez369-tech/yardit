import React from 'react';
import { AI_TYPE_LABELS } from '@/components/create/ai/aiListingClient';
const labels={title:'Title',description:'Description',category:'Category',startDate:'First date',endDate:'Last date',startTime:'Opening time',endTime:'Closing time',address:'Suggested street',city:'City',state:'State',zip:'ZIP',postingFor:'Posting for',homeownerName:'Homeowner',homeownerEmail:'Homeowner email',tierPreference:'Requested tier / promotion',admission:'Admission',christmasType:'Christmas display type'};
export default function AIListingSummary({draft}) {
  const facts=draft.facts||{};
  return <aside className="space-y-3 rounded-xl border bg-card p-4 text-card-foreground">
    <h2 className="font-semibold">Collected listing details</h2>
    <p className="text-xs text-muted-foreground">{draft.details_confirmed?'Reviewed draft facts, not a published listing.':'Proposed details. Review and correct these before confirming.'}</p>
    <dl className="space-y-2 break-words text-sm"><div><dt className="font-semibold">Listing type</dt><dd>{AI_TYPE_LABELS[facts.listingType]||'Not confirmed'}</dd></div>
      {Object.entries(labels).map(([key,label])=><div key={key}><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap">{facts[key]||'Not provided'}</dd></div>)}
      <div><dt className="font-semibold">Map location</dt><dd>{draft.location_confirmed?`Confirmed: ${draft.location.formatted}`:'Not confirmed on the map'}</dd></div>
      {draft.location?.timeZoneId&&<div><dt className="font-semibold">Location time zone</dt><dd>{draft.location.timeZoneId}</dd></div>}
      <div><dt className="font-semibold">Payment / approval</dt><dd>Not evaluated. No payment waiver or homeowner approval has been granted.</dd></div>
    </dl>
  </aside>;
}