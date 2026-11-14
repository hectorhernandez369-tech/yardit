import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import AIListingAttachment from '@/components/create/ai/AIListingAttachment';
import { aiDraftCall,aiError,canUseAIListing } from '@/components/create/ai/aiListingClient';
export default function AIListingEntry() {
  const {user}=useAuth(),navigate=useNavigate();
  const [message,setMessage]=useState(''),[file,setFile]=useState(null),[preview,setPreview]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const requestId=useRef(crypto.randomUUID()),inFlight=useRef(false);
  useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
  if(!canUseAIListing(user))return null;
  const choose=file=>{if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)||file.size>10*1024*1024||!file.size){setError('Choose a JPG, PNG, WebP or PDF flyer up to 10 MB.');return;}setError('');setFile(file);};
  const start=async()=>{
    if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');
    try{const result=await aiDraftCall({action:'create',message,request_id:requestId.current,...(file?{file}:{})});navigate(`/CreateListingAI?id=${encodeURIComponent(result.draft.id)}`);}
    catch(e){setError(aiError(e));}finally{inFlight.current=false;setBusy(false);}
  };
  return <section aria-label="Create with Ask Yardit AI" className="space-y-3 rounded-xl border bg-card p-4 text-card-foreground">
    <h2 className="font-semibold">Create with Ask Yardit AI</h2>
    <p className="text-sm text-muted-foreground">Upload a flyer or describe your listing. Yardit will help fill in the details and ask for anything missing.</p>
    <p className="text-xs font-medium">Drafting preview: chat, map confirmation and review are available. Listing creation and checkout are not connected yet.</p>
    <label className="block text-sm">Describe your listing<Textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={3000} rows={3} disabled={busy} placeholder="Tell Yardit what you are posting…"/></label>
    <AIListingAttachment flyer={file} preview={preview} busy={busy} onUpload={choose} onRemove={()=>setFile(null)}/>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button type="button" onClick={start} disabled={busy||(!message.trim()&&!file)}>{busy?'Saving draft…':'ASK YARDIT AI'}</Button><Button type="button" variant="outline" disabled={busy} onClick={()=>navigate('/CreateListingAI')}>Resume AI draft</Button></div>
    <p className="text-xs text-muted-foreground">AI drafts are separate from manual posting. No listing is created automatically.</p>
  </section>;
}