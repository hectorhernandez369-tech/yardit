import {useCallback,useEffect,useRef,useState} from 'react';
import {aiDraftCall,aiError} from '@/components/create/ai/aiListingClient';
export default function useAIListingDraft(id,enabled) {
  const [draft,setDraft]=useState(null),[turns,setTurns]=useState([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [cursor,setCursor]=useState(null),[hasMore,setHasMore]=useState(false);
  const inFlight=useRef(false),currentId=useRef(id),pending=useRef(null);
  currentId.current=id;
  const load=useCallback(async()=>{
    if(!id||!enabled)return;
    setLoading(true);setError('');
    try{const data=await aiDraftCall({action:'get',id});if(currentId.current!==id)return;setDraft(data.draft);setTurns(data.turns.slice().reverse());setCursor(data.next_cursor);setHasMore(data.has_more);}
    catch(e){setError(aiError(e));}finally{setLoading(false);}
  },[id,enabled]);
  useEffect(()=>{setDraft(null);setTurns([]);pending.current=null;if(enabled&&id)load();else setLoading(false);},[id,enabled,load]);
  const run=async work=>{
    if(inFlight.current)return null;
    inFlight.current=true;setBusy(true);setError('');
    try{return await work();}catch(e){setError(aiError(e));return null;}finally{inFlight.current=false;setBusy(false);}
  };
  const action=body=>run(async()=>{
    const data=await aiDraftCall({id,revision:draft.revision,...body});setDraft(data.draft);return data;
  });
  const send=(message,retryTurn)=>run(async()=>{
    const initial=!turns.length && !message.trim();
    const request=retryTurn?{request_id:retryTurn.request_id,message:retryTurn.message}:
      initial?{request_id:draft.initial_request_id,initial:true}:
      pending.current?.message===message?pending.current:{request_id:crypto.randomUUID(),message};
    pending.current=request;
    const data=await aiDraftCall({id,revision:draft.revision,...request},'draftAssistedEventAI');
    setDraft(data.draft);setTurns(items=>[...items.filter(t=>t.request_id!==data.turn.request_id),data.turn]);pending.current=null;return data;
  });
  const older=()=>run(async()=>{
    const data=await aiDraftCall({action:'history',id,cursor});setTurns(items=>[...data.turns.slice().reverse(),...items]);setCursor(data.next_cursor);setHasMore(data.has_more);
  });
  return {draft,turns,busy,loading,error,hasMore,action,send,older,reload:load};
}