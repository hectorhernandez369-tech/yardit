import React, {useState} from 'react';
import {Link} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import {checkoutPlatform} from '@/lib/checkoutPlatform';
import {openCheckout,ensureCheckoutCanStart,IOS_PENDING_KEY} from '@/lib/websiteCheckout';
import AIListingSummary from '@/components/create/ai/AIListingSummary';

const paidTypes = new Set(['event','featured','premium']);
function checkoutAmount(facts,flyer) {
  if(facts.listingType==='event') return 999+(flyer?.file_uri?199:0);
  if(facts.listingType!=='yard_sale') return 0;
  return facts.tierPreference==='featured'?499:facts.tierPreference==='premium'?799:0;
}
function label(cents) {return '$'+(cents/100).toFixed(2);}
export default function AIListingReview({draft,busy,onAction,onComplete,onBack}) {
  const [reviewed,setReviewed]=useState(false);
  const [permission,setPermission]=useState(false);
  const [refundAcknowledged,setRefundAcknowledged]=useState(false);
  const [redirectError,setRedirectError]=useState('');
  const [result,setResult]=useState(null);
  const facts=draft.facts||{},saved=result||draft.submission_result;
  const price=facts.postingFor==='self'?checkoutAmount(facts,draft.flyer):0;
  const needsPayment=price>0&&paidTypes.has(facts.listingType==='event'?'event':facts.tierPreference);
  const isAssisted=facts.postingFor==='someone_else';
  const safeResult=saved?.status;
  const isPublished=['published','scheduled'].includes(safeResult);
  const isPending=safeResult==='pending_approval';
  const showCheckout=safeResult==='payment_required';
  const openExistingCheckout=async data=>{
    if(!data?.checkout_url||!data?.session_id)throw new Error('Checkout session is missing. Review your saved draft.');
    if(window.self!==window.top)throw new Error('Open the published Yardit website to complete Stripe payment.');
    ensureCheckoutCanStart();
    const existing={formData:data.form_data,session_id:data.session_id,checkout_started_at:new Date().toISOString()};
    localStorage.setItem('yardit_paid_listing_checkout_v1',JSON.stringify(existing));
    if(data.handoff_id)localStorage.setItem(IOS_PENDING_KEY,data.handoff_id);
    await openCheckout(data.checkout_url);
  };
  const submit=async()=>{
    if(isAssisted&&!permission)return;
    if(needsPayment&&!refundAcknowledged)return;
    setRedirectError('');
    const data=await onComplete({
      homeowner_permission:isAssisted?permission:false,
      non_refund_acknowledged:needsPayment?refundAcknowledged:false,
      platform:checkoutPlatform(),
    });
    if(!data)return;
    setResult(data);
    if(data.status==='payment_required'){
      try{await openExistingCheckout(data);}catch(error){setRedirectError(error.message||'Unable to open checkout. Your session is saved.');}
    }
  };
  return <section className="space-y-4">
    <h2 className="text-lg font-semibold">Review and create your listing</h2>
    <AIListingSummary draft={draft} expandedInitially/>
    {draft.flyer?.file_uri&&<div className="rounded-xl border p-4">
      <p className="mb-2 text-sm font-medium">Original flyer</p>
      {draft.flyer.type==='application/pdf'?<a className="underline" href={draft.flyerPreview} target="_blank" rel="noreferrer">Open PDF flyer</a>:
        <img className="max-h-72 w-full object-contain" src={draft.flyerPreview} alt="Flyer for review"/>}
    </div>}
    {isPublished&&<div role="status" className="rounded-xl border p-4">
      <strong>{safeResult==='scheduled'?'Your listing was scheduled.':'Your listing was published.'}</strong>
      <p className="text-sm">Yardit confirmed the saved listing record.</p>
      <Link className="mt-2 block font-semibold underline" to={saved.listing_type==='holiday_lights'?'/HolidayLightsDetail?id='+encodeURIComponent(saved.listing_id):'/ListingDetail?id='+encodeURIComponent(saved.listing_id)}>View listing</Link>
    </div>}
    {isPending&&<div role="status" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <strong>Homeowner approval required</strong>
      <p className="text-sm">This listing is pending and is not public. The homeowner must sign in with their matching account email to approve it.</p>
      {saved.approval_url&&<><img className="mx-auto h-44 w-44" alt="Homeowner approval QR" src={'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data='+encodeURIComponent(saved.approval_url)}/><a className="block break-all font-semibold underline" href={saved.approval_url} target="_blank" rel="noreferrer">Open homeowner approval link</a></>}
    </div>}
    {showCheckout&&<div role="status" className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <strong>Payment required — {label(saved.amount_cents)}</strong>
      <p className="text-sm">A Stripe checkout session was created. Your listing is not published yet.</p>
      <Button type="button" disabled={busy} onClick={async()=>{try{setRedirectError('');await openExistingCheckout(saved);}catch(e){setRedirectError(e.message);}}}>Resume existing checkout</Button>
    </div>}
    {redirectError&&<p role="alert" className="text-sm text-red-700">{redirectError}</p>}
    {!saved&&<><div className="rounded-xl border bg-muted p-4 text-sm">
      <p><strong>Posting:</strong> {isAssisted?'For another homeowner; their approval is required.':needsPayment?'Paid listing':'Free listing or eligible promotion'}</p>
      {needsPayment&&<p className="mt-1 font-semibold">Standard price: {label(price)}. Payment is handled by secure Stripe checkout.</p>}
      {facts.listingType==='yard_sale'&&facts.tierPreference==='pre_spree'&&<p className="mt-1">Pre-Spree uses Yardit's official November 20–22, 2026 eligibility checks.</p>}
      {['neighborhood_sale','halloween_spot'].includes(facts.listingType)&&<p className="mt-2 font-semibold">This type requires its existing specialized setup; Ask Yardit will not publish it without those safeguards.</p>}
    </div>
    {!draft.details_confirmed?<label className="flex items-start gap-2 text-sm">
      <input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)} className="mt-1"/>
      I reviewed every detail and confirmed the map location.
    </label>:<p role="status" className="text-sm font-semibold">Listing details reviewed. Ready for the applicable posting process.</p>}
    {draft.details_confirmed&&isAssisted&&<label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={permission} onChange={e=>setPermission(e.target.checked)} className="mt-1"/>The homeowner has authorized the draft. They will separately approve it using their own account.</label>}
    {draft.details_confirmed&&needsPayment&&<label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={refundAcknowledged} onChange={e=>setRefundAcknowledged(e.target.checked)} className="mt-1"/>I understand paid listing charges are non-refundable under Yardit's listing terms and agree to continue to checkout.</label>}
    </>}
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={onBack} disabled={busy}>Back to conversation</Button>
      {!saved&&(!draft.details_confirmed?
        <Button type="button" disabled={busy||!reviewed} onClick={()=>onAction({action:'review',confirmed:true})}>{busy?'Saving…':'Confirm reviewed details'}</Button>:
        <Button type="button" disabled={busy||(isAssisted&&!permission)||(needsPayment&&!refundAcknowledged)||['neighborhood_sale','halloween_spot'].includes(facts.listingType)} onClick={submit}>{busy?'Submitting…':isAssisted?'Create homeowner approval QR':needsPayment?'Continue to secure checkout':'Create listing'}</Button>)}
    </div>
  </section>;
}
