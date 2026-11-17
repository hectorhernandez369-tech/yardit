// Presentation-only explanation of fields the trusted server requires.
// This does not bypass validateAIListingFacts or any submission rules.
export const AI_FACT_LABELS = Object.freeze({
  listingType: 'listing type',
  title: 'listing name',
  description: 'description',
  startDate: 'start date',
  endDate: 'end date',
  startTime: 'start time',
  endTime: 'closing time',
  postingFor: 'who you are posting for',
  category: 'event category',
  admission: 'admission',
  christmasType: 'Christmas display type',
  tierPreference: 'listing tier',
  homeownerEmail: 'organizer or homeowner contact email',
});

export function missingAIListingFacts(facts = {}) {
  const required = ['listingType','title','description','startDate','endDate','startTime','endTime','postingFor'];
  if(facts.listingType==='event') required.push('category','admission');
  if(facts.listingType==='holiday_lights') required.push('christmasType');
  if(facts.listingType==='yard_sale') required.push('tierPreference');
  if(facts.postingFor==='someone_else') required.push('homeownerEmail');
  return required.filter(key=>!String(facts[key]??'').trim());
}

export function remainingAIListingSteps(draft = {}) {
  const missing=missingAIListingFacts(draft.facts||{});
  const warnings=(draft.warnings||[]).filter(item=>typeof item==='string'&&item.trim());
  return {missing,warnings,ready:!!draft.location_confirmed && !missing.length && !warnings.length};
}

export function nextAIPrompt(draft = {}) {
  const {missing,warnings}=remainingAIListingSteps(draft);
  const fields=missing.map(field=>AI_FACT_LABELS[field]||field);
  return [
    'I have confirmed the actual map location for this listing.',
    'Please continue helping me finish the listing, asking just ONE clear question at a time.',
    'Do not ask to confirm the location again unless I change it.',
    fields.length?'Required details still missing: '+fields.join(', ')+'.':'All required fields appear filled.',
    warnings.length?'There are unresolved clarifications: '+warnings.join('; '):'No listed clarifications.',
    'Please check the details already collected, do not invent answers, and guide me to the next required answer.'
  ].join(' ');
}
