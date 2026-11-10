import React, {useState} from 'react';
import {base44} from '@/api/base44Client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Checkbox} from '@/components/ui/checkbox';
import {Loader2} from 'lucide-react';
import {toast} from 'sonner';
import AdminAddressSearch from './AdminAddressSearch';
import AssistedListingQRPanel from './AssistedListingQRPanel';
import HolidayLightsFields from '@/components/holiday-lights/HolidayLightsFields';
import {holidayPayload, holidayFormData} from '@/lib/holidayLights';

export default function AdminAssistedChristmasForm() {
  const [form,setForm]=useState(()=>holidayFormData());
  const [address,setAddress]=useState(null);
  const [homeownerName,setHomeownerName]=useState('');
  const [homeownerEmail,setHomeownerEmail]=useState('');
  const [permission,setPermission]=useState(false);
  const [saving,setSaving]=useState(false);
  const [created,setCreated]=useState(null);
  const submit=async e=>{
    e.preventDefault();
    if(!address?.street||!address?.zip||!address?.city||!address?.state||!Number.isFinite(Number(address.lat))||!Number.isFinite(Number(address.lng))) {
      toast.error('Select a complete homeowner street address from the address search.');return;
    }
    if(!permission){toast.error('Homeowner permission is required.');return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(homeownerEmail.trim())){
      toast.error('Enter the homeowner email. They must sign in with this email to approve the QR.');return;
    }
    if(form.start>form.end){toast.error('The last night must be after the first night.');return;}
    setSaving(true);
    try {
      const payload=holidayPayload({...form,latitude:Number(address.lat),longitude:Number(address.lng),address:address.formatted},'');
      const response=await base44.functions.invoke('manageAssistedChristmas',{
        action:'create',homeowner_permission:true,homeowner_name:homeownerName,
        homeowner_email:homeownerEmail,
        display:{
          ...payload,
          title:form.title,
          description:form.description,
          street_address:address.street,city:address.city,state:address.state,zip_code:address.zip,
          address:address.formatted,latitude:Number(address.lat),longitude:Number(address.lng),
          start_date_time:payload.start_date_time,end_date_time:payload.end_date_time,
          viewing_start_time:form.viewing_start_time,viewing_end_time:form.viewing_end_time,
          christmas_spot_type:form.christmas_spot_type,christmas_tags:form.christmas_tags||[],photos:form.photos||[]
        }
      });
      if(response?.data?.error)throw new Error(response.data.error);
      if(!response?.data?.approval_url)throw new Error('Approval link was not generated.');
      setCreated({
        kind:'christmas',token:new URL(response.data.approval_url).searchParams.get('token'),
        approvalUrl:response.data.approval_url,expiresAt:response.data.expires_at,
        qrImageUrl:'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data='+encodeURIComponent(response.data.approval_url)+'&ecc=M',
        saleAddress:address.formatted,title:form.title
      });
      toast.success('Christmas assisted listing prepared. Homeowner approval is required.');
    }catch(error){
      toast.error(error?.response?.data?.error||error?.message||'Could not create assisted Christmas listing.');
    }finally{setSaving(false);}
  };
  const reset=()=>{setForm(holidayFormData());setAddress(null);setHomeownerEmail('');setHomeownerName('');setPermission(false);setCreated(null);};
  if(created)return <AssistedListingQRPanel created={created} onCreateAnother={reset}/>;
  return <form onSubmit={submit} className="space-y-5">
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      Assisted Christmas display — fill in the homeowner's address. The listing stays pending until the homeowner approves the QR link. The homeowner must sign in with their matching email before approving or declining. Christmas public-preview restrictions remain in effect.
    </div>
    <div className="space-y-2"><Label>Homeowner display address *</Label>
      <AdminAddressSearch selectedAddress={address} onAddressSelected={setAddress}/>
      {address&&<p className="text-xs text-emerald-800">Selected: {address.formatted}</p>}
    </div>
    <HolidayLightsFields form={form} setForm={setForm}/>
    <div className="grid gap-3 sm:grid-cols-2">
      <div><Label>Homeowner name (optional)</Label><Input value={homeownerName} onChange={e=>setHomeownerName(e.target.value)}/></div>
      <div><Label>Homeowner email (required for approval) *</Label><Input required type="email" value={homeownerEmail} onChange={e=>setHomeownerEmail(e.target.value)} placeholder="name@example.com"/></div>
    </div>
    <label className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      <Checkbox checked={permission} onCheckedChange={value=>setPermission(value===true)}/>
      <span>I confirm the homeowner gave permission to add their Christmas display and understands they must approve it using the QR link.</span>
    </label>
    <Button type="submit" disabled={saving||!permission||!address||!homeownerEmail.trim()} className="w-full bg-[#123f30] text-white">
      {saving&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Create Christmas Listing & Approval QR
    </Button>
  </form>;
}
