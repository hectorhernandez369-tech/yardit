import React, {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import AIListingAttachment from '@/components/create/ai/AIListingAttachment';
export default function AIListingConversation({model}) {
  const {draft,turns,busy,hasMore,older,send,action}=model;
  const [message,setMessage]=useState('');
  const submit=async()=>{const result=await send(message);if(result)setMessage('');};
  return <section className="space-y-4 rounded-xl border bg-card p-4 text-card-foreground">
    <h2 className="font-semibold">Conversation with Ask Yardit</h2>
    {hasMore&&<Button type="button" variant="outline" size="sm" disabled={busy} onClick={older}>Load earlier messages</Button>}
    <div className="space-y-3" role="log" aria-live="polite">
      {!turns.length&&<p className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm"><strong>Your starting message:</strong> {draft.initial_message}</p>}
      {turns.map(turn=><div key={turn.id} className="space-y-2 text-sm"><p className="whitespace-pre-wrap break-words rounded-lg bg-muted p-3"><strong>You:</strong> {turn.message}</p>{turn.reply?<p className="whitespace-pre-wrap break-words p-2"><strong>Ask Yardit:</strong> {turn.reply}</p>:<div><p>Reply not completed. Your message is saved.</p><Button type="button" size="sm" variant="outline" disabled={busy} onClick={()=>send('',turn)}>Retry saved message</Button></div>}</div>)}
    </div>
    {!!draft.warnings?.length&&<div className="rounded-lg border p-3 text-sm"><strong>Needs clarification</strong><ul className="list-disc pl-5">{draft.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></div>}
    <AIListingAttachment flyer={draft.flyer?.file_uri?draft.flyer:null} preview={draft.flyerPreview} busy={busy} onUpload={file=>action({action:'upload',file})} onRemove={()=>action({action:'remove_flyer'})}/>
    <label className="block text-sm font-medium">Answer or correct a detail<Textarea rows={3} maxLength={3000} value={message} onChange={e=>setMessage(e.target.value)} disabled={busy} placeholder="You can correct anything already collected…"/></label>
    <Button type="button" onClick={submit} disabled={busy||(!message.trim()&&turns.length>0)}>{busy?'Saving / preparing reply…':turns.length?'Send to Ask Yardit':'Start conversation'}</Button>
    {draft.flyer?.file_uri&&turns.length>0&&<Button type="button" className="ml-2" variant="outline" disabled={busy} onClick={()=>send('Please read the current attached flyer, compare it with our collected details, and ask me to clarify any conflicts.')}>Read current flyer</Button>}
  </section>;
}