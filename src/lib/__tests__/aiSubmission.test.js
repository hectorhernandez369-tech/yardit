import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';

async function loadServer(file, client) {
  let endpoint;
  globalThis.Deno={serve:handler=>{endpoint=handler;}};
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
  await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
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
