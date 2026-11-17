import React, {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {CheckCircle2, Loader2, RotateCcw} from 'lucide-react';
import AIListingChatComposer from './AIListingChatComposer';

function suggestedAnswers(facts) {
  if(!facts?.listingType) return [
    ['Christmas display','listingType','holiday_lights'],
    ['Community event','listingType','event'],
    ['Yard sale','listingType','yard_sale'],
    ['Neighborhood sale','listingType','neighborhood_sale'],
  ];
  if(!facts.postingFor) return [['Posting for myself','postingFor','self'],['Posting for someone else','postingFor','someone_else']];
  if(facts.listingType==='event'&&!facts.admission) return [['Free admission','admission','Free'],['Paid admission','admission','Paid — price to be confirmed']];
  if(facts.listingType==='yard_sale'&&!facts.tierPreference) return [
    ['Free','tierPreference','free'],['Featured','tierPreference','featured'],
    ['Premium','tierPreference','premium'],['Pre-Spree','tierPreference','pre_spree']
  ];
  if(facts.listingType==='holiday_lights'&&!facts.christmasType) return [
    ['Christmas lights','christmasType','christmas_lights'],
    ['Light show','christmasType','light_show'],
    ['Decorations','christmasType','christmas_decorations'],
    ['Christmas experience','christmasType','christmas_experience']
  ];
  return [];
}

export default function AIListingConversation({model,inline=false}) {
  const {draft,turns,busy,hasMore,older,send,answer,action,attachAndRead,error}=model;
  const submitted=!!draft.submission_result?.status;
  const [message,setMessage]=useState('');
  const transcriptRef=useRef(null);
  const lastTurn=turns[turns.length-1];
  const quickReplies=suggestedAnswers(draft.facts||{});
  const recentError=!!error;
  useEffect(()=>{
    const el=transcriptRef.current;
    if(el) el.scrollTop=el.scrollHeight;
  },[turns.length,lastTurn?.reply,busy]);

  const submit=async()=>{
    if(busy||submitted||!message.trim())return;
    const text=message;
    const result=await send(text);
    if(result)setMessage('');
  };
  const attach=async file=>{
    if(busy||submitted)return;
    const result=await attachAndRead(file);
    if(!result){
      // The hook displays the actual backend failure; keep the draft open.
    }
  };
  const choose=async(field,value)=>{
    if(busy||submitted)return;
    await answer(field,value);
  };
  const showInitial=turns.length===0;
  return <div className="flex min-h-0 flex-col bg-white">
    <div ref={transcriptRef} role="log" aria-live="polite" aria-relevant="additions text"
      className="min-h-[260px] max-h-[52vh] flex-1 space-y-5 overflow-y-auto overscroll-contain bg-[#f8faf9] px-3 py-5 sm:min-h-[340px] sm:max-h-[58vh] sm:px-5">
      {hasMore&&<div className="text-center"><Button type="button" variant="ghost" size="sm" disabled={busy} onClick={older}>Earlier messages</Button></div>}
      {showInitial&&<div className="space-y-4">
        <div className="flex justify-end">
          <p className="max-w-[86%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-[#11645a] px-4 py-3 text-sm leading-relaxed text-white">{draft.initial_message}</p>
        </div>
        <div className="flex items-start gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#163f37] font-bold text-amber-300" aria-hidden="true">✦</span>
          <p className="max-w-[84%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm">{busy?'Reading your message and preparing a reply…':'Your opening message is saved. I’ll reply here.'}</p>
        </div>
      </div>}
      {turns.map(turn=><div key={turn.id} className="space-y-4">
        <div className="flex justify-end">
          <p className="max-w-[86%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-[#11645a] px-4 py-3 text-sm leading-relaxed text-white">{turn.message}</p>
        </div>
        <div className="flex items-start gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#163f37] font-bold text-amber-300" aria-hidden="true">✦</span>
          {turn.reply?<p className="max-w-[84%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm">{turn.reply}</p>:
            <div className="max-w-[84%] rounded-2xl rounded-tl-sm bg-white p-3 text-sm text-slate-700 shadow-sm">
              <p>That reply wasn't completed.</p>
              <Button type="button" variant="ghost" size="sm" className="mt-1" disabled={busy||submitted} onClick={()=>send('',turn)}><RotateCcw className="mr-1 h-3.5 w-3.5"/>Retry reply</Button>
            </div>}
        </div>
      </div>)}
      {busy&&turns.length>0&&<div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#163f37] text-amber-300" aria-hidden="true">✦</span>
        <Loader2 className="h-4 w-4 animate-spin"/><span>Ask Yardit is responding…</span>
      </div>}
      {submitted&&<div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-[#11645a]">
        <CheckCircle2 className="h-4 w-4 shrink-0"/><span>This conversation has been submitted. View its status below.</span>
      </div>}
    </div>
    {!submitted&&!!quickReplies.length&&<div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white px-3 py-3">
      {quickReplies.map(([label,field,value])=><button type="button" key={field+value}
        className="rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-[#0e6156] hover:bg-teal-100 disabled:opacity-50"
        disabled={busy} onClick={()=>choose(field,value)}>{label}</button>)}
    </div>}
    {!!draft.warnings?.length&&!submitted&&<details className="border-t border-slate-100 bg-white px-4 py-2 text-xs text-amber-900">
      <summary className="cursor-pointer font-medium">{draft.warnings.length} detail{draft.warnings.length===1?' needs':'s need'} clarification</summary>
      <ul className="mt-2 list-disc space-y-1 pl-4">{draft.warnings.map((item,i)=><li key={i}>{item}</li>)}</ul>
    </details>}
    {recentError&&<p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-800">{error}</p>}
    <AIListingChatComposer value={message} onChange={setMessage} onSend={submit}
      disabled={submitted} busy={busy} file={draft.flyer?.file_uri?draft.flyer:null}
      preview={draft.flyerPreview} onFileSelected={attach}
      onRemoveFile={()=>action({action:'remove_flyer'})}
      placeholder={submitted?'This chat is complete':'Ask Yardit anything about this listing…'}/>
  </div>;
}
