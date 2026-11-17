import React, {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import useAIListingDraft from './useAIListingDraft';
import AIListingConversation from './AIListingConversation';
import AIListingLocation from './AIListingLocation';
import AIListingSummary from './AIListingSummary';
import {CheckCircle2, MapPin, ChevronDown} from 'lucide-react';
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
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md" aria-label="Ask Yardit AI conversation">
    <header className="flex items-center justify-between gap-2 bg-[#153f37] px-3 py-3 text-white sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-300/60 bg-[#235449] text-xl text-amber-300">✦</div>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold sm:text-base">Ask Yardit</h2>
          <p className="text-[11px] text-white/80">{busy?'Thinking…':'Your listing assistant · Auto-saved'}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" size="sm" variant="ghost" className="text-xs text-white hover:bg-white/15 hover:text-white" disabled={busy} onClick={onNew}>New</Button>
        <Button type="button" size="sm" variant="ghost" className="text-xs text-white hover:bg-white/15 hover:text-white" disabled={busy} onClick={onClose}>Close</Button>
      </div>
    </header>
    {initialFailure&&!turns.length&&<div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      Your opening message was saved, but Yardit couldn't reply.
      <Button type="button" variant="outline" size="sm" className="ml-2" disabled={busy}
        onClick={async()=>{setInitialFailure(false);if(!await send(''))setInitialFailure(true);}}>Retry</Button>
    </div>}
    <AIListingConversation model={model} inline />
    <div className="space-y-2 border-t border-slate-200 bg-white px-3 pb-3 pt-3 sm:px-4">
      {!submitted&&<div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={()=>setPanel(value=>value==='location'?'':'location')}
          className="flex min-h-10 items-center gap-1.5 rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {draft.location_confirmed?<CheckCircle2 className="h-4 w-4 text-teal-700"/>:<MapPin className="h-4 w-4"/>}
          {draft.location_confirmed?'Location confirmed':addressReady?'Confirm location':'Confirm map location'}
          <ChevronDown className="h-3.5 w-3.5"/>
        </button>
        {canReview&&<Button type="button" size="sm" disabled={busy} onClick={()=>setPanel(value=>value==='review'?'':'review')}>Review listing</Button>}
      </div>}
      {submitted&&<Button type="button" size="sm" onClick={()=>setPanel(value=>value==='review'?'':'review')}>View listing status</Button>}
      {panel==='location'&&!submitted&&<AIListingLocation draft={draft} busy={busy} onAction={model.action}/>}
      {panel==='review'&&canReview&&<AIListingReview key={draft.revision} draft={draft} busy={busy} onAction={model.action}
        onComplete={model.complete} onCheckSubmission={model.checkSubmission} onBack={()=>setPanel('')}/>}
      {special&&!submitted&&<p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
        This type needs Yardit's specialized posting process. Chat can collect details but cannot publish it yet.
      </p>}
      <details className="rounded-lg border border-slate-200 p-2">
        <summary className="cursor-pointer text-xs font-medium text-slate-600">Listing details collected</summary>
        <div className="pt-2"><AIListingSummary draft={draft}/></div>
      </details>
    </div>
  </section>;
}
