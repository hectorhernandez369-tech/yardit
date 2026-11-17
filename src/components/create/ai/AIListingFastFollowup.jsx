import React, {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {ArrowRight, Clock3} from 'lucide-react';

// One targeted answer at a time, not a second manual listing form.
const fields={
  title:{type:'text',placeholder:'Enter the listing name'},
  description:{type:'textarea',placeholder:'Add a short description'},
  category:{type:'text',placeholder:'e.g. Community Event'},
  startDate:{type:'date'},endDate:{type:'date'},
  startTime:{type:'time'},endTime:{type:'time'},
  homeownerEmail:{type:'email',placeholder:'organizer@example.com'},
  homeownerName:{type:'text',placeholder:'Organizer name'},
};
export default function AIListingFastFollowup({draft,progress,busy,onAnswer}) {
  const field=progress.nextField;
  const config=fields[field];
  const [value,setValue]=useState('');
  const [localError,setLocalError]=useState('');
  useEffect(()=>{setValue('');setLocalError('');},[field,draft?.id]);
  if(!field||!config)return null;
  const facts=draft.facts||{};
  const suggestedDescription=field==='description' && facts.title
    ? facts.listingType==='yard_sale'
      ? 'Browse items at '+facts.title+'.'
      : 'Join us for '+facts.title+(facts.city?' in '+facts.city:'')+'.'
    : '';
  const save=async candidate=>{
    const chosen=(candidate??value).trim();
    if(!chosen)return setLocalError('Please enter a value.');
    if(field==='homeownerEmail'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chosen))
      return setLocalError('Enter a valid email address for the organizer.');
    if(config.type==='time'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(chosen))
      return setLocalError('Select a valid time.');
    if(field==='endTime'&&facts.startDate===facts.endDate && facts.startTime && chosen<=facts.startTime)
      return setLocalError('The closing time must be later than the opening time.');
    setLocalError('');
    const saved=await onAnswer(field,chosen);
    if(saved)setValue('');
  };
  return <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-950">
    <p className="mb-2 flex items-center gap-2 font-semibold">
      {config.type==='time'?<Clock3 className="h-4 w-4"/>:<span aria-hidden="true">✦</span>}
      {progress.nextQuestion||'One more detail'}
    </p>
    {config.type==='textarea'
      ? <textarea className="w-full rounded-lg border border-teal-200 bg-white p-2 text-sm" rows={2}
          value={value} disabled={busy} onChange={e=>setValue(e.target.value)} placeholder={config.placeholder}/>
      : <input className="w-full rounded-lg border border-teal-200 bg-white p-2 text-sm"
          aria-label={progress.nextQuestion} type={config.type} value={value} disabled={busy}
          onChange={e=>setValue(e.target.value)} placeholder={config.placeholder||''}/>}
    {localError&&<p role="alert" className="mt-1 text-xs text-red-700">{localError}</p>}
    <div className="mt-2 flex flex-wrap gap-2">
      <Button type="button" size="sm" disabled={busy||!value.trim()} onClick={()=>save()}>
        Save answer <ArrowRight className="ml-1 h-3.5 w-3.5"/>
      </Button>
      {suggestedDescription&&<Button type="button" variant="outline" size="sm" disabled={busy}
        onClick={()=>save(suggestedDescription)}>Use suggested description</Button>}
    </div>
    <p className="mt-2 text-xs text-teal-800">Or answer naturally in the chat. Yardit saves each answer.</p>
  </div>;
}
