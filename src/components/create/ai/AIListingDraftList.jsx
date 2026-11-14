import React, {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import AIListingEntry from '@/components/create/ai/AIListingEntry';
import {aiDraftCall,aiError} from '@/components/create/ai/aiListingClient';
export default function AIListingDraftList() {
  const [items,setItems]=useState([]),[cursor,setCursor]=useState(null),[more,setMore]=useState(false),[busy,setBusy]=useState(true),[error,setError]=useState('');
  const load=async(next)=>{setBusy(true);setError('');try{const data=await aiDraftCall({action:'list',...(next?{cursor:next}:{})});setItems(old=>next?[...old,...data.items]:data.items);setCursor(data.next_cursor);setMore(data.has_more);}catch(e){setError(aiError(e));}finally{setBusy(false);}};
  useEffect(()=>{load();},[]);
  return <div className="space-y-5"><AIListingEntry/><h2 className="font-semibold">My saved AI drafts</h2>
    {error&&<div role="alert"><p className="text-destructive">{error}</p><Button variant="outline" onClick={()=>load()}>Retry</Button></div>}
    {items.map(item=><Link key={item.id} to={`/CreateListingAI?id=${encodeURIComponent(item.id)}`} className="block rounded-xl border bg-card p-4 text-card-foreground"><strong>{item.title}</strong><p className="text-xs text-muted-foreground">{item.state==='reviewed'?'Reviewed draft':'Unfinished draft'} · Not published</p></Link>)}
    {!busy&&!items.length&&!error&&<p className="text-sm text-muted-foreground">No AI drafts yet. Describe a listing or attach a flyer above.</p>}
    {busy&&<p role="status">Loading drafts…</p>}
    {more&&<Button type="button" variant="outline" disabled={busy} onClick={()=>load(cursor)}>Load more drafts</Button>}
  </div>;
}