import React, {useState} from 'react';
import {Button} from '@/components/ui/button';
import AIListingSummary from '@/components/create/ai/AIListingSummary';
import AIListingAttachment from '@/components/create/ai/AIListingAttachment';
export default function AIListingReview({draft,busy,onAction,onBack}) {
  const [checked,setChecked]=useState(false);
  return <section className="space-y-4">
    <h2 className="text-lg font-semibold">Review AI draft</h2>
    <AIListingSummary draft={draft}/>
    {draft.flyer?.file_uri&&<div className="rounded-xl border p-4"><p className="mb-2 text-sm font-medium">Original flyer retained with this private draft</p>{draft.flyer.type==='application/pdf'?<a className="underline" href={draft.flyerPreview} target="_blank" rel="noreferrer">Open original PDF</a>:<img className="max-h-72 w-full object-contain" src={draft.flyerPreview} alt="Original flyer for review"/>}</div>}
    <div className="rounded-xl border bg-muted p-4 text-sm"><strong>Not a listing submission</strong><p>Saving this review only saves your AI draft. Tier pricing, promotions, ownership, payments and approval still need the trusted posting connection. No listing or approval QR will be created here yet.</p></div>
    {draft.details_confirmed?<p role="status" className="font-medium">Reviewed draft saved. Nothing has been published.</p>:<label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} className="mt-1"/>I reviewed the proposed details and confirmed the map location. I understand this saves a draft, not a public listing.</label>}
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={onBack} disabled={busy}>Back to conversation</Button><Button type="button" disabled={busy||!checked||draft.details_confirmed} onClick={()=>onAction({action:'review',confirmed:true})}>{busy?'Saving…':'Save reviewed draft'}</Button></div>
  </section>;
}