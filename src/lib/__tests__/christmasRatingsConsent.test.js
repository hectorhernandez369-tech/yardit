import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';

const FIXED='2026-11-23T18:00:00Z';
const ID='123456789012345678901234';
const owner={id:'owner',email:'owner@example.com',primary_address_verified:true,street_address:'1 Test St',city:'Visalia',state:'CA',zip_code:'93291',primary_latitude:36.3,primary_longitude:-119.3};
const display={id:ID,type:'holiday_lights',owner_user_id:owner.id,title:'Lights',display_title:'Lights',description:'',latitude:36.3,longitude:-119.3,status:'active',display_active:true,christmas_spot_type:'christmas_lights',start_date_time:'2026-11-20T08:00:00Z',end_date_time:'2027-01-03T06:00:00Z',viewing_start_time:'17:00',viewing_end_time:'22:00',photos:[],ratings_enabled:true,average_rating:4,ratings_count:1,holiday_score:4,christmas_points:3,five_star_votes:0};
function clientFor(spot={...display},user=owner) {
 const writes=[],votes=[{id:'vote1',listing_id:ID,user_id:'visitor',user_email:'visitor@example.com',season_year:2026,rating_value:4}];
 const entities={
 Location:{filter:async q=>q.id?(spot?.id===q.id?[spot]:[]):spot?[spot]:[],
  update:async(id,patch)=>{writes.push({entity:'Location',patch});Object.assign(spot,patch);return {...spot};},
  create:async data=>{writes.push({entity:'Location',create:data});return {id:ID,...data};}},
 LightRating:{filter:async()=>votes,create:async data=>{writes.push({entity:'LightRating',create:data});votes.push({id:'newvote',...data});},
 update:async(id,patch)=>{writes.push({entity:'LightRating',patch});Object.assign(votes.find(v=>v.id===id),patch);},
 delete:async()=>{throw new Error('Must not delete saved ratings');}},
 };
 return {writes,votes,spot,auth:{me:async()=>user},asServiceRole:{entities}};
}
async function endpoint(file,client) {
 globalThis.__ratingsTestClient=client;
 const result=await build({entryPoints:[file],bundle:true,write:false,format:'esm',platform:'neutral',
 plugins:[{name:'mock',setup(b){
 b.onResolve({filter:/^npm:@base44\/sdk/},()=>({path:'sdk',namespace:'stub'}));
 b.onResolve({filter:/^npm:tz-lookup/},()=>({path:'timezone',namespace:'stub'}));
 b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:a.path==='sdk'?'export const createClientFromRequest=()=>globalThis.__ratingsTestClient;':"export default ()=> 'America/Los_Angeles';"}));
 b.onLoad({filter:/entry\.ts$/},a=>({contents:readFileSync(a.path,'utf8').replace('Deno.serve(', 'export default ('),loader:'ts'}));
 }}]});
 const mod=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 return async body=>{const response=await mod.default(new Request('https://yardit.app/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));return {status:response.status,data:await response.json()};};
}
const savePath='base44/functions/manageChristmasListing/entry.ts';
const ratingPath='base44/functions/manageChristmasRating/entry.ts';
const publicPath='base44/functions/getPublicMapData/entry.ts';
function clock(t){t.mock.timers.enable({apis:['Date'],now:new Date(FIXED)});}

test('new displays default off; explicit boolean true opts in',async t=>{
 clock(t);
 for(const choice of [undefined,false,'true',true]){
 const client=clientFor(null),call=await endpoint(savePath,client);
 const payload={...display};delete payload.ratings_enabled;
 if(choice!==undefined)payload.ratings_enabled=choice;
 const r=await call({action:'save',payload});
 assert.equal(r.status,200);assert.equal(r.data.location.ratings_enabled,choice===true);
 }
});
test('only owner can change ratings; turning off and back on preserves every saved vote and score',async t=>{
 clock(t);const client=clientFor(),call=await endpoint(savePath,client);
 for(const enabled of [false,true]){
 const r=await call({action:'save',id:ID,payload:{...display,ratings_enabled:enabled,average_rating:0,ratings_count:0}});
 assert.equal(r.status,200);assert.equal(client.spot.ratings_enabled,enabled);
 assert.equal(client.spot.average_rating,4);assert.equal(client.spot.ratings_count,1);assert.equal(client.votes.length,1);
 }
 const other=clientFor({...display},{...owner,id:'intruder'});
 const denied=await (await endpoint(savePath,other))({action:'save',id:ID,payload:{...display,ratings_enabled:false}});
 assert.equal(denied.status,403);assert.equal(other.writes.length,0);
});
test('old clients omitting the choice preserve existing homeowner preference',async t=>{
 clock(t);const client=clientFor(),call=await endpoint(savePath,client);
 const payload={...display};delete payload.ratings_enabled;
 assert.equal((await call({action:'save',id:ID,payload})).status,200);
 assert.equal(client.spot.ratings_enabled,true);
});
test('disabled or legacy unset displays reject ratings before writing and conceal read scores',async t=>{
 clock(t);
 for(const flag of [false,undefined]){
 const client=clientFor({...display,ratings_enabled:flag}),call=await endpoint(ratingPath,client);
 assert.equal((await call({action:'rate',location_id:ID,rating:5})).status,403);
 const read=await call({action:'read',location_id:ID});
 assert.equal(read.data.ratings_enabled,false);assert.equal(read.data.average_rating,undefined);
 assert.equal(read.data.my_rating,null);assert.equal(client.writes.length,0);
 }
});
test('opted-in nearby visitor can rate; a later opt-out blocks the next submission',async t=>{
 clock(t);const client=clientFor({...display},{id:'visitor',email:'visitor@example.com'});
 const call=await endpoint(ratingPath,client);
 const body={action:'rate',location_id:ID,rating:5,geo:{latitude:36.3,longitude:-119.3,accuracy_meters:5,sampled_at:Date.now()}};
 assert.equal((await call(body)).status,200);assert.equal(client.votes[0].rating_value,5);
 client.spot.ratings_enabled=false;const writes=client.writes.length;
 assert.equal((await call({...body,rating:1})).status,403);
 assert.equal(client.writes.length,writes);assert.equal(client.votes[0].rating_value,5);
});
test('public map and detail retain disabled displays but suppress scores; leaderboards exclude them',async t=>{
 clock(t);
 for(const enabled of [false,true,undefined]){
 const client=clientFor({...display,ratings_enabled:enabled},null),call=await endpoint(publicPath,client);
 const map=await call({holidayLights:true}),detail=await call({holidayLightId:ID}),board=await call({holidayLeaderboard:true});
 assert.equal(map.status,200);assert.equal(map.data.items.length,1);assert.equal(detail.data.location.id,ID);
 for(const loc of [map.data.items[0],detail.data.location]){
 assert.equal(loc.ratings_enabled,enabled===true);
 for(const field of ['average_rating','ratings_count','holiday_score','christmas_points','five_star_votes'])
 assert.equal(loc[field],enabled===true?display[field]:undefined);
 }
 assert.equal(board.data.items.length,enabled===true?1:0);
 }
});
test('assisted approval accepts ratings only from authenticated matching homeowner and makes them the owner',async t=>{
 clock(t);
 for(const [user,enabled,status] of [[owner,true,200],[owner,false,200],[{...owner,email:'other@example.com'},true,403]]){
 const client=clientFor(null,user);
 const row={id:'approval',token:'a'.repeat(48),status:'pending',homeowner_email:owner.email,expires_at:'2026-11-24T18:00:00Z',data_json:JSON.stringify({...display,owner_user_id:'representative',ratings_enabled:true})};
 client.asServiceRole.entities.AssistedChristmas={filter:async()=>[row],update:async()=>{}};
 const call=await endpoint('base44/functions/manageAssistedChristmas/entry.ts',client);
 const r=await call({action:'approve',token:row.token,ratings_enabled:enabled});
 assert.equal(r.status,status);
 if(status===200){const saved=client.writes.find(w=>w.create).create;assert.equal(saved.owner_user_id,owner.id);assert.equal(saved.ratings_enabled,enabled);}
 else assert.equal(client.writes.length,0);
 }
});
test('legacy recalculation endpoint cannot expose scores while ratings are off',async t=>{
 clock(t);const client=clientFor({...display,ratings_enabled:false});
 const call=await endpoint('base44/functions/manageSeasonalLocation/entry.ts',client);
 const r=await call({action:'recalculate_holiday_rating',location_id:ID,season_year:2026});
 assert.equal(r.status,403);assert.equal(client.writes.length,0);
});
test('Ask Yardit passes only the explicit final review choice to Christmas publication',async t=>{
 clock(t);
 for(const enabled of [undefined,false,true]){
 const user={...owner,email:'hectorhernandez369@gmail.com'};
 const client=clientFor(null,user);
 const draft={id:'draft1',owner_user_id:user.id,revision:0,state:'reviewed',details_confirmed:true,location_confirmed:true,
 location:{street:'1 Test St',city:'Visalia',state:'CA',zip:'93291',lat:36.3,lng:-119.3,timeZoneId:'America/Los_Angeles'},
 facts:{listingType:'holiday_lights',title:'Lights',description:'Our Christmas display',christmasType:'christmas_lights',startDate:'2026-11-23',endDate:'2027-01-02',startTime:'17:00',endTime:'22:00',postingFor:'self',ratings_enabled:true},warnings:[]};
 client.asServiceRole.entities.AIListingDraft={filter:async()=>[draft],updateMany:async()=>({updated:1})};
 let submitted;
 client.functions={invoke:async(name,data)=>{assert.equal(name,'manageChristmasListing');submitted=data.payload;return {data:{location:{id:ID}}};}};
 const call=await endpoint('base44/functions/completeAIListing/entry.ts',client);
 const r=await call({action:'submit',id:draft.id,revision:0,ratings_enabled:enabled});
 assert.equal(r.status,200);assert.equal(submitted.ratings_enabled,enabled===true);
 }
});
test('create and edit screens render the visible ratings switch before their save button',async()=>{
 const {createRequire}=await import('node:module');
 const require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const oldWindow=globalThis.window;
 globalThis.window={self:null,top:null,location:{search:''}};
 try {
 const result=await build({entryPoints:['src/pages/CreateHolidayLights.jsx'],bundle:true,write:false,format:'cjs',platform:'node',mainFields:['module','main'],external:['react','react-dom','react/jsx-runtime'],alias:{'@':process.cwd()+'/src'},plugins:[{name:'ui-isolation',setup(b){
 b.onResolve({filter:/.*/},a=>{
 if(a.path.includes('useHolidayLightEditor'))return {path:'editor',namespace:'ui'};
 if(a.path.includes('trustActions'))return {path:'trust',namespace:'ui'};
 if(a.path.includes('base44Client'))return {path:'api',namespace:'ui'};
 if(a.path==='react-router-dom')return {path:'router',namespace:'ui'};
 if(['HolidayLightsFields','HolidayLightsLocation','HolidayLightsNotFound','HolidayLightsHeader','AdminAssistedChristmasForm'].some(n=>a.path.includes(n)))return {path:'child',namespace:'ui'};
 });
 b.onLoad({filter:/.*/,namespace:'ui'},a=>({contents:{
 editor:'export default ()=>globalThis.__ratingsEditor;',
 trust:'export const hasVerifiedPrimaryAddress=()=>true;',
 api:'export const base44={};',
 router:"import React from 'react';export const Link=({children,to,...p})=>React.createElement('a',{...p,href:to},children);",
 child:'export default ()=>null;'
 }[a.path]}));
 }}]});
 const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);
 for(const [editing,enabled] of [[false,false],[true,true],[true,false]]){
 globalThis.window.location.search=editing?'?id='+ID:'';
 globalThis.__ratingsEditor={user:owner,form:{ratings_enabled:enabled},setForm:()=>{},record:{data:display},save:{mutate:()=>{},isPending:false}};
 const html=renderToStaticMarkup(React.createElement(module.exports.default));
 assert.ok(html.includes('Let visitors rate my display'));
 assert.ok(html.includes('role="switch"'));
 assert.ok(html.includes('aria-checked="'+enabled+'"'));
 assert.ok(html.includes('Ratings '+(enabled?'ON':'OFF')));
 const submit=editing?'Save display':'Publish Holiday Lights';
 assert.ok(html.indexOf('Let visitors rate my display')<html.indexOf(submit));
 assert.ok(html.includes('turning them back on restores them'));
 }
 }finally{globalThis.window=oldWindow;delete globalThis.__ratingsEditor;}
});