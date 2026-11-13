import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { getDefaultEventIconForCategory } from "@/lib/eventListingConfig";

export default function AssistedAIPosting({ setFormData, onDraftReady, standalone = false }) {
  const [message,setMessage]=useState("");
  const [draft,setDraft]=useState(null);
  const [flyerUrl,setFlyerUrl]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [followUp,setFollowUp]=useState("");
  const [warnings,setWarnings]=useState([]);
  const [history,setHistory]=useState([]);
  const upload=async e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(!file.type.startsWith('image/')||file.size>10*1024*1024){setError("Upload an image under 10 MB.");return;}
    setBusy(true);setError("");
    try{const r=await base44.integrations.Core.UploadFile({file});setFlyerUrl(r.file_url);}
    catch(err){setError(err?.message||"Upload failed");}
    finally{setBusy(false);e.target.value="";}
  };
  const send=async()=>{
    if(!message.trim()&&!flyerUrl)return;
    setBusy(true);setError("");
    try{
      const r=await base44.functions.invoke("draftAssistedEventAI",{message,flyerUrl,draft});
      if(!r?.data?.draft)throw new Error("No draft returned");
      setDraft(r.data.draft);setFollowUp(r.data.followUp||"");setWarnings(r.data.warnings||[]);
      setHistory(p=>[...p,{message:message||"Uploaded flyer",response:r.data.followUp||"Draft updated"}].slice(-8));
      setMessage("");
    }catch(e){setError(e?.response?.data?.error||e?.message||"AI unavailable");}
    finally{setBusy(false);}
  };
  const apply=()=>{
    if(!draft)return;
    if (onDraftReady) { onDraftReady(draft, flyerUrl); return; }
    setFormData(prev=>{
      const photos=flyerUrl?[...new Set([...(prev.event_photos||[]),flyerUrl])].slice(0,10):(prev.event_photos||[]);
      return {...prev,listingType:draft.listingType||"event",
        event_name:draft.title||prev.event_name,title:draft.title||prev.title,
        event_description:draft.description||prev.event_description,description:draft.description||prev.description,
        event_category:draft.category||prev.event_category,category:draft.category||prev.category,
        event_icon:getDefaultEventIconForCategory(draft.category)||prev.event_icon,
        event_start_date:draft.date||prev.event_start_date,event_end_date:draft.date||prev.event_end_date,
      selectedRangeStartDate:draft.date||prev.selectedRangeStartDate,selectedRangeEndDate:draft.date||prev.selectedRangeEndDate,
      openTime:draft.startTime||prev.openTime,closeTime:draft.endTime||prev.closeTime,
        event_start_time:draft.startTime||prev.event_start_time,event_end_time:draft.endTime||prev.event_end_time,
        event_photos:photos,photoUrls:photos,
        event_add_ons:{...(prev.event_add_ons||{}),...(photos.length?{photo_gallery:true}:{})},
        event_photo_gallery_count:Math.max(1,photos.length),
        flyer_suggested_address:[draft.address,draft.city,draft.state,draft.zip].filter(Boolean).join(", ")
      };
    });
    setFollowUp("Draft applied. Review every field, then confirm the address on the Location step.");
  };
  return <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-3">
    <h3 className="font-bold text-teal-950">Yardit AI — Describe Your Listing</h3>
    <p className="text-sm text-teal-900">Describe any Yardit listing, attach a flyer, or both. Yardit AI prepares the draft and takes you to map verification.</p>
    <label className="inline-flex cursor-pointer rounded-lg border border-teal-700 px-3 py-2 text-sm font-medium">Attach flyer
      <input type="file" accept="image/*" className="hidden" onChange={upload} disabled={busy}/>
    </label>
    {flyerUrl&&<img src={flyerUrl} alt="Attached event flyer" className="max-h-36 rounded object-contain"/>}
    {history.map((h,i)=><p key={i} className="text-xs text-teal-900"><strong>You:</strong> {h.message}<br/><strong>Yardit:</strong> {h.response}</p>)}
    <textarea className="w-full rounded-lg border p-3 text-sm" rows={3} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Example: Post this comedy show for Saturday at 8 PM. Pick a good category and write the description."/>
    <button type="button" onClick={send} disabled={busy||(!message.trim()&&!flyerUrl)} className="rounded-lg bg-teal-800 px-4 py-2 text-white disabled:opacity-50">{busy?"Working…":"Ask Yardit AI"}</button>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    {draft&&<div className="rounded-lg border bg-white p-3 space-y-2 text-sm">
      <strong>Draft for your review</strong>
      <p><strong>Listing type:</strong> {draft.listingType||"Event"}</p>
      <p><strong>Title:</strong> {draft.title||"Missing"}</p><p><strong>Description:</strong> {draft.description||"Missing"}</p>
      <p><strong>Category:</strong> {draft.category}</p><p><strong>Date:</strong> {draft.date||"Missing"}</p>
      <p><strong>Hours:</strong> {draft.startTime||"Missing"} – {draft.endTime||"Missing"}</p>
      <p><strong>Address (not yet verified):</strong> {[draft.address,draft.city,draft.state,draft.zip].filter(Boolean).join(", ")||"Missing"}</p>
      {warnings.length>0&&<p className="text-amber-800">Check: {warnings.join("; ")}</p>}
      {followUp&&<p className="font-medium text-teal-900">{followUp}</p>}
      <button type="button" onClick={apply} className="rounded-lg bg-teal-800 px-4 py-2 font-semibold text-white">{standalone ? "Verify Address →" : "Use Draft"}</button>
    </div>}
  </div>;
}
