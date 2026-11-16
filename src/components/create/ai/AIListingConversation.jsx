import React, {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import AIListingAttachment from '@/components/create/ai/AIListingAttachment';
export default function AIListingConversation({model}) {
  const {draft,turns,busy,hasMore,older,send,answer,action}=model;
  const logRef=useRef(null);
  useEffect(()=>{if(logRef.current)logRef.current.scrollTop=logRef.current.scrollHeight;},[turns.length]);
  const [message,setMessage]=useState('');
  const submit=async()=>{const result=await send(message);if(result)setMessage('');};
  const choose=async (field,value)=>{await answer(field,value);};
  const missing=[
    ...(['listingType','title','description','startDate','endDate','startTime','endTime','postingFor'].filter(key=>!draft.facts?.[key])),
    ...(draft.facts?.listingType==='event'?['category','admission'].filter(key=>!draft.facts?.[key]):[]),
    ...(draft.facts?.listingType==='yard_sale'&&!draft.facts?.tierPreference?['tierPreference']:[]),
    ...(draft.facts?.listingType==='holiday_lights'&&!draft.facts?.christmasType?['christmasType']:[]),
    ...(draft.facts?.postingFor==='someone_else'&&!draft.facts?.homeownerEmail?['homeownerEmail']:[])
  ];

  return <section className="space-y-4 rounded-xl border bg-card p-4 text-card-foreground">
    <h2 className="font-semibold">Conversation with Ask Yardit</h2>
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
      <strong>Still needed:</strong> {missing.length ? missing.join(', ') : 'Review warnings and confirm your map location.'}
    </div>
    {!draft.facts?.postingFor&&<div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={()=>choose('postingFor','self')}>Posting for myself</Button>
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={()=>choose('postingFor','someone_else')}>Posting for someone else</Button>
    </div>}
    {draft.facts?.listingType==='event'&&!draft.facts?.admission&&<div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={()=>choose('admission','Free')}>Free admission</Button>
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={()=>choose('admission','Paid — price to be confirmed')}>Paid admission</Button>
    </div>}
    {!draft.facts?.listingType&&<div className="flex flex-wrap gap-2">
      {['event','holiday_lights','yard_sale','neighborhood_sale'].map(type=><Button type="button" variant="outline" size="sm" key={type} disabled={busy} onClick={()=>choose('listingType',type)}>{type==='holiday_lights'?'Christmas display':type.replace('_',' ')}</Button>)}
    </div>}
    {draft.facts?.listingType==='yard_sale'&&!draft.facts?.tierPreference&&<div className="flex flex-wrap gap-2">
      {['free','featured','premium','pre_spree'].map(tier=><Button type="button" variant="outline" size="sm" key={tier} disabled={busy} onClick={()=>choose('tierPreference',tier)}>{tier==='pre_spree'?'Pre-Spree':tier.charAt(0).toUpperCase()+tier.slice(1)}</Button>)}
    </div>}
    {hasMore&&<Button type="button" variant="outline" size="sm" disabled={busy} onClick={older}>Load earlier messages</Button>}
    <div ref={logRef} className="max-h-[48vh] space-y-3 overflow-y-auto overscroll-contain pr-1 sm:max-h-[60vh]" role="log" aria-live="polite">
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