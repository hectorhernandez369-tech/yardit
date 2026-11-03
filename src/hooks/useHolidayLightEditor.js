import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { holidayFormData, holidayPayload } from '@/lib/holidayLights';

function rows(response) { return Array.isArray(response) ? response : (response?.items || []); }
function distanceFeet(a,b,c,d) {
 const R=20902231, lat=(c-a)*Math.PI/180, lng=(d-b)*Math.PI/180;
 const h=Math.sin(lat/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(lng/2)**2;
 return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
export default function useHolidayLightEditor(id) {
 const {user}=useAuth();
 const navigate=useNavigate();
 const client=useQueryClient();
 const [form,setForm]=useState(()=>holidayFormData());
 const record=useQuery({
  queryKey:['holidayLights','edit',id,user?.id],
  enabled:!!id&&!!user?.id,
  queryFn:async()=>{
   const page=await base44.entities.Location.filter({id,type:'holiday_lights',owner_user_id:user.id});
   return rows(page)[0]||null;
  },
 });
 useEffect(()=>{if(record.data)setForm(holidayFormData(record.data));},[record.data]);
 const save=useMutation({mutationFn:async()=>{
  if(!user)throw new Error('Please log in to post your display.');
  if(user.email?.toLowerCase()!=='hectorhernandez369@gmail.com')throw new Error('Christmas listings are in private preview.');
  if(id && (!record.data||record.data.owner_user_id!==user.id))throw new Error('You can edit only your own Christmas display.');
  if(!form.title?.trim()||!form.address?.trim()||!Number.isFinite(form.latitude)||!Number.isFinite(form.longitude))throw new Error('Add a display name and choose its real map location.');
  if(!form.christmas_spot_type)throw new Error('Choose a Christmas display type.');
  if(!form.start||!form.end||form.start>form.end)throw new Error('Choose valid first and last nights.');
  const seasonYear=Number(form.start.slice(0,4))-(form.start.slice(5,7)==='01'?1:0);
  if(form.start<seasonYear+'-11-01'||form.end>(seasonYear+1)+'-01-02')throw new Error('Choose dates within one November 1–January 2 season.');
  if(!form.viewing_start_time||!form.viewing_end_time||form.viewing_start_time>=form.viewing_end_time)throw new Error('End time must be later than start time on the same night.');
  if((form.photos||[]).length>3)throw new Error('Only three photos are allowed.');
  const payload=holidayPayload(form,user.id);
  if(new Date(payload.end_date_time)<=new Date())throw new Error('Choose a last night that has not ended.');
  // Same 50-foot overlapping-date duplicate protection used for Halloween.
  const existing=rows(await base44.entities.Location.filter({type:'holiday_lights',status:'active'}));
  const duplicate=existing.find(spot=>{
    if(spot.id===id||!Number.isFinite(spot.latitude)||!Number.isFinite(spot.longitude))return false;
    if(distanceFeet(form.latitude,form.longitude,spot.latitude,spot.longitude)>50)return false;
    const start=spot.start_date_time?.slice(0,10)||'';
    const end=spot.end_date_time?.slice(0,10)||'';
    return !!start && start<=form.end && (!end||end>=form.start);
  });
  if(duplicate)throw new Error('A Christmas display is already listed at or near this address for these dates.');
  if(id){const {status,christmas_featured_badge,...editablePayload}=payload;return base44.entities.Location.update(id,editablePayload);}
  return base44.entities.Location.create(payload);
 },onSuccess:async spot=>{
  await client.invalidateQueries({queryKey:['holidayLights']});
  navigate('/HolidayLightsDetail?id='+spot.id,{replace:true});
 }});
 return {user,form,setForm,record,save};
}
