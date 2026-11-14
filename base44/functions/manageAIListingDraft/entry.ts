import { createClientFromRequest } from 'npm:@base44/sdk@0.8.61';
import tzLookup from 'npm:tz-lookup@6.1.25';
import {aiUser, ownDraft, lockDraft, finishDraft, unlockDraft, draftView, fail, missingDraftFacts} from '../../shared/aiListingDrafts.ts';
import {saveAIFlyer} from '../../shared/aiListingFlyer.ts';

export default async function(req) {
  let base44, draft, token;
  try {
    base44=createClientFromRequest(req);
    const user=await aiUser(base44);
    if(!user)return fail('This listing assistant is restricted to the two authorized accounts.',403);
    const multipart=(req.headers.get('content-type')||'').includes('multipart/form-data');
    if(Number(req.headers.get('content-length')||0)>11*1024*1024)return fail('Flyers must be no larger than 10 MB.',413);
    const body=multipart?Object.fromEntries((await req.formData()).entries()):await req.json().catch(()=>({}));
    const action=body.action;
    const drafts=base44.asServiceRole.entities.AIListingDraft;
    if(action==='list') {
      const page=await drafts.filter({owner_user_id:user.id},{sort:'-updated_date',limit:20,...(body.cursor?{cursor:body.cursor}:{})});
      return Response.json({items:page.items.map(row=>({id:row.id,title:row.title,state:row.state,updated_date:row.updated_date})),next_cursor:page.next_cursor,has_more:page.has_more});
    }
    if(action==='create') {
      const message=typeof body.message==='string'?body.message.trim():'';
      if(message.length>3000 || (!message && !body.file))return fail('Describe your listing, attach a flyer, or both (up to 3,000 characters).');
      if(!/^[a-f0-9-]{36}$/i.test(body.request_id||''))return fail('Missing draft request identifier.');
      const existing=await drafts.filter({owner_user_id:user.id,initial_request_id:body.request_id},'-created_date',1);
      if(existing[0])return Response.json({draft:await draftView(base44,existing[0])});
      let flyer={};
      if(body.file)flyer=await saveAIFlyer(base44,body.file);
      const row=await drafts.create({owner_user_id:user.id,title:'Untitled AI draft',facts:{},warnings:[],initial_message:message||'Please read this flyer and help me prepare a listing.',initial_request_id:body.request_id,flyer,location:{},location_confirmed:false,details_confirmed:false,state:'draft',revision:0,lock_token:'',lock_until:''});
      return Response.json({draft:await draftView(base44,row)});
    }
    draft=await ownDraft(base44,user,body.id);
    if(!draft)return fail('AI draft not found.',404);
    if(action==='get' || action==='history') {
      const page=await base44.asServiceRole.entities.AIListingTurn.filter({draft_id:draft.id,owner_user_id:user.id},{sort:'-created_date',limit:20,...(body.cursor?{cursor:body.cursor}:{})});
      return Response.json({draft:await draftView(base44,draft),turns:page.items,next_cursor:page.next_cursor,has_more:page.has_more});
    }
    if(!['upload','remove_flyer','location','confirm_location','review','edit'].includes(action))return fail('Unsupported draft action. This operation does not publish listings.');
    token=await lockDraft(base44,draft,Number(body.revision));
    if(!token)return fail('This draft changed or is busy. Reload it before continuing.',409);
    let changes={details_confirmed:false,state:'draft'};
    if(action==='upload')changes={...changes,flyer:await saveAIFlyer(base44,body.file),location_confirmed:false,warnings:['New flyer attached. Ask Yardit to read it before reviewing.']};
    if(action==='remove_flyer')changes={...changes,flyer:{},location_confirmed:false,warnings:['Flyer removed. Existing details remain proposed; check them before review.']};
    if(action==='location') {
      const loc=body.location;
      if(!loc)changes={...changes,location:{},location_confirmed:false};
      else {
        if(typeof loc.lat!=='number'||typeof loc.lng!=='number'||!Number.isFinite(loc.lat)||!Number.isFinite(loc.lng)||Math.abs(loc.lat)>90||Math.abs(loc.lng)>180 || !['street','city','state','zip'].every(key=>typeof loc[key]==='string'&&loc[key].trim()))throw new Error('Select a complete address including city, state and ZIP.');
        const location={lat:loc.lat,lng:loc.lng,street:loc.street.trim().slice(0,180),city:loc.city.trim().slice(0,90),state:loc.state.trim().slice(0,40),zip:loc.zip.trim().slice(0,12),timeZoneId:tzLookup(loc.lat,loc.lng)};
        location.formatted=[location.street,location.city,`${location.state} ${location.zip}`].join(', ');
        changes={...changes,location,location_confirmed:false,facts:{...draft.facts,address:location.street,city:location.city,state:location.state,zip:location.zip}};
      }
    }
    if(action==='confirm_location') {
      if(body.confirmed!==true || !draft.location?.timeZoneId)throw new Error('Select the real address and review the map pin before confirming.');
      changes={...changes,location_confirmed:true};
    }
    if(action==='review') {
      if(body.confirmed!==true || !draft.location_confirmed || missingDraftFacts(draft.facts||{}).length || draft.warnings?.length)throw new Error('Resolve the missing details and warnings, then confirm the map location before reviewing.');
      changes={state:'reviewed',details_confirmed:true};
    }
    const saved=await finishDraft(base44,draft,token,changes);token=null;
    return Response.json({draft:await draftView(base44,saved)});
  } catch(error) {
    if(token&&draft)await unlockDraft(base44,draft,token);
    return fail(error?.message||'Could not save the AI draft.',400);
  }
}