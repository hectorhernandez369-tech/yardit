import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';

async function loadServer(file, client) {
  globalThis.__yarditAIClient=client;
  const result=await build({
    entryPoints:[file],bundle:true,write:false,platform:'neutral',format:'esm',
    plugins:[{
      name:'mock-sdk',
      setup(b) {
        b.onResolve({filter:/^npm:@base44\/sdk/},()=>({path:'sdk',namespace:'test-mock'}));
        b.onLoad({filter:/.*/,namespace:'test-mock'},()=>({
          contents:'export const createClientFromRequest = () => globalThis.__yarditAIClient;',
          loader:'js'
        }));
      }
    }]
  });
  const mod=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
  const endpoint=mod.default;
  return async body=>{
    const response=await endpoint(new Request('https://example.com/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
    return {status:response.status,body:await response.json()};
  };
}
const draft={id:'draft1',owner_user_id:'admin1',revision:0,state:'draft',location_confirmed:false,details_confirmed:false,facts:{},warnings:[]};
function makeClient(email='hectorhernandez369@gmail.com') {
  const writes=[];
  const self={id:'admin1',email,email_verified:true};
  const entities={
    AIListingDraft:{filter:async filters=>(filters.id==='draft1'&&filters.owner_user_id==='admin1'?[draft]:[]),
      updateMany:async()=>{writes.push('updated');return {updated:1};}},
    AIListingTurn:{filter:async()=>({items:[]})},
    Listing:{filter:async()=>[]},
    Location:{filter:async()=>[]}
  };
  return {writes,auth:{me:async()=>self},asServiceRole:{entities}};
}
test('unapproved account cannot submit an AI listing',async()=>{
  const c=makeClient('other@example.com'),call=await loadServer('base44/functions/completeAIListing/entry.ts',c);
  const x=await call({action:'submit',id:'draft1',revision:0});
  assert.equal(x.status,403);
  assert.equal(c.writes.length,0);
});
test('review and confirmed map required on server, not merely client button',async()=>{
  const c=makeClient(),call=await loadServer('base44/functions/completeAIListing/entry.ts',c);
  const x=await call({action:'submit',id:'draft1',revision:0});
  assert.equal(x.status,409);
  assert.equal(c.writes.length,0);
});
test('no listing can be submitted without a valid owner-scoped draft',async()=>{
  const c=makeClient(),call=await loadServer('base44/functions/completeAIListing/entry.ts',c);
  const x=await call({action:'submit',id:'another-id',revision:0});
  assert.equal(x.status,404);
  assert.equal(c.writes.length,0);
});
test('paid event request uses server-owned fee and creates checkout, not an active listing',async()=>{
  const c=makeClient();
  c.asServiceRole.entities.AIListingDraft.filter=async()=>[{
    ...draft, state:'reviewed',details_confirmed:true,location_confirmed:true,
    location:{street:'123 Fake Street',city:'Visalia',state:'CA',zip:'93291',lat:36.3,lng:-119.3,timeZoneId:'America/Los_Angeles'},
    facts:{listingType:'event',title:'Test event',description:'An event',startDate:'2026-11-22',
      endDate:'2026-11-22',startTime:'09:00',endTime:'17:00',postingFor:'self',
      category:'Holiday',admission:'Free'},warnings:[],
  }];
  const invoked=[];
  c.functions={invoke:async(name,data)=>{invoked.push({name,data});return {data:{checkoutUrl:'https://checkout.stripe.com/example',sessionId:'cs_test_example'}};}};
  const call=await loadServer('base44/functions/completeAIListing/entry.ts',c);
  const response=await call({action:'submit',id:'draft1',revision:0,non_refund_acknowledged:true,amount_cents:0});
  assert.equal(response.status,200);
  assert.equal(response.body.result.status,'payment_required');
  assert.equal(response.body.result.amount_cents,999);
  assert.equal(invoked.filter(x=>x.name==='residentialStripeCheckout').length,1);
  assert.equal(invoked.find(x=>x.name==='residentialStripeCheckout').data.amount_cents,999);
  assert.ok(!invoked.some(x=>x.name==='saveResidentialListing'));
});
test('missing homeowner permission blocks assisted listing creation',async()=>{
  const c=makeClient();
  c.asServiceRole.entities.AIListingDraft.filter=async()=>[{
    ...draft,state:'reviewed',details_confirmed:true,location_confirmed:true,
    location:{street:'123 Fake Street',city:'Visalia',state:'CA',zip:'93291',lat:36.3,lng:-119.3,timeZoneId:'America/Los_Angeles'},
    facts:{listingType:'holiday_lights',title:'Test lights',description:'Lights',startDate:'2026-11-22',
      endDate:'2026-11-23',startTime:'17:00',endTime:'22:00',postingFor:'someone_else',
      homeownerEmail:'owner@example.com',christmasType:'christmas_lights'},warnings:[],
  }];
  let invoked=false;c.functions={invoke:async()=>{invoked=true;}};
  const call=await loadServer('base44/functions/completeAIListing/entry.ts',c);
  const response=await call({action:'submit',id:'draft1',revision:0});
  assert.equal(response.status,400);
  assert.equal(invoked,false);
});
test('AI type-specific validation rejects missing seller, tiers, bad dates',async()=>{
  const src=readFileSync('base44/shared/aiListingDrafts.ts','utf8');
  const result=await build({stdin:{contents:src,resolveDir:process.cwd(),sourcefile:'aiListingDrafts.ts'},bundle:true,write:false,format:'esm',platform:'neutral'});
  const mod=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
  const sample={listingType:'yard_sale',title:'Sample',description:'Valid',startDate:'2026-11-20',endDate:'2026-11-22',startTime:'08:00',endTime:'18:00',postingFor:'self',tierPreference:'pre_spree'};
  assert.equal(mod.validateAIListingFacts(sample),null);
  assert.ok(mod.validateAIListingFacts({...sample,tierPreference:'bogus'}));
  assert.ok(mod.validateAIListingFacts({...sample,endDate:'2026-11-21'}));
  assert.ok(mod.validateAIListingFacts({...sample,postingFor:'someone_else'}));
  assert.ok(mod.validateAIListingFacts({...sample,startTime:'99:00'}));
  assert.ok(mod.validateAIListingFacts({...sample,startDate:'2026-11-40'}));
});
