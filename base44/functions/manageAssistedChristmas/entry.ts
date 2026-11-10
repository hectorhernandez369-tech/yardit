import { createClientFromRequest } from 'npm:@base44/sdk@0.8.57';

const LOUIS_ID = '69d0704643057b42958d2749';
const TYPES = new Set(['christmas_decorations','christmas_lights','light_show','christmas_experience']);
const PREVIEW_ADMIN_EMAIL = 'hectorhernandez369@gmail.com';
const fail = (message: string, status=400) => Response.json({error:message},{status});
function normalize(value:any){return String(value||'').trim().toLowerCase();}
function canActAsHomeowner(user:any, homeownerEmail:string) {
  // The QR token is only a lookup capability, not proof of homeowner identity.
  // Require an authenticated account with the email entered by the field representative.
  return Boolean(user?.id && user?.email && user?.email_verified !== false &&
    homeownerEmail && normalize(user.email) === normalize(homeownerEmail));
}

function verifyAddress(user:any, data:any) {
 const u=user?.data||{}, field=(k:string)=>user?.[k]??u?.[k];
 const verified=field('primary_address_verified')===true||field('address_verified')===true||field('address_confirmation_status')==='confirmed';
 const street=normalize(field('street_address')||field('primary_address')||'');
 const target=normalize(data.address||[data.street_address,data.city,data.state,data.zip_code].join(' '));
 return !!verified && street.length>3 && target.includes(street);
}
function distanceFeet(a:number,b:number,c:number,d:number){
 const R=20902231,rad=Math.PI/180,lat=(c-a)*rad,lng=(d-b)*rad;
 const q=Math.sin(lat/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(lng/2)**2;
 return R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));
}
function publicPreview(row:any) {
 const x=JSON.parse(row.data_json||'{}');
 return {id:row.id,status:row.status,expires_at:row.expires_at,location_id:row.location_id||'',
  title:x.title,address:x.address,city:x.city,zip_code:x.zip_code,
  christmas_spot_type:x.christmas_spot_type,start_date_time:x.start_date_time,end_date_time:x.end_date_time,
  viewing_start_time:x.viewing_start_time,viewing_end_time:x.viewing_end_time,
  homeowner_name:row.homeowner_name||''};
}
function validate(raw:any) {
 const lat=raw?.latitude,lng=raw?.longitude;
 if (typeof lat!=='number'||typeof lng!=='number'||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180) return 'Choose a valid location.';
 if (!raw.street_address||!raw.city||!raw.state||!/^\d{5}$/.test(String(raw.zip_code||'')))return 'Choose a complete street address, including ZIP code.';
 if(!TYPES.has(raw.christmas_spot_type))return 'Choose a Christmas display type.';
 if(!String(raw.title||'').trim())return 'Display name is required.';
 const start=new Date(raw.start_date_time),end=new Date(raw.end_date_time);
 if(!Number.isFinite(+start)||!Number.isFinite(+end)||start>=end||end<=new Date())return 'Choose valid future display dates.';
 const year=start.getUTCFullYear()-(start.getUTCMonth()===0?1:0);
 if(start<new Date(Date.UTC(year,9,31))||end>new Date(Date.UTC(year+1,0,4)))return 'Christmas dates must fall in the November–January season.';
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.viewing_start_time||'')||
 !/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.viewing_end_time||'')||
 raw.viewing_start_time>=raw.viewing_end_time)return 'Choose valid viewing hours.';
 if(!Array.isArray(raw.photos)||raw.photos.length>3||raw.photos.some((x:any)=>typeof x!=='string'||x.length>2000))return 'Up to three valid photos allowed.';
 return null;
}
async function eligible(base44:any,user:any) {
 if(!user)return false;
 const profiles=await base44.asServiceRole.entities.AdminProfile.filter({user_id:user.id}).catch(()=>[]);
 const active=profiles.filter((p:any)=>p.is_active===true);
 // Big Louie's existing supervisor access must remain active; do not
 // grant access merely because his user ID exists.
 if(String(user.id)===LOUIS_ID)return active.some((p:any)=>['supervisor','master','super_master'].includes(p.role_label));
 if(normalize(user.email)===PREVIEW_ADMIN_EMAIL)return active.some((p:any)=>['master','super_master'].includes(p.role_label));
 return active.some((p:any)=>['master','super_master'].includes(p.role_label));
}
Deno.serve(async req=>{
 try {
  const base44=createClientFromRequest(req),user=await base44.auth.me().catch(()=>null);
  const body=await req.json().catch(()=>({}));
  const action=String(body.action||'');
  const records=base44.asServiceRole.entities.AssistedChristmas;
  if(action==='create'){
   if(!(await eligible(base44,user)))return fail('Not authorized for assisted Christmas listings.',403);
   const raw=body.display||{},message=validate(raw);
   if(message)return fail(message);
   if(body.homeowner_permission!==true)return fail('Homeowner permission must be confirmed.');
   const homeownerEmail=normalize(body.homeowner_email);
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(homeownerEmail) || homeownerEmail.length>254)
     return fail('A valid homeowner email is required for secure QR approval.');
   const pending=await records.filter({status:'pending'},'-created_date',500).catch(()=>[]);
   const duplicates=(pending||[]).some((entry:any)=>{
     const previous=JSON.parse(entry.data_json||'{}');
     return normalize(previous.address)===normalize(raw.address)&&new Date(previous.end_date_time)>=new Date(raw.start_date_time);
   });
   if(duplicates)return fail('A pending assisted Christmas display already exists at this address.',409);
   const existing=await base44.asServiceRole.entities.Location.filter({type:'holiday_lights',status:'active'},'-created_date',500);
   if((existing||[]).some((p:any)=>distanceFeet(p.latitude,p.longitude,raw.latitude,raw.longitude)<=50&&
       new Date(p.end_date_time||0)>=new Date(raw.start_date_time)&&new Date(p.start_date_time||0)<=new Date(raw.end_date_time)))
    return fail('An active Christmas display already exists at this address.',409);
   const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);
   const token=Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
   const now=new Date(),expires=new Date(now.getTime()+24*60*60*1000);
   const display={
     type:'holiday_lights',tier:'free',status:'active',payment_status:'free',
     title:String(raw.title).trim().slice(0,120),display_title:String(raw.title).trim().slice(0,120),
     description:String(raw.description||'').slice(0,3000),
     street_address:String(raw.street_address),city:String(raw.city),state:String(raw.state),zip_code:String(raw.zip_code),
     address:String(raw.address),latitude:raw.latitude,longitude:raw.longitude,
     start_date_time:new Date(raw.start_date_time).toISOString(),end_date_time:new Date(raw.end_date_time).toISOString(),
     viewing_start_time:raw.viewing_start_time,viewing_end_time:raw.viewing_end_time,
     christmas_spot_type:raw.christmas_spot_type,
     christmas_tags:Array.isArray(raw.christmas_tags)?raw.christmas_tags:[],
     photos:raw.photos,display_active:true,
     christmas_featured_badge:'none',
     owner_user_id:user.id, // temporary technical owner until homeowner claims
   };
   const row=await records.create({
     admin_creator_id:user.id,admin_creator_email:normalize(user.email),
     homeowner_email:homeownerEmail,
     homeowner_name:String(body.homeowner_name||'').slice(0,120),
     token,status:'pending',created_at:now.toISOString(),expires_at:expires.toISOString(),
     data_json:JSON.stringify(display),
   });
   const origin=req.headers.get('origin')||'https://yardit.app';
   const url=new URL('/assisted-christmas',origin);url.searchParams.set('token',token);
   return Response.json({ok:true,id:row.id,approval_url:url.toString(),expires_at:expires.toISOString()});
  }
  const token=String(body.token||'');
  if(!/^[a-f0-9]{48}$/i.test(token))return fail('Invalid approval link.',404);
  const matches=await records.filter({token});
  if(matches.length!==1)return fail('Approval link not found.',404);
  const row=matches[0],data=JSON.parse(row.data_json||'{}');
  if(action==='read')return Response.json({ok:true,display:publicPreview(row)});
  if(!['approve','decline','claim'].includes(action))return fail('Unsupported action.');
  if(!user?.id)return fail('Sign in with the homeowner account to approve, decline, or claim this display.',401);
  if(!canActAsHomeowner(user,row.homeowner_email))
    return fail('Only the signed-in homeowner with the matching verified email can manage this display.',403);
  if(action==='claim') {
    if(!user)return fail('Sign in to claim your Christmas display.',401);
    if(!['approved','claimed'].includes(row.status)||!row.location_id)return fail('Approve the display before claiming it.',409);
    if(row.status==='claimed')return fail('This display has already been claimed.',409);
    await base44.asServiceRole.entities.Location.update(row.location_id,{owner_user_id:user.id});
    await records.update(row.id,{status:'claimed',claimed_at:new Date().toISOString(),claimed_by_user_id:user.id,token:'__claimed__'+row.id});
    return Response.json({ok:true,status:'claimed',location_id:row.location_id});
  }
  if(row.status!=='pending')return fail('This approval has already been resolved.',409);
  if(new Date(row.expires_at)<new Date()){
    await records.update(row.id,{status:'expired',token:'__expired__'+row.id});
    return fail('Approval QR has expired.',410);
  }
  if(action==='decline'){
   await records.update(row.id,{status:'declined',token:'__declined__'+row.id});
   return Response.json({ok:true,status:'declined'});
  }
  // Create only after the homeowner approves. Re-check duplicates at approval time.
  const existing=await base44.asServiceRole.entities.Location.filter({type:'holiday_lights',status:'active'},'-created_date',500);
  if((existing||[]).some((p:any)=>distanceFeet(p.latitude,p.longitude,data.latitude,data.longitude)<=50&&
       new Date(p.end_date_time||0)>=new Date(data.start_date_time)&&new Date(p.start_date_time||0)<=new Date(data.end_date_time)))
   return fail('Another Christmas listing already exists here.',409);
  const loc=await base44.asServiceRole.entities.Location.create(data);
  await records.update(row.id,{status:'approved',approved_at:new Date().toISOString(),location_id:loc.id});
  return Response.json({ok:true,status:'approved',location_id:loc.id});
 }catch(e){console.error('manageAssistedChristmas',e);return fail('Could not process assisted Christmas listing.',500);}
});
