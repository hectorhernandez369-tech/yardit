import React, {useState} from 'react';
import {Button} from '@/components/ui/button';
import useAIListingDraft from '@/components/create/ai/useAIListingDraft';
import AIListingConversation from '@/components/create/ai/AIListingConversation';
import AIListingLocation from '@/components/create/ai/AIListingLocation';
import AIListingSummary from '@/components/create/ai/AIListingSummary';
import AIListingReview from '@/components/create/ai/AIListingReview';
export default function AIListingFlow({id}) {
  const model=useAIListingDraft(id,true),[stage,setStage]=useState('chat');
  const {draft,busy,loading,error,action,reload}=model;
  if(loading)return <p role="status">Loading your saved AI draft…</p>;
  if(!draft)return <div role="alert"><p>{error||'Draft not found.'}</p><Button variant="outline" onClick={reload}>Reload draft</Button></div>;
  const missing=['listingType','title','description','startDate','endDate','startTime','endTime','postingFor'].filter(key=>!draft.facts?.[key]);
  const reviewReady=draft.location_confirmed&&!missing.length&&!draft.warnings?.length;
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">{busy?'Saving / preparing reply…':'Saved AI draft'} · No listing has been created.</p>
    {error&&<div role="alert" className="rounded-lg border p-3 text-sm"><p className="text-destructive">{error}</p><Button type="button" variant="outline" size="sm" disabled={busy} onClick={reload}>Reload saved draft</Button></div>}
    <nav aria-label="AI draft steps" className="flex flex-wrap gap-2"><Button type="button" variant={stage==='chat'?'default':'outline'} disabled={busy} onClick={()=>setStage('chat')}>1. Conversation</Button><Button type="button" variant={stage==='location'?'default':'outline'} disabled={busy} onClick={()=>setStage('location')}>2. Confirm location</Button><Button type="button" variant={stage==='review'?'default':'outline'} disabled={busy||!reviewReady} onClick={()=>setStage('review')}>3. Review draft</Button></nav>
    {stage==='review'?<AIListingReview key={draft.revision} draft={draft} busy={busy} onAction={action} onBack={()=>setStage('chat')}/>:<div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"><div className="min-w-0">{stage==='chat'?<AIListingConversation model={model}/>:<AIListingLocation draft={draft} busy={busy} onAction={action}/>}</div><AIListingSummary draft={draft}/></div>}
    {!reviewReady&&<p className="text-xs text-muted-foreground">Review unlocks after the required draft details are collected, conflicting details are resolved, and the address and map pin are explicitly confirmed.</p>}
  </div>;
}