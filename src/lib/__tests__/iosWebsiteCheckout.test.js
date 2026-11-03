import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkoutPlatform, requireIosCheckoutAdapter } from "../checkoutPlatform.js";

test("platform detection preserves browsers and Android; iPad desktop mode remains web", () => {
  assert.equal(checkoutPlatform({}, { userAgent: "Mozilla iPhone Mobile Safari/604.1" }), "web");
  assert.equal(checkoutPlatform({}, { userAgent: "Mozilla Macintosh Safari/605.1", platform: "MacIntel", maxTouchPoints: 5 }), "web");
  assert.equal(checkoutPlatform({}, { userAgent: "Mozilla Android; wv Chrome/130" }), "android");
  assert.equal(checkoutPlatform({}, { userAgent: "Mozilla Android Chrome/130" }), "web");
  assert.equal(checkoutPlatform({}, { userAgent: "Mozilla iPhone Mobile" }), "ios-unconfigured");
  assert.equal(checkoutPlatform({ YarditNativeCheckout: { version: 1, platform: "ios" } }, {}), "ios");
  assert.throws(() => requireIosCheckoutAdapter({}), /not available/);
});

const serverSource = readFileSync("base44/functions/iosWebsiteCheckout/entry.ts", "utf8").replace(/^import .*\n/gm, "");
function server({user = {id:"u1", email:"u1@example.test"}, row = {}, session = {}, enabled = false, webhook = false, event = {}} = {}) {
  let handler; const calls = [];
  const record = { id:"h1", user_id:"u1", session_id:"cs_1", checkout_function:"createVendorSubscriptionCheckout", context_json:"{}", return_path:"/VendorDashboard?tab=tier", cancel_path:"/VendorDashboard?tab=tier", ...row };
  const records = {
    filter: async query => Object.entries(query).every(([k,v]) => record[k] === v) ? [record] : [],
    update: async (id,patch) => { calls.push(["update",id,patch]); Object.assign(record,patch); },
    create: async data => ({...data,id:"created"}),
  };
  const sdk = {auth:{me:async()=>user}, asServiceRole:{entities:{IosCheckoutHandoff:records,VendorEvent:{filter:async()=>[event]}}}, functions:{invoke:async(...args)=>{calls.push(["invoke",...args]);return {data:{active:webhook}};}}};
  const stripeSession = {id:"cs_1",status:"open",mode:"payment",payment_status:"unpaid",metadata:{},...session};
  const stripe = {checkout:{sessions:{
    retrieve:async()=>{calls.push(["retrieve"]);return stripeSession;},
    expire:async()=>{calls.push(["expire"]); if(stripeSession.status!=="open")throw Error("Not open");return {...stripeSession,status:"expired"};}
  }}};
  const env = {STRIPE_SECRET_KEY:"test",IOS_WEBSITE_CHECKOUT_ENABLED:enabled?"true":"false",IOS_US_ONLY_DISTRIBUTION_CONFIRMED:enabled?"true":"false",IOS_CHECKOUT_RETURN_URL:"yardit://checkout-return"};
  new Function("createClientFromRequest","Stripe","Deno",serverSource)(
    ()=>sdk, function(){return stripe;}, {serve:fn=>handler=fn,env:{get:key=>env[key]}}
  );
  return {calls,record,request:async body=>{
    const result=await handler(new Request("https://example.test",{method:"POST",body:JSON.stringify(body)}));
    return {status:result.status,data:await result.json()};
  }};
}
test("disabled iOS checkout creates no payment session", async()=>{
  const s=server();const r=await s.request({action:"create",checkout_function:"residentialStripeCheckout"});
  assert.equal(r.status,400);assert.match(r.data.error,/not enabled/);assert.equal(s.calls.length,0);
});
test("checkout belongs to the authenticated account",async()=>{
  const s=server({user:{id:"someone-else"}});
  const r=await s.request({action:"status",handoff_id:"h1"});
  assert.equal(r.status,404);assert.equal(s.calls.length,0);
});
test("return URL flags never verify an unpaid payment",async()=>{
  const s=server();const r=await s.request({action:"status",handoff_id:"h1",payment:"success",paid:true});
  assert.equal(r.data.verified,false);assert.equal(r.data.resume_path,null);
});
test("paid subscription waits for its webhook",async()=>{
  const session={status:"complete",payment_status:"paid"};
  const pending=await server({session}).request({action:"status",handoff_id:"h1"});
  assert.equal(pending.data.verified,false);
  const confirmed=await server({session,webhook:true}).request({action:"status",handoff_id:"h1"});
  assert.equal(confirmed.data.verified,true);assert.match(confirmed.data.resume_path,/session_id=cs_1/);
});
test("cancellation expires an unpaid checkout before releasing the draft",async()=>{
  const s=server();const r=await s.request({action:"cancel",handoff_id:"h1"});
  assert.equal(r.data.canceled,true);assert.ok(s.calls.find(c=>c[0]==="expire"));
});
test("cancellation after payment resumes paid completion and never expires it",async()=>{
  const s=server({session:{status:"complete",payment_status:"paid"},webhook:true});
  const r=await s.request({action:"cancel",handoff_id:"h1"});
  assert.equal(r.data.verified,true);assert.equal(r.data.canceled,false);assert.ok(!s.calls.find(c=>c[0]==="expire"));
});
test("card setup requires the verified SetupIntent",async()=>{
  const row={checkout_function:"neighborhoodSaleSetupCheckout",context_json:JSON.stringify({yardit_neighborhood_setup_v1:'{"formData":{}}'})};
  const pending=await server({row,session:{mode:"setup",status:"complete",setup_intent:{status:"processing"}}}).request({action:"status",handoff_id:"h1"});
  assert.equal(pending.data.verified,false);
  const ok=await server({row,session:{mode:"setup",status:"complete",setup_intent:{status:"succeeded"}}}).request({action:"status",handoff_id:"h1"});
  assert.equal(ok.data.verified,true);
});
test("promotion confirmation must match the exact checkout session",async()=>{
  const setup={row:{checkout_function:"createVendorEventPromotionCheckout"},session:{status:"complete",payment_status:"paid",metadata:{vendor_event_id:"e1"}}};
  const wrong=await server({...setup,event:{promotion_status:"paid",stripe_checkout_session_id:"cs_other"}}).request({action:"status",handoff_id:"h1"});
  assert.equal(wrong.data.verified,false);
  const ok=await server({...setup,event:{promotion_status:"paid",stripe_checkout_session_id:"cs_1"}}).request({action:"status",handoff_id:"h1"});
  assert.equal(ok.data.verified,true);
});
test("private handoff data cannot be accessed directly by clients",()=>{
  const schema=JSON.parse(readFileSync("base44/entities/IosCheckoutHandoff.jsonc","utf8"));
  assert.deepEqual(schema.rls,{create:false,read:false,update:false,delete:false});
});
test("missing listing draft cannot be silently discarded after payment",async()=>{
  const s=server({row:{checkout_function:"residentialStripeCheckout"},session:{status:"complete",payment_status:"paid"}});
  const r=await s.request({action:"status",handoff_id:"h1"});
  assert.equal(r.status,409);assert.match(r.data.error,/draft/);
});
test("saved context only includes the relevant draft key",async()=>{
  const s=server({row:{checkout_function:"residentialStripeCheckout"}});
  const r=await s.request({action:"save_context",handoff_id:"h1",context:{yardit_paid_listing_checkout_v1:"{}",arbitrary:"secret",yardit_neighborhood_setup_v1:"unrelated"}});
  assert.equal(r.status,200);assert.deepEqual(JSON.parse(s.record.context_json),{yardit_paid_listing_checkout_v1:"{}"});
});

