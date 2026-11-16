import { createClientFromRequest } from 'npm:@base44/sdk@0.8.61';
import { aiUser, ownDraft, lockDraft, finishDraft, unlockDraft, fail, validateAIListingFacts } from '../../shared/aiListingDrafts.ts';

const URL_RE = /^https:\/\//;
function parts(date:Date,timeZone:string) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',
    minute:'2-digit',second:'2-digit',hourCycle:'h23',weekday:'short'
  }).formatToParts(date).map(x=>[x.type,x.value]));
}
function wallToUtc(ymd:string,hm:string,tz:string) {
  const [year,month,day]=ymd.split('-').map(Number);
  const [hour,minute]=hm.split(':').map(Number);
  const wall=Date.UTC(year,month-1,day,hour,minute);
  let guess=wall;
  for(let i=0;i<3;i++) {
    const p=parts(new Date(guess),tz);
    const local=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
    guess=wall-(local-guess);
  }
  return new Date(guess).toISOString();
}
function addDays(ymd:string,n:number) {
  const d=new Date(ymd+'T12:00:00Z');
  d.setUTCDate(d.getUTCDate()+n);
  return d.toISOString().slice(0,10);
}
function freeWindow(tz:string) {
  const now=new Date(),p=parts(now,tz);
  const ymd=`${p.year}-${p.month}-${p.day}`;
  const weekday={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[p.weekday] ?? 0;
  const friday=addDays(ymd,-(weekday>=5?weekday-5:weekday+2));
  const sunday=addDays(friday,2);
  const end=new Date(wallToUtc(sunday,'22:00',tz));
  const nextFriday=now>end?addDays(friday,7):friday;
  const nextSunday=addDays(nextFriday,2);
  const isCurrent=now>=new Date(wallToUtc(nextFriday,'05:00',tz)) && now<=new Date(wallToUtc(nextSunday,'22:00',tz));
  return {
    start:nextFriday,end:nextSunday,
    startIso:isCurrent?now.toISOString():wallToUtc(nextFriday,'05:00',tz),
    endIso:wallToUtc(nextSunday,'22:00',tz),
    activeDates:[nextFriday,addDays(nextFriday,1),nextSunday],
    status:isCurrent?'active':'scheduled',
  };
}
function distanceFeet(a:number,b:number,c:number,d:number) {
  const rad=Math.PI/180;
  const h=Math.sin((c-a)*rad/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin((d-b)*rad/2)**2;
  return 20902231*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
function verifiedHome(user:any,loc:any) {
  const d=user.data||{}, f=(key:string)=>user[key]??d[key];
  const flag=f('primary_address_verified')===true||f('address_verified')===true||f('address_confirmation_status')==='confirmed';
  const lat=f('primary_latitude')??f('address_lat'),lng=f('primary_longitude')??f('address_lng');
  if(!flag||typeof lat!=='number'||typeof lng!=='number'||distanceFeet(lat,lng,loc.lat,loc.lng)>500) return false;
  return true;
}
async function uploadApprovedImage(base44:any,draft:any) {
  if(!draft.flyer?.file_uri)return '';
  if(!['image/jpeg','image/png','image/webp'].includes(draft.flyer.type))return '';
  const link=await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:draft.flyer.file_uri,expires_in:240});
  const response=await fetch(link.signed_url);
  if(!response.ok)throw new Error('Could not read your saved flyer for publication. Please retry.');
  const blob=await response.blob();
  if(blob.size>10*1024*1024)throw new Error('The flyer exceeds the upload limit.');
  const file=new File([blob],draft.flyer.name||'flyer.jpg',{type:draft.flyer.type});
  const uploaded=await base44.asServiceRole.integrations.Core.UploadFile({file});
  if(!uploaded?.file_url||!URL_RE.test(uploaded.file_url))throw new Error('Flyer publication failed.');
  return uploaded.file_url;
}
async function call(base44:any,name:string,payload:any) {
  const response=await base44.functions.invoke(name,payload);
  const data=response?.data??response;
  if(data?.error)throw new Error(data.error);
  return data;
}
export default async function(req:Request) {
  let base44:any,draft:any,token:string|null=null;
  try {
    base44=createClientFromRequest(req);
    const user=await aiUser(base44);
    if(!user)return fail('Only the two authorized Ask Yardit accounts may submit AI listings.',403);
    const body=await req.json().catch(()=>({}));
    const action=String(body.action||'');
    draft=await ownDraft(base44,user,body.id);
    if(!draft)return fail('AI draft not found.',404);
    if(action==='status')return Response.json({result:draft.submission_result||null,submission_status:draft.submission_status||'none'});
    if(action!=='submit'&&action!=='paid_finalize')return fail('Unsupported action.');
    if(action==='paid_finalize') {
      const listingId=String(body.listing_id||''),sessionId=String(body.session_id||'');
      if(!listingId||!sessionId)return fail('Payment and listing references required.');
      const verified=await call(base44,'residentialStripeCheckout',{action:'verify',session_id:sessionId});
      if(!verified.stripe_paid || verified.listing_id!==listingId)return fail('Stripe has not confirmed this listing payment.',403);
      const [listing]=await base44.asServiceRole.entities.Listing.filter({id:listingId,ownerUserId:user.id});
      if(!listing)return fail('Paid listing does not belong to this account.',403);
      if(draft.submission_result?.status==='published'&&draft.submission_result?.listing_id===listingId)
        return Response.json({result:draft.submission_result});
      token=await lockDraft(base44,draft,Number(body.revision??draft.revision));
      if(!token)return fail('Draft is busy. Reload and retry.',409);
      const patches:any={};
      if(draft.flyer?.file_uri && draft.flyer.type.startsWith('image/')) {
        const flyerUrl=await uploadApprovedImage(base44,draft);
        if(flyerUrl) {
          if(listing.listingType==='event') {
            patches.event_flyer_url=flyerUrl;
            patches.event_add_ons={...(listing.event_add_ons||{}),flyer_upload:true};
          } else {
            patches.photoUrls=[flyerUrl,...(listing.photoUrls||[])].slice(0,listing.tier==='premium'?25:10);
          }
        }
      }
      if(Object.keys(patches).length)await base44.asServiceRole.entities.Listing.update(listingId,patches);
      const result={status:listing.status==='scheduled'?'scheduled':'published',listing_id:listingId,listing_type:listing.listingType};
      await finishDraft(base44,draft,token,{submission_result:result,submission_status:'submitted'});
      token=null;
      return Response.json({result});
    }

    if(draft.submission_result && ['published','scheduled','pending_approval','payment_required'].includes(draft.submission_result.status))
      return Response.json({result:draft.submission_result,reused:true});
    if(draft.state!=='reviewed'||draft.details_confirmed!==true||draft.location_confirmed!==true||!draft.location?.timeZoneId)
      return fail('Review all details and confirm the map location first.',409);
    const facts=draft.facts||{},loc=draft.location;
    const problem=validateAIListingFacts(facts);
    if(problem)return fail(problem,400);
    if((draft.warnings||[]).length)return fail('Resolve remaining AI questions before publishing.',400);
    if(facts.postingFor==='someone_else'&&body.homeowner_permission!==true)
      return fail('Confirm that the homeowner authorized this assisted listing.',400);
    const timezone=loc.timeZoneId;
    const startIso=wallToUtc(facts.startDate,facts.startTime,timezone);
    const endIso=wallToUtc(facts.endDate,facts.endTime,timezone);
    if(new Date(endIso)<=new Date())return fail('The listing schedule has ended. Update your dates.',400);
    token=await lockDraft(base44,draft,Number(body.revision));
    if(!token)return fail('Draft changed or a submission is already running. Reload before retrying.',409);
    const address=`${loc.street}, ${loc.city}, ${loc.state} ${loc.zip}`;
    const common:any={title:facts.title,description:facts.description,listingType:facts.listingType,
      addressText:address,display_address:address,city:loc.city,state:loc.state,zip:loc.zip,
      lat:loc.lat,lng:loc.lng,timeZoneId:timezone,category:facts.category||'Other',
      startDateTime:startIso,endDateTime:endIso,
      selectedRangeStartDate:facts.startDate,selectedRangeEndDate:facts.endDate,
      openTime:facts.startTime,closeTime:facts.endTime};
    let result:any;
    if(facts.listingType==='holiday_lights') {
      const display:any={
        title:facts.title,description:facts.description,
        christmas_spot_type:facts.christmasType,
        viewing_start_time:facts.startTime,viewing_end_time:facts.endTime,
        start_date_time:wallToUtc(facts.startDate,'00:00',timezone),
        end_date_time:endIso,latitude:loc.lat,longitude:loc.lng,
        street_address:loc.street,city:loc.city,state:loc.state,zip_code:loc.zip,
        address,photos:[],display_active:true,
      };
      if(facts.postingFor==='self') {
        if(!verifiedHome(user,loc))throw new Error('Confirm your verified home address for a self-posted Christmas display.');
        const image=await uploadApprovedImage(base44,draft);
        if(image)display.photos=[image];
        const saved=await call(base44,'manageChristmasListing',{action:'save',payload:display});
        if(!saved.location?.id)throw new Error('Christmas listing was not saved.');
        result={status:'published',listing_id:saved.location.id,listing_type:'holiday_lights'};
      } else {
        const saved=await call(base44,'manageAssistedChristmas',{
          action:'create',homeowner_permission:true,homeowner_email:facts.homeownerEmail,
          homeowner_name:facts.homeownerName||'',display,
        });
        if(!saved.id||!saved.approval_url)throw new Error('Approval QR could not be created.');
        // Store the private flyer reference in this pending record. Publication must
        // occur only AFTER the homeowner authorizes the QR; no public URL exists yet.
        if(draft.flyer?.file_uri) {
          const [row]=await base44.asServiceRole.entities.AssistedChristmas.filter({id:saved.id,admin_creator_id:user.id});
          if(row) {
            const stored=JSON.parse(row.data_json||'{}');
            stored.ai_flyer_uri=draft.flyer.file_uri;
            stored.ai_flyer_name=draft.flyer.name;
            stored.ai_flyer_type=draft.flyer.type;
            await base44.asServiceRole.entities.AssistedChristmas.update(row.id,{data_json:JSON.stringify(stored)});
          }
        }
        result={status:'pending_approval',listing_type:'holiday_lights',
          approval_id:saved.id,approval_url:saved.approval_url,expires_at:saved.expires_at};
      }
    } else if(facts.listingType==='yard_sale'&&facts.postingFor==='self'&&(facts.tierPreference||'free').toLowerCase()==='free') {
      if(!verifiedHome(user,loc))throw new Error('A free yard sale must use your verified home location.');
      const window=freeWindow(timezone);
      if(facts.startDate!==window.start||facts.endDate!==window.end)
        throw new Error(`Free yard sales automatically run ${window.start}–${window.end}. Correct the AI dates or select Featured.`);
      const image=await uploadApprovedImage(base44,draft);
      const listing:any={...common,tier:'free',selectedRangeStartDate:window.start,selectedRangeEndDate:window.end,
        startDateTime:window.startIso,endDateTime:window.endIso,activeDates:window.activeDates,
        status:window.status,activation_status:window.status==='active'?'active':'pending',
        photoUrls:image?[image]:[],pricePaid:0,payment_status:'free',
        earlyVisibilityDays:0,earlyVisibilityDates:[],early_visibility_enabled:false,
        participant_origin:'standalone',neighborhood_join_status:'none',ownerUserId:user.id,
        locationMethod:'verified_primary_address',addressText:user.primary_address||user.street_address};
      const saved=await call(base44,'saveResidentialListing',{action:'create',data:listing});
      if(!saved.listing?.id)throw new Error('Free yard sale was not saved.');
      result={status:window.status==='active'?'published':'scheduled',listing_id:saved.listing.id,listing_type:'yard_sale'};
    } else if(facts.postingFor==='self'&&['yard_sale','event'].includes(facts.listingType)) {
      if(facts.listingType==='yard_sale'&&!verifiedHome(user,loc))throw new Error('Paid residential sales must use your verified home address.');
      if(facts.listingType==='event'&&facts.startDate!==facts.endDate)
        throw new Error('Residential events currently use one calendar date; please clarify the date.');
      const isEvent=facts.listingType==='event';
      const tier=isEvent?'event':String(facts.tierPreference||'').toLowerCase();
      if(!isEvent&&!['featured','premium'].includes(tier))throw new Error('Choose Featured or Premium for paid residential dates.');
      const amount=isEvent?999+(draft.flyer?.file_uri?199:0):(tier==='featured'?499:799);
      const eventData:any=isEvent?{
        ...common,tier:'event',event_tier:'event',event_name:facts.title,event_description:facts.description,
        event_category:facts.category,event_start_date:facts.startDate,event_end_date:facts.startDate,
        event_start_time:facts.startTime,event_end_time:facts.endTime,
        start_datetime:startIso,end_datetime:endIso,
        event_add_ons:{flyer_upload:!!draft.flyer?.file_uri},event_flyer_url:'',
        event_photos:[],event_icon:'calendar',category:facts.category,photoUrls:[],
      }:{...common,tier,photoUrls:[],ownerUserId:user.id,earlyVisibilityDays:0,earlyVisibilityDates:[]};
      const ack=body.non_refund_acknowledged===true;
      if(!ack)throw new Error('Acknowledge the payment and refund terms before checkout.');
      const paymentPayload:any={
        action:'create',tier,listing_kind:isEvent?'event':'residential',amount_cents:amount,
        event_price_breakdown:isEvent?{total:amount,addOns:draft.flyer?.file_uri?[{key:'flyer_upload'}]:[]}:undefined,
        customer_email:user.email,return_url:String(req.headers.get('origin')||'https://yardit.app')+'/CreateListing',
        owner_user_id:user.id,listingType:facts.listingType,description:facts.description,
        event_description:isEvent?facts.description:undefined,
        addressText:common.addressText,zip:loc.zip,lat:loc.lat,lng:loc.lng,
        selectedRangeStartDate:facts.startDate,selectedRangeEndDate:facts.endDate,
        event_start_date:isEvent?facts.startDate:undefined,event_end_date:isEvent?facts.startDate:undefined,
        event_start_time:isEvent?facts.startTime:undefined,event_end_time:isEvent?facts.endTime:undefined,
        start_datetime:startIso,end_datetime:endIso,startDateTime:startIso,endDateTime:endIso,
        non_refund_acknowledged:true,non_refund_acknowledged_at:new Date().toISOString(),
        non_refund_acknowledged_by_user_id:user.id,
        non_refund_disclosure_text:'Paid listing charges are non-refundable according to Yardit listing terms.',
      };
      const checkout=await call(base44,'residentialStripeCheckout',paymentPayload);
      if(checkout.founder_vip===true) {
        const saved=await call(base44,'saveResidentialListing',{action:'founder_create',data:eventData});
        if(!saved.listing?.id)throw new Error('Founder listing could not be saved.');
        result={status:'published',listing_id:saved.listing.id,listing_type:facts.listingType};
      } else {
        if(!checkout.checkoutUrl||!checkout.sessionId)throw new Error('Stripe checkout did not return a valid payment session.');
        result={status:'payment_required',checkout_url:checkout.checkoutUrl,session_id:checkout.sessionId,
          amount_cents:amount,listing_type:facts.listingType,form_data:{...eventData,ai_listing_draft_id:draft.id}};
      }
    } else {
      throw new Error('This listing type must use the existing specialized assisted or neighborhood workflow. Nothing has been published or charged.');
    }
    const submission_status=result.status==='payment_required'?'pending_checkout':
      result.status==='pending_approval'?'pending_approval':'submitted';
    await finishDraft(base44,draft,token,{submission_result:result,submission_status});
    token=null;
    return Response.json({result});
  } catch(error:any) {
    if(token&&draft)await unlockDraft(base44,draft,token).catch(()=>{});
    return fail(error?.message||'Could not submit AI listing.',error?.status===403?403:error?.status===409?409:400);
  }
}
