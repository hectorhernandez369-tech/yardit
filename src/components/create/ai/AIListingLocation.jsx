import React, {useState} from 'react';
import AdminAddressSearch from '@/components/admin/assisted/AdminAddressSearch';
import AddressReviewMap from '@/components/create/AddressReviewMap';
import { Button } from '@/components/ui/button';
export default function AIListingLocation({draft,busy,onAction,onConfirm}) {
  const loc=draft.location?.timeZoneId?draft.location:null;
  const selected=loc?{...loc}:null;
  const [editing,setEditing]=useState(!loc);
  return <section className="space-y-4 rounded-xl border bg-card p-4 text-card-foreground">
    <h2 className="font-semibold">Confirm location</h2>
    <p className="text-sm">Search for the full address, inspect the actual map pin, then explicitly confirm it. Chat cannot confirm this step.</p>
    <p className="break-words text-sm text-muted-foreground">Suggested: {[draft.facts?.address,draft.facts?.city,draft.facts?.state,draft.facts?.zip].filter(Boolean).join(', ')||'Not provided'}</p>
    {(!loc || editing) && <fieldset disabled={busy} className={busy?'pointer-events-none opacity-60':''}>
      <AdminAddressSearch key={loc ? [loc.street,loc.city,loc.state,loc.zip].join("|") : "new-address"} restoreSelectedFields selectedAddress={selected} onAddressSelected={location=>{onAction({action:'location',location});if(location)setEditing(false);}}/>
    </fieldset>}
    {loc && !editing && <Button type="button" variant="outline" disabled={busy} onClick={()=>setEditing(true)}>Change location</Button>}
    {loc&&<><AddressReviewMap lat={loc.lat} lng={loc.lng}/><p className="text-sm">{loc.formatted}<br/>Time zone: {loc.timeZoneId}</p>
      <Button type="button" disabled={busy||draft.location_confirmed} onClick={()=>onConfirm ? onConfirm() : onAction({action:'confirm_location',confirmed:true})}>{draft.location_confirmed?'Location confirmed':'I confirm this address and map pin'}</Button></>}
    <p className="text-xs text-muted-foreground">This confirms the intended location only. It does not verify home ownership or replace homeowner approval.</p>
  </section>;
}