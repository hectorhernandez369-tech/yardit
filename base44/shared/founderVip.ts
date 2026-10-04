export async function hasResidentialVip(base44, userId) {
  if (!userId) return false;
  const rows = await base44.asServiceRole.entities.FounderMembership.filter({ user_id: userId, active: true, residential_vip: true });
  return rows.length > 0;
}
export const eligibleFounderListing = (listing) => ['yard_sale', 'event'].includes(listing?.listingType) && !listing?.assisted_listing && !listing?.created_by_admin && !listing?.assisted_listing_id;
export const founderWaiver = { pricePaid: 0, payment_status: 'waived', payment_intent_status: 'none', pending_checkout_session_id: '', pending_payment_tier: '' };
export function founderUpgradePatch(listing, body) {
  if (body.event_add_on_purchase === true) {
    if (listing.listingType !== 'event') throw new Error('Add-ons require a community event');
    const keys = ['premium_visibility', 'animation', 'flyer_upload', 'photo_gallery', 'custom_icon', 'marquee'];
    if (!Array.isArray(body.add_on_keys) || !body.add_on_keys.length || body.add_on_keys.some(k => !keys.includes(k))) throw new Error('Invalid add-on selection');
    const source = body.add_on_patch || {};
    const fields = ['event_animation', 'event_flyer_url', 'event_photo_gallery_count', 'event_photos', 'photoUrls', 'event_icon', 'event_logo_url', 'marquee_schedule_slots'];
    const patch = Object.fromEntries(fields.filter(k => source[k] !== undefined).map(k => [k, source[k]]));
    patch.event_add_ons = { ...(listing.event_add_ons || {}), ...Object.fromEntries(body.add_on_keys.map(k => [k, true])) };
    return patch;
  }
  const tiers = listing.listingType === 'event' ? ['basic', 'featured', 'premium', 'marquee'] : ['free', 'featured', 'premium'];
  const target = String(body.target_tier || '').toLowerCase();
  const current = listing.event_tier || listing.tier || tiers[0];
  if (!tiers.includes(target) || tiers.indexOf(target) <= tiers.indexOf(current)) throw new Error('Invalid upgrade tier');
  return listing.listingType === 'event' ? { tier: target, event_tier: target } : { tier: target };
}