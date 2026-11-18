import React, {useEffect,useRef,useState} from 'react';
import {useAuth} from '@/lib/AuthContext';
import AIListingInlineSession from './AIListingInlineSession';
import AIListingErrorBoundary from './AIListingErrorBoundary';
import AIListingChatComposer from './AIListingChatComposer';
import {aiDraftCall,aiError,canUseAIListing} from './aiListingClient';
import {MessageCircle, Plus, X} from 'lucide-react';

function rememberCurrentDraft(id) {
  const url=new URL(window.location.href);
  if(id)url.searchParams.set('aiDraft',id);
  else url.searchParams.delete('aiDraft');
  window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
}

// Show a normal, conversational IDEA rather than a form-like list of fields.
// The example is editable and is never sent or published until the user taps Send.
const EXAMPLE_IDEA = "I want to post a Christmas light show in Porterville. I have a flyer—can you help me create the listing and ask me what's missing?";

// One continuous chatbot on Step One. The first message is processed
// automatically without switching pages or asking to start again.
export default function AIListingEntry({onActiveChange}) {
  const {user}=useAuth();
  const initialId=new URLSearchParams(window.location.search).get('aiDraft')||'';
  const [active,setActive]=useState(Boolean(initialId));
  const [id,setId]=useState(initialId);
  const [message,setMessage]=useState('');
  const [file,setFile]=useState(null);
  const [preview,setPreview]=useState('');
  const [drafts,setDrafts]=useState([]);
  const [busy,setBusy]=useState(false);
  const [draftsBusy,setDraftsBusy]=useState(false);
  const [error,setError]=useState('');
  const [showHistory,setShowHistory]=useState(false);
  const inFlight=useRef(false);
  const requestId=useRef(crypto.randomUUID());
  const allowed=canUseAIListing(user);
  const initialOpenNotified=useRef(false);

  useEffect(()=>{
    if(allowed && initialId && !initialOpenNotified.current) {
      initialOpenNotified.current=true;
      onActiveChange?.(true);
    }
  },[allowed,initialId]);

  useEffect(()=>{
    if(!file){setPreview('');return;}
    const url=URL.createObjectURL(file);
    setPreview(url);
    return ()=>URL.revokeObjectURL(url);
  },[file]);

  const activate=()=>{
    if(!active){setActive(true);onActiveChange?.(true);}
  };
  const close=()=>{
    setId('');rememberCurrentDraft('');
    setActive(false);setShowHistory(false);
    onActiveChange?.(false);
  };
  const newChat=()=>{
    setId('');rememberCurrentDraft('');setMessage('');setFile(null);
    setError('');setShowHistory(false);
    requestId.current=crypto.randomUUID();
    activate();
  };
  const loadDrafts=async()=>{
    setDraftsBusy(true);setError('');
    try{
      const response=await aiDraftCall({action:'list'});
      setDrafts(response.items||[]);
    }catch(e){setError(aiError(e));}
    finally{setDraftsBusy(false);}
  };
  const toggleHistory=()=>{
    activate();
    if(!showHistory)loadDrafts();
    setShowHistory(value=>!value);
  };
  const start=async()=>{
    if(inFlight.current||(!message.trim()&&!file))return;
    inFlight.current=true;setBusy(true);setError('');
    try{
      const response=await aiDraftCall({
        action:'create',message,request_id:requestId.current,...(file?{file}:{})
      });
      if(!response?.draft?.id)throw new Error('Could not start the conversation. Please try again.');
      activate();
      setId(response.draft.id);
      rememberCurrentDraft(response.draft.id);
      setMessage('');setFile(null);setShowHistory(false);
      requestId.current=crypto.randomUUID();
    }catch(e){setError(aiError(e));}
    finally{inFlight.current=false;setBusy(false);}
  };

  if(!allowed)return null;
  if(id) return <AIListingErrorBoundary key={id}>
    <AIListingInlineSession id={id} onNew={newChat} onClose={close}/>
  </AIListingErrorBoundary>;

  return <section aria-label="Ask Yardit chatbot" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
    <header className="flex items-center justify-between bg-[#153f37] px-3 py-3 text-white sm:px-4">
      <div className="flex items-center gap-2.5">
        <div aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/60 bg-[#235449] text-xl text-amber-300">✦</div>
        <div>
          <h2 className="text-sm font-bold sm:text-base">Ask Yardit</h2>
          <p className="text-[11px] text-white/80">Your AI listing assistant</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={toggleHistory} disabled={busy}
          title="Saved conversations" aria-label="Saved conversations"
          className="flex h-9 items-center gap-1 rounded-full px-2 text-xs hover:bg-white/15 disabled:opacity-50">
          <MessageCircle className="h-4 w-4"/><span className="hidden sm:inline">Chats</span>
        </button>
        {active&&<button type="button" onClick={close} disabled={busy} title="Close chatbot"
          aria-label="Close chatbot" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 disabled:opacity-50">
          <X className="h-4 w-4"/>
        </button>}
      </div>
    </header>
    {showHistory?<div className="min-h-64 space-y-2 bg-[#f8faf9] p-4">
      <div className="mb-3 flex items-center justify-between">
        <strong className="text-sm">Previous conversations</strong>
        <button type="button" onClick={()=>setShowHistory(false)} className="flex items-center gap-1 text-xs font-semibold text-[#11645a]"><Plus className="h-4 w-4"/>New conversation</button>
      </div>
      {draftsBusy&&<p role="status" className="text-sm text-slate-600">Loading conversations…</p>}
      {!draftsBusy&&!drafts.length&&<p className="text-sm text-slate-600">No saved conversations yet.</p>}
      {drafts.map(draft=><button key={draft.id} type="button"
        className="block w-full rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-teal-400 hover:bg-teal-50"
        onClick={()=>{activate();setId(draft.id);rememberCurrentDraft(draft.id);setShowHistory(false);}}>
        <strong className="block truncate text-sm">{draft.title||'Untitled listing'}</strong>
        <span className="text-xs text-slate-500">{draft.submission_result?.status||'Draft conversation'}</span>
      </button>)}
    </div>:<div className="min-h-[220px] bg-[#f8faf9] px-3 py-5 sm:min-h-[260px] sm:px-5">
      <div className="flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#153f37] font-bold text-amber-300" aria-hidden="true">✦</div>
        <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm">
          <p className="font-semibold">Hi! I'm Ask Yardit.</p>
          <p className="mt-1">Tell me what you'd like to post, or attach a flyer. I'll help with the details and ask a few questions along the way.</p>
        </div>
      </div>
      <div className="mt-4 pl-9">
        <p className="mb-1.5 text-xs font-semibold text-slate-600">Example of what you can type:</p>
        <button type="button" disabled={busy} onClick={()=>{setMessage(EXAMPLE_IDEA);activate();}}
          className="w-full rounded-xl border border-teal-200 bg-white p-3 text-left text-sm text-slate-700 shadow-sm hover:border-teal-400 hover:bg-teal-50 disabled:opacity-50">
          “{EXAMPLE_IDEA}”
          <span className="mt-2 block text-xs font-semibold text-[#11645a]">Tap to use this example (you can edit it)</span>
        </button>
      </div>
    </div>}
    {!showHistory&&<AIListingChatComposer value={message} onChange={value=>{setMessage(value);if(value)activate();}}
      file={file} preview={preview} onFileSelected={next=>{setFile(next);activate();}}
      onRemoveFile={()=>setFile(null)} onSend={start} busy={busy}
      placeholder="Describe your listing idea…" sendLabel="Send to Ask Yardit"/>}
    {error&&<p role="alert" className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800">{error}</p>}
  </section>;
}
