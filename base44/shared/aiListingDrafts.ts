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
export function missingDraftFacts(facts) {
  return ['listingType','title','description','startDate','endDate','startTime','endTime','postingFor'].filter(key=>!facts[key]);
}