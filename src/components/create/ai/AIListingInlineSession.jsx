import React, {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import useAIListingDraft from './useAIListingDraft';
import AIListingConversation from './AIListingConversation';
import AIListingLocation from './AIListingLocation';
import AIListingSummary from './AIListingSummary';
import AIListingReview from './AIListingReview';

// The entire assistant lives in Step 1; there is no second "start chat" page.
// The original message is sent automatically as the first conversation turn.
export default function AIListingInlineSession({id,onNew,onClose}) {
  const model=useAIListingDraft(id,true);
  const {draft,turns,busy,loading,error,send,reload}=model;
  const [panel,setPanel]=useState('');
  const autoStarted=useRef(new Set());
  const [initialFailure,setInitialFailure]=useState(false);
  useEffect(()=>{
    if(!loading && draft && !turns.length && !busy && !autoStarted.current.has(id) &&
       !draft.submission_result?.status && draft.submission_status!=='needs_reconciliation') {
      autoStarted.current.add(id);
      setInitialFailure(false);
      send('').then(result=>{if(!result)setInitialFailure(true);});
    }
  },[id,loading,draft?.id,turns.length,busy,send]);

  useEffect(()=>{
    if(draft?.submission_result?.status) setPanel('review');
  },[draft?.submission_result?.status]);

  if(loading) return <div className="rounded-xl border bg-card p-5" role="status">Opening your saved conversation…</div>;
  if(!draft) return <div role="alert" className="space-y-3 rounded-xl border bg-card p-4">
    <p>{error||'Could not open this saved conversation.'}</p>
    <Button variant="outline" onClick={reload}>Try again</Button>
    <Button variant="ghost" onClick={onClose}>Back to Step 1</Button>
  </div>;
  const facts=draft.facts||{};
  const required=['listingType','title','description','startDate','endDate','startTime','endTime','postingFor',
    ...(facts.listingType==='event'?['category','admission']:[]),
    ...(facts.listingType==='yard_sale'?['tierPreference']:[]),
    ...(facts.listingType==='holiday_lights'?['christmasType']:[]),
    ...(facts.postingFor==='someone_else'?['homeownerEmail']:[])];
  const missing=required.filter(key=>!facts[key]);
  const canReview=!!draft.submission_result?.status || (!!draft.location_confirmed && !missing.length && !draft.warnings?.length);
  const special=['neighborhood_sale','halloween_spot'].includes(facts.listingType);
  const addressReady=!!draft.location?.timeZoneId;
  const submitted=!!draft.submission_result?.status;
  return <section className="space-y-3 rounded-2xl border-2 border-[#2d6057] bg-card p-3 shadow-md sm:p-5" aria-label="Ask Yardit AI conversation">
    <header className="flex items-center justify-between gap-2 border-b pb-3">
      <div>
        <h2 className="font-bold text-base">✦ Ask Yardit AI</h2>
        <p className="text-xs text-muted-foreground">Your conversation saves automatically, right here in Step 1.</p>
      </div>
      <div className="flex flex-wrap justify-end gap-1">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onNew}>New chat</Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onClose}>Close</Button>
      </div>
    </header>
    {initialFailure&&!turns.length&&<div role="alert" className="rounded-lg border border-amber-300 p-3 text-sm">
      Yardit saved your opening message but could not get an AI reply.
      <Button type="button" className="ml-2" size="sm" variant="outline" disabled={busy}
        onClick={async()=>{setInitialFailure(false);if(!await send(''))setInitialFailure(true);}}>Retry the first reply</Button>
    </div>}
    <AIListingConversation model={model} inline />
    <div className="flex flex-wrap gap-2">
      {!submitted&&<Button type="button" variant="outline" disabled={busy} onClick={()=>setPanel(value=>value==='location'?'':'location')}>
        {draft.location_confirmed?'✓ Change confirmed location':addressReady?'Confirm location on map':'Find & confirm location'}
      </Button>}
      {(canReview||submitted)&&<Button type="button" disabled={busy} onClick={()=>setPanel(value=>value==='review'?'':'review')}>
        {submitted?'View listing status':'Review & continue'}
      </Button>}
    </div>
    {panel==='location'&&!submitted&&<div className="rounded-xl border p-2 sm:p-3">
      <AIListingLocation draft={draft} busy={busy} onAction={model.action}/>
    </div>}
    {panel==='review'&&canReview&&<div className="rounded-xl border p-2 sm:p-3">
      <AIListingReview key={draft.revision} draft={draft} busy={busy} onAction={model.action}
        onComplete={model.complete} onCheckSubmission={model.checkSubmission} onBack={()=>setPanel('')}/>
    </div>}
    {special&&!submitted&&<p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      This category still uses Yardit's specialized posting process. The AI can help prepare information, but it cannot publish it from chat yet.
    </p>}
    <AIListingSummary draft={draft}/>
  </section>;
}
