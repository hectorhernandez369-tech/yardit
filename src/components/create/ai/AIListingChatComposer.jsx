import React, {useRef, useState} from 'react';
import {ArrowUp, FileText, Image as ImageIcon, Paperclip, X} from 'lucide-react';
import {Textarea} from '@/components/ui/textarea';

const ALLOWED=new Set(['image/jpeg','image/png','image/webp','application/pdf']);
const MAX_BYTES=10*1024*1024;

export default function AIListingChatComposer({
  value='',onChange,onSend,file=null,preview='',onFileSelected,onRemoveFile,
  busy=false,disabled=false,placeholder='Message Ask Yardit…',sendLabel='Send message'
}) {
  const inputRef=useRef(null);
  const [fileError,setFileError]=useState('');
  const inactive=busy||disabled;
  const canSend=!inactive && (value.trim().length>0 || (file && !disabled));
  const choose=event=>{
    const chosen=event.target.files?.[0];
    event.target.value='';
    if(!chosen)return;
    if(!ALLOWED.has(chosen.type)||!chosen.size||chosen.size>MAX_BYTES) {
      setFileError('Attach a JPG, PNG, WebP or PDF up to 10 MB.');
      return;
    }
    setFileError('');
    onFileSelected?.(chosen);
  };
  const send=()=>{
    if(canSend)onSend?.();
  };
  const handleKeyDown=event=>{
    if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent?.isComposing &&
      (typeof window==='undefined' || window.matchMedia?.('(pointer: fine)')?.matches)) {
      event.preventDefault();
      send();
    }
  };
  const isPdf=file?.type==='application/pdf';
  return <div className="border-t border-slate-200 bg-white px-3 pb-3 pt-3 sm:px-4">
    {file&&<div className="mb-2 flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm">
      {preview&&!isPdf?<img src={preview} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover"/>:
        isPdf?<FileText className="h-6 w-6 shrink-0 text-teal-700"/>:<ImageIcon className="h-6 w-6 shrink-0 text-teal-700"/>}
      <span className="min-w-0 flex-1 truncate">{file.name||'Flyer attached'}</span>
      <button type="button" aria-label="Remove flyer" title="Remove flyer" disabled={inactive}
        className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-40" onClick={()=>onRemoveFile?.()}>
        <X className="h-4 w-4"/>
      </button>
    </div>}
    <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white px-2 py-2 shadow-sm focus-within:border-teal-700 focus-within:ring-1 focus-within:ring-teal-700">
      <input ref={inputRef} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf"
        aria-label="Attach a flyer" disabled={inactive} onChange={choose}/>
      <button type="button" disabled={inactive} aria-label="Attach a flyer" title="Attach a flyer"
        onClick={()=>inputRef.current?.click()} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-40">
        <Paperclip className="h-5 w-5"/>
      </button>
      <Textarea
        id="yardit-ai-chat-input" aria-label="Message Ask Yardit" rows={1} value={value}
        onChange={event=>onChange?.(event.target.value)}
        onKeyDown={handleKeyDown} maxLength={3000} disabled={inactive} placeholder={placeholder}
        className="min-h-[42px] max-h-36 flex-1 resize-none border-0 bg-transparent px-1 py-2.5 text-[15px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <button type="button" title={sendLabel} aria-label={sendLabel} onClick={send} disabled={!canSend}
        className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#11645a] text-white shadow-sm hover:bg-[#0d5149] disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none">
        <ArrowUp className="h-[18px] w-[18px] stroke-[2.5]"/>
      </button>
    </div>
    {fileError&&<p role="alert" className="mt-1 text-xs text-red-700">{fileError}</p>}
    <p className="mt-2 px-1 text-[11px] text-slate-500">{busy?'Ask Yardit is working…':'Your chat is saved. Nothing is posted until you review and approve.'}</p>
  </div>;
}
