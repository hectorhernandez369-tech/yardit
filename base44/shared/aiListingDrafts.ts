export const AI_EMAILS = ['hectorhernandez369@gmail.com', 'luisamedellin7@gmail.com'];
export const FACT_FIELDS = ['listingType','title','description','category','startDate','endDate','startTime','endTime','address','city','state','zip','postingFor','homeownerName','homeownerEmail','tierPreference','admission','christmasType'];
export const LISTING_TYPES = ['yard_sale','neighborhood_sale','event','holiday_lights','halloween_spot'];
export const fail = (error, status = 400) => Response.json({error}, {status});
export const inputError = message => Object.assign(new Error(message), {status:400});
export async function aiUser(base44) {
  const user = await base44.auth.me().catch(e => e.status === 401 ? null : Promise.reject(e));
  return user?.id && user.email_verified !== false && AI_EMAILS.includes(String(user.email || '').trim().toLowerCase()) ? user : null;
}
export async function ownDraft(base44, user, id) {
  if (typeof id !== 'string' || !id || id.length > 100) return null;
  const rows = await base44.asServiceRole.entities.AIListingDraft.filter({id, owner_user_id:user.id}, '-created_date', 1);
  return rows[0] || null;
}
export async function lockDraft(base44, draft, revision) {
  if (revision !== draft.revision) return null;
  const token = crypto.randomUUID(), now = new Date().toISOString();
  const result = await base44.asServiceRole.entities.AIListingDraft.updateMany({id:draft.id, owner_user_id:draft.owner_user_id, revision, $or:[{lock_token:''},{lock_until:{$lt:now}}]}, {$set:{lock_token:token, lock_until:new Date(Date.now()+360000).toISOString()}});
  return result.updated === 1 ? token : null;
}
export async function finishDraft(base44, draft, token, changes) {
  const result = await base44.asServiceRole.entities.AIListingDraft.updateMany({id:draft.id, lock_token:token, revision:draft.revision}, {$set:{...changes, revision:draft.revision+1, lock_token:'', lock_until:''}});
  if(result.updated !== 1) throw new Error('Draft changed in another window. Reload before continuing.');
  return ownDraft(base44, {id:draft.owner_user_id}, draft.id);
}
export async function unlockDraft(base44, draft, token) {
  await base44.asServiceRole.entities.AIListingDraft.updateMany({id:draft.id, lock_token:token}, {$set:{lock_token:'',lock_until:''}});
}
export async function draftView(base44, draft) {
  let flyerPreview = '';
  if(draft.flyer?.file_uri) {
    const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:draft.flyer.file_uri, expires_in:900});
    flyerPreview = signed.signed_url;
  }
  return {...draft, flyerPreview};
}
export function missingDraftFacts(facts = {}) {
  const fields = ['listingType','title','description','startDate','endDate','startTime','endTime','postingFor'];
  if (facts.listingType === 'holiday_lights') fields.push('christmasType');
  if (facts.listingType === 'event') fields.push('admission');
  if (facts.postingFor === 'someone_else') fields.push('homeownerEmail');
  return fields.filter(key=>!String(facts[key] ?? '').trim());
}
export function validateAIListingFacts(facts = {}) {
  const missing = missingDraftFacts(facts);
  if (missing.length) return 'Please answer: ' + missing.join(', ') + '.';
  if (!LISTING_TYPES.includes(facts.listingType)) return 'Choose a valid Yardit listing type.';
  if (!['self','someone_else'].includes(facts.postingFor)) return 'Clarify who you are posting for.';
  if (facts.postingFor === 'someone_else' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(facts.homeownerEmail||''))) return 'Provide a valid homeowner contact email.';
  const dates = [facts.startDate, facts.endDate];
  for (const date of dates) {
    const checked = new Date(date+'T12:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(+checked) || checked.toISOString().slice(0,10)!==date) return 'Confirm complete valid dates and years.';
  }
  if (facts.startDate > facts.endDate) return 'The end date cannot precede the start date.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(facts.startTime||'') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(facts.endTime||'')) return 'Confirm opening and closing times.';
  if (facts.startDate === facts.endDate && facts.startTime >= facts.endTime) return 'Closing time must be after opening time on the same day.';
  if (facts.listingType === 'holiday_lights' && !['christmas_decorations','christmas_lights','light_show','christmas_experience'].includes(facts.christmasType)) return 'Choose a valid Christmas display type.';
  if (facts.listingType === 'holiday_lights' && (facts.startDate.slice(5) < '11-01' && facts.startDate.slice(5) > '01-02')) return 'Christmas dates must be November 1 through January 2.';
  if (facts.listingType === 'event' && !facts.category) return 'Choose the event category before submission.';
  return null;
}