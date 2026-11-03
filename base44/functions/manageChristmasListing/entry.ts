import { createClientFromRequest } from 'npm:@base44/sdk@0.8.57';

const PREVIEW_EMAIL = 'hectorhernandez369@gmail.com';
const TYPES = new Set(['christmas_decorations', 'christmas_lights', 'light_show', 'christmas_experience']);
const TAGS = new Set(['kid_friendly','walkthrough','music','santa','photo_op','synchronized_lights']);

function verifiedAddress(user) {
  const data = user?.data && typeof user.data === 'object' ? user.data : {};
  const field = (name, fallback = '') => user?.[name] ?? data?.[name] ?? fallback;
  const flag = field('primary_address_verified') === true || field('address_verified') === true || field('address_confirmation_status') === 'confirmed';
  const street = String(field('street_address',field('street')) || '').trim();
  const city = String(field('city') || '').trim();
  const state = String(field('state') || '').trim();
  const zip = String(field('zip_code',field('zip')) || '').trim();
  const latitude = field('primary_latitude', field('address_lat',field('latitude',null)));
  const longitude = field('primary_longitude', field('address_lng',field('longitude',null)));
  if (!flag || !street || !city || !state || !zip || typeof latitude !== 'number' || typeof longitude !== 'number' ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude)>90 || Math.abs(longitude)>180) return null;
  return {
    street_address: street, city, state, zip_code: zip,
    address: [street,city,state+' '+zip].join(', '),
    latitude, longitude,
  };
}
function distanceFeet(a,b,c,d) {
 const R=20902231, lat=(c-a)*Math.PI/180, lng=(d-b)*Math.PI/180;
 const h=Math.sin(lat/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(lng/2)**2;
 return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
function fail(message, status=400) {return Response.json({error:message},{status});}
Deno.serve(async req => {
 try {
  const base44=createClientFromRequest(req);
  const user=await base44.auth.me().catch(()=>null);
  if(!user)return fail('Login required.',401);
  if(String(user.email||'').trim().toLowerCase()!==PREVIEW_EMAIL)return fail('Christmas listings are private until launch.',403);
  const body=await req.json().catch(()=>({}));
  const action=String(body.action||'save');
  const location=verifiedAddress(user);
  if(!location)return fail('Verify your primary address in your profile first.',403);
  const id=typeof body.id==='string'?body.id:'';
  let existing=null;
  if(id) {
   const rows=await base44.asServiceRole.entities.Location.filter({id,type:'holiday_lights'});
   existing=rows?.[0]||null;
   if(!existing)return fail('Christmas display not found.',404);
   if(String(existing.owner_user_id)!==String(user.id))return fail('You may only manage your own Christmas display.',403);
  }
  if(action==='remove'){
   if(!existing)return fail('Missing display.',400);
   await base44.asServiceRole.entities.Location.delete(id);
   return Response.json({ok:true});
  }
  if(action==='toggle'){
   if(!existing)return fail('Missing display.',400);
   await base44.asServiceRole.entities.Location.update(id,{display_active:body.display_active===true});
   return Response.json({ok:true});
  }
  if(action!=='save')return fail('Unknown action.');
  const submitted=body.payload||{};
  const title=String(submitted.title||'').trim().slice(0,120);
  const description=String(submitted.description||'').trim().slice(0,3000);
  if(!title)return fail('Add a display name.');
  if(!TYPES.has(submitted.christmas_spot_type))return fail('Choose a Christmas display type.');
  const dates=['start_date_time','end_date_time'].map(key=>new Date(submitted[key]||''));
  if(dates.some(date=>Number.isNaN(date.valueOf()))||dates[0]>=dates[1]||dates[1]<=new Date())return fail('Choose valid future display dates.');
  const seasonYear=dates[0].getUTCFullYear()-(dates[0].getUTCMonth()===0?1:0);
  if(dates[0]<new Date(Date.UTC(seasonYear,9,31)) || dates[1]>new Date(Date.UTC(seasonYear+1,0,4)))return fail('Choose dates within the November–January season.');
  const start=String(submitted.viewing_start_time||'');
  const end=String(submitted.viewing_end_time||'');
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)||start>=end)return fail('Choose valid viewing hours.');
  if(!Array.isArray(submitted.photos)||(submitted.photos.length>3)||submitted.photos.some(url=>typeof url!=='string'||url.length>2000))return fail('Only three valid photos are allowed.');
  const others=await base44.asServiceRole.entities.Location.filter({type:'holiday_lights',status:'active'},'-created_date',500);
  if((others||[]).some(other=>other.id!==id &&
      typeof other.latitude==='number'&&typeof other.longitude==='number'&&
      distanceFeet(location.latitude,location.longitude,other.latitude,other.longitude)<=50 &&
      (new Date(other.start_date_time||0) <= dates[1] && new Date(other.end_date_time||0)>=dates[0])))return fail('A Christmas display already exists at this address for those dates.');
  const payload={
   ...location, type:'holiday_lights',tier:'free',owner_user_id:user.id,
   title, display_title:title,description,viewing_start_time:start,viewing_end_time:end,
   start_date_time:dates[0].toISOString(),end_date_time:dates[1].toISOString(),
   expires_at:dates[1].toISOString(),display_active:submitted.display_active===true,
   photos:submitted.photos.slice(0,3),
   christmas_spot_type:submitted.christmas_spot_type,
   christmas_tags:Array.isArray(submitted.christmas_tags)?submitted.christmas_tags.filter(tag=>TAGS.has(tag)):[],
   christmas_host_name:String(submitted.christmas_host_name||'').slice(0,150),
   christmas_admission:String(submitted.christmas_admission||'').slice(0,150),
   christmas_parking_notes:String(submitted.christmas_parking_notes||'').slice(0,500),
   christmas_activities:String(submitted.christmas_activities||'').slice(0,500),
   christmas_suggested_age:String(submitted.christmas_suggested_age||'').slice(0,100),
  };
  let result;
  if(existing)result=await base44.asServiceRole.entities.Location.update(id,payload);
  else result=await base44.asServiceRole.entities.Location.create({...payload,status:'active',payment_status:'free',christmas_featured_badge:'none'});
  return Response.json({ok:true,location:result});
 }catch(error){console.error('manageChristmasListing',error);return fail('Could not save Christmas display.',500);}
});