const clientSource=readFileSync("src/lib/websiteCheckout.js","utf8").replace(/^import .*\n/gm,"").replace(/^export /gm,"");
function client(platform, adapter={openExternalBrowser:async()=>true}) {
  const values=new Map();const calls=[];const routes=[];
  const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  const sdk={functions:{invoke:async(name,payload)=>{calls.push([name,payload]);return {data:{checkoutUrl:"https://yardit.app/IosWebsiteCheckout#token=abc",handoff_id:"h1"}};}}};
  const api=new Function("base44","checkoutPlatform","requireIosCheckoutAdapter","localStorage","window",clientSource+"\nreturn {invokeCheckout,openCheckout};")(sdk,()=>platform,()=>adapter,storage,{location:{assign:u=>routes.push(u)}});
  return {api,values,calls,routes};
}
test("web and Android checkout call the existing function and navigate unchanged",async()=>{
  for(const platform of ["web","android"]){
    const c=client(platform);const payload={tier:"premium"};
    await c.api.invokeCheckout("residentialStripeCheckout",payload);
    await c.api.openCheckout("https://checkout.stripe.com/c/pay");
    assert.deepEqual(c.calls,[["residentialStripeCheckout",payload]]);assert.deepEqual(c.routes,["https://checkout.stripe.com/c/pay"]);
  }
});
test("iOS saves handoff context and only uses the native external-browser adapter",async()=>{
  const opened=[];const c=client("ios",{openExternalBrowser:async url=>{opened.push(url);return true;}});
  await c.api.invokeCheckout("residentialStripeCheckout",{tier:"premium"});
  c.values.set("yardit_paid_listing_checkout_v1",'{"formData":{},"session_id":"cs_1"}');
  await c.api.openCheckout("https://yardit.app/IosWebsiteCheckout#token=abc");
  assert.equal(c.calls[0][0],"iosWebsiteCheckout");assert.equal(c.calls[1][1].action,"save_context");
  assert.equal(opened.length,1);assert.deepEqual(c.routes,["/IosCheckoutPending"]);
});
test("native opening failure never falls back to in-app Stripe",async()=>{
  const c=client("ios",{openExternalBrowser:async()=>false});
  await c.api.invokeCheckout("residentialStripeCheckout",{});
  await assert.rejects(()=>c.api.openCheckout("https://yardit.app/IosWebsiteCheckout#token=abc"));
  assert.deepEqual(c.routes,["/IosCheckoutPending"]);
});
test("existing iOS checkout blocks another charge, while verification stays unchanged",async()=>{
  const c=client("ios");
  await c.api.invokeCheckout("residentialStripeCheckout",{});
  await assert.rejects(()=>c.api.invokeCheckout("residentialStripeCheckout",{}),/previous checkout/);
  await c.api.invokeCheckout("residentialStripeCheckout",{action:"verify",session_id:"cs_1"});
  assert.equal(c.calls.length,2);assert.equal(c.calls[1][0],"residentialStripeCheckout");
});
