import React, {useEffect,useRef,useState} from 'react';
import {useAuth} from '@/lib/AuthContext';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import AIListingAttachment from './AIListingAttachment';
import AIListingInlineSession from './AIListingInlineSession';
import AIListingErrorBoundary from './AIListingErrorBoundary';
import {aiDraftCall,aiError,canUseAIListing} from './aiListingClient';

// Embedded Step 1 chatbot. Creating a draft NEVER navigates away from Step 1.
// Starting a conversation automatically sends the opening message once.
export default function AIListingEntry() {
  const {user}=useAuth();
  const [open,setOpen]=useState(false);
  const [id,setId]=useState('');
  const [message,setMessage]=useState('');
  const [file,setFile]=useState(null);
  const [preview,setPreview]=useState('');
  const [drafts,setDrafts]=useState([]);
  const [busy,setBusy]=useState(false);
  const [draftsBusy,setDraftsBusy]=useState(false);
  const [error,setError]=useState('');
  const [showDrafts,setShowDrafts]=useState(false);
  const inFlight=useRef(false);
  const requestId=useRef(crypto.randomUUID());
  const allowed=canUseAIListing(user);

  useEffect(()=>{
    if(!file){setPreview('');return;}
    const url=URL.createObjectURL(file);
    setPreview(url);
    return ()=>URL.revokeObjectURL(url);
  },[file]);

  const loadDrafts=async()=>{
    setDraftsBusy(true);setError('');
    try{
      const response=await aiDraftCall({action:'list'});
      setDrafts(response.items||[]);
    }catch(e){setError(aiError(e));}finally{setDraftsBusy(false);}
  };

  const chooseFile=next=>{
    if(!next || !['image/jpeg','image/png','image/webp','application/pdf'].includes(next.type) || !next.size || next.size>10*1024*1024){
      setError('Choose a JPG, PNG, WebP, or PDF flyer up to 10 MB.');return;
    }
    setError('');
    setFile(next);
  };

  const start=async()=>{
    if(inFlight.current || (!message.trim()&&!file))return;
    inFlight.current=true;setBusy(true);setError('');
    try{
      const response=await aiDraftCall({action:'create',message,request_id:requestId.current,...(file?{file}:{})});
      if(!response?.draft?.id)throw new Error('Could not save your opening message.');
      setId(response.draft.id);
      setMessage('');setFile(null);
      setShowDrafts(false);
      requestId.current=crypto.randomUUID();
    }catch(e){setError(aiError(e));}
    finally{inFlight.current=false;setBusy(false);}
  };

  if(!allowed)return null;
  return <div className="space-y-3">
    {!open&&<section aria-label="Ask Yardit AI posting" className="rounded-2xl border-2 border-[#2d6057] bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#123f30] text-lg text-amber-300">✦</div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold">Post with Ask Yardit AI</h2>
          <p className="text-sm text-muted-foreground">Tell Yardit what you're posting or upload a flyer. Chat here while Yardit gathers the details.</p>
          <Button type="button" className="mt-3" onClick={()=>{setOpen(true);setShowDrafts(false);}}>Open AI chat</Button>
          <Button type="button" variant="ghost" className="ml-2 mt-3" onClick={()=>{setOpen(true);setShowDrafts(true);loadDrafts();}}>Saved chats</Button>
        </div>
      </div>
    </section>}
    {open&&(id?
      <AIListingErrorBoundary key={id}>
        <AIListingInlineSession id={id} onNew={()=>{setId('');setMessage('');setFile(null);requestId.current=crypto.randomUUID();}}
          onClose={()=>{setId('');setOpen(false);}}/>
      </AIListingErrorBoundary>
      :<section aria-label="Ask Yardit AI chat" className="space-y-3 rounded-2xl border-2 border-[#2d6057] bg-card p-3 shadow-sm sm:p-5">
        <header className="flex items-center justify-between gap-2 border-b pb-3">
          <div><h2 className="font-bold">✦ Ask Yardit AI</h2>
            <p className="text-xs text-muted-foreground">Start here. Yardit will answer directly in this chat—no separate page.</p></div>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={()=>setOpen(false)}>Close</Button>
        </header>
        {showDrafts?<div className="space-y-2">
          <div className="flex items-center justify-between">
            <strong className="text-sm">Saved conversations</strong>
            <Button type="button" variant="ghost" size="sm" onClick={()=>setShowDrafts(false)}>New conversation</Button>
          </div>
          {draftsBusy&&<p role="status" className="text-sm">Loading saved chats…</p>}
          {!draftsBusy&&!drafts.length&&<p className="text-sm text-muted-foreground">No saved AI conversations yet.</p>}
          {drafts.map(draft=><button type="button" key={draft.id} className="block w-full rounded-xl border p-3 text-left hover:bg-muted"
            onClick={()=>{setId(draft.id);setShowDrafts(false);}}>
            <strong className="block text-sm">{draft.title||'Untitled listing'}</strong>
            <span className="text-xs text-muted-foreground">{draft.submission_result?.status||'Saved conversation'}</span>
          </button>)}
        </div>:<>
          <div className="rounded-2xl rounded-bl-sm bg-muted p-3 text-sm">
            <strong className="mb-1 block text-xs">✦ Ask Yardit</strong>
            Hi! What would you like to post? You can describe it in your own words or attach a flyer. I'll ask for any missing details.
          </div>
          <label className="block text-sm font-medium">Message Ask Yardit
            <Textarea rows={3} maxLength={3000} disabled={busy} value={message} onChange={e=>setMessage(e.target.value)}
              placeholder="For example: Create a Christmas light show at the Porterville courthouse…"/>
          </label>
          <AIListingAttachment flyer={file} preview={preview} busy={busy} onUpload={chooseFile} onRemove={()=>setFile(null)}/>
          <Button type="button" disabled={busy||(!message.trim()&&!file)} onClick={start}>{busy?'Starting your conversation…':'Send message'}</Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={()=>{setShowDrafts(true);loadDrafts();}}>Open saved chats</Button>
        </>}
        {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
      </section>)}
  </div>;
}
