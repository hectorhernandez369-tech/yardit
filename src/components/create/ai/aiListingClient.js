import { base44 } from '@/api/base44Client';
export const canUseAIListing = user => Boolean(user?.id && ['hectorhernandez369@gmail.com','luisamedellin7@gmail.com'].includes(String(user.email||'').trim().toLowerCase()));
export const AI_TYPE_LABELS = {yard_sale:'Yard sale',neighborhood_sale:'Neighborhood sale',event:'Event',holiday_lights:'Christmas / holiday display',halloween_spot:'Halloween spot'};
export async function aiDraftCall(data, functionName = 'manageAIListingDraft') {
  const response = await base44.functions.invoke(functionName, data);
  if(response.data?.error) throw new Error(response.data.error);
  return response.data;
}
export const aiError = error => error?.response?.data?.error || error?.message || 'Could not save your changes. Please try again.';