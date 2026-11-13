import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AssistedAIPosting from "@/components/create/event/AssistedAIPosting";
import EventLocationStep from "@/components/create/event/EventLocationStep";
import StepTwo from "@/components/create/StepTwo";
import { getDefaultEventIconForCategory } from "@/lib/eventListingConfig";

const TYPES = {event:"Event",yard_sale:"Yard Sale",neighborhood_sale:"Neighborhood Sale",halloween_spot:"Halloween Spot"};
const validLocation = d => typeof d.lat==="number" && Number.isFinite(d.lat) && typeof d.lng==="number" && Number.isFinite(d.lng) && !!d.addressText && !!d.city && !!d.state && !!d.zip;

export default function AIListingFlow({formData,setFormData,user,onExit,onFinish,isAssistedPost,setIsAssistedPost,canUseAssistedPost,setGeocodeRef}) {
 const [stage,setStage]=useState(1);
 const [draftReady,setDraftReady]=useState(false);
 const [suggestion,setSuggestion]=useState("");
 const [error,setError]=useState("");
 const type=formData.listingType;
 const update=(field,value)=>setFormData(p=>({...p,[field]:value,...(field==="event_name"?{title:value}:{}),...(field==="event_description"?{description:value}:{})}));
 const finishDraft=(draft,flyerUrl)=>{
   const nextType=TYPES[draft.listingType]?draft.listingType:"event";
   const suggested=[draft.address,draft.city,draft.state,draft.zip].filter(Boolean).join(", ");
   setFormData(p=>{
     const images=flyerUrl?[...new Set([...(p.photoUrls||[]),flyerUrl])].slice(0,10):(p.photoUrls||[]);
     return {...p,listingType:nextType,title:draft.title||p.title,description:draft.description||p.description,
       event_name:draft.title||p.event_name,event_description:draft.description||p.event_description,
       category:draft.category||p.category,categories:nextType==="yard_sale"&&draft.category?[draft.category]:p.categories,
       event_category:draft.category||p.event_category,event_icon:getDefaultEventIconForCategory(draft.category)||p.event_icon,
       event_start_date:draft.date||p.event_start_date,event_end_date:draft.date||p.event_end_date,
       event_start_time:draft.startTime||p.event_start_time,event_end_time:draft.endTime||p.event_end_time,
       selectedRangeStartDate:draft.date||p.selectedRangeStartDate,selectedRangeEndDate:draft.date||p.selectedRangeEndDate,
       openTime:draft.startTime||p.openTime,closeTime:draft.endTime||p.closeTime,
       event_photos:images,photoUrls:images,
       event_add_ons:{...(p.event_add_ons||{}),...(images.length?{photo_gallery:true}:{})},
       // AI text is NOT a verified map location. Reuse the existing search/pin controls.
       lat:null,lng:null,selected_geocode_confirmed:false,geocoded_address:"",location_source:"address_search",
       addressText:suggested,address_text:suggested,display_address:suggested,
       city:draft.city||"",state:draft.state||"",zip:draft.zip||""};
   });
   setSuggestion(suggested);setDraftReady(true);setStage(2);setError("");
 };
 const nextLocation=()=>{
   if(!validLocation(formData)){setError("Choose the suggested address or drop a pin on the map, then confirm the exact location.");return;}
   setError("");setStage(3);
 };
 const handleFinish=()=>{
   if(!validLocation(formData)){setStage(2);setError("Confirm the map location first.");return;}
   if(type==="event" && (!formData.event_start_date||!formData.event_start_time||!formData.event_end_time)){setError("Enter the event date, start time and end time.");return;}
   if(type==="yard_sale" && (!formData.selectedRangeStartDate||!formData.openTime||!formData.closeTime)){setError("Enter the yard sale date and opening hours.");return;}
   setError("");onFinish();
 };
 return <div className="min-h-[calc(100vh-140px)] bg-gradient-to-b from-slate-50 to-white">
   <div className="mx-auto max-w-2xl px-4 py-8">
     <div className="mb-5 flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-800">Yardit AI Posting</h1><p className="text-sm text-slate-500">AI workflow · Step {stage} of 3</p></div><Button type="button" variant="outline" onClick={onExit}>Exit AI</Button></div>
     <div className="mb-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold">{["Describe","Verify address","Review"].map((s,i)=><div key={s} className={`rounded-lg px-2 py-3 ${stage===i+1?"bg-teal-800 text-white":"bg-slate-100 text-slate-600"}`}>{i+1}. {s}</div>)}</div>
     <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-5">
       {stage===1&&<AssistedAIPosting onDraftReady={finishDraft} standalone />}
       {stage===2&&<>
         <h2 className="text-lg font-bold">Verify the listing address</h2>
         <p className="text-sm text-slate-600">Yardit AI suggested: <strong>{suggestion||"No address found — search below"}</strong>. Select an actual search result or confirm a map pin. AI text alone is not verified.</p>
         {type==="event"?<EventLocationStep formData={formData} setFormData={setFormData}/>:<StepTwo formData={formData} setFormData={setFormData} onGeocodeRef={setGeocodeRef} user={user} canEditAddressOverride={true}/>}
         <div className="flex gap-2"><Button variant="outline" onClick={()=>setStage(1)}>Back</Button><Button className="flex-1" onClick={nextLocation}>Address Verified — Continue</Button></div>
       </>}
       {stage===3&&<>
         <h2 className="text-lg font-bold">Review your {TYPES[type]||"listing"}</h2>
         <p className="text-sm text-slate-600">This is the final AI review. You do not need to return to the manual posting steps.</p>
         <div className="space-y-1"><label className="text-sm font-semibold">Title</label><Input value={formData.title||""} onChange={e=>update("title",e.target.value)}/></div>
         <div className="space-y-1"><label className="text-sm font-semibold">Description</label><Textarea rows={4} value={formData.description||""} onChange={e=>update("description",e.target.value)}/></div>
         <div className="space-y-1"><label className="text-sm font-semibold">Category</label><Input value={formData.category||""} onChange={e=>{update("category",e.target.value); if(type==="event")update("event_category",e.target.value);}}/></div>
         <div className="rounded-lg bg-slate-50 p-3 text-sm"><strong>Verified map location:</strong> {formData.addressText||"Missing"}</div>
         <div className="grid grid-cols-2 gap-3">
           <label className="text-sm">Date<Input type="date" value={type==="event"?formData.event_start_date||"":formData.selectedRangeStartDate||""} onChange={e=>setFormData(p=>({...p,event_start_date:e.target.value,event_end_date:e.target.value,selectedRangeStartDate:e.target.value,selectedRangeEndDate:e.target.value}))}/></label>
           <label className="text-sm">End date (if applicable)<Input type="date" disabled={type==="event"} value={type==="event"?formData.event_start_date||"":formData.selectedRangeEndDate||""} onChange={e=>update("selectedRangeEndDate",e.target.value)}/></label>
           <label className="text-sm">Start time<Input type="time" value={type==="event"?formData.event_start_time||"":formData.openTime||""} onChange={e=>setFormData(p=>({...p,event_start_time:e.target.value,openTime:e.target.value}))}/></label>
           <label className="text-sm">End time<Input type="time" value={type==="event"?formData.event_end_time||"":formData.closeTime||""} onChange={e=>setFormData(p=>({...p,event_end_time:e.target.value,closeTime:e.target.value}))}/></label>
         </div>
         {canUseAssistedPost&&type!=="neighborhood_sale"&&<label className="flex gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={isAssistedPost} onChange={e=>setIsAssistedPost(e.target.checked)}/>This is an Assisted Post (on someone else's behalf)</label>}
         <div className="flex gap-2"><Button variant="outline" onClick={()=>setStage(2)}>Back to map</Button><Button className="flex-1" onClick={handleFinish}>Confirm and Finish</Button></div>
       </>}
       {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
     </div>
   </div>
 </div>;
}
