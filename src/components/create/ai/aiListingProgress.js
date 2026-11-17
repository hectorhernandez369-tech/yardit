// One client-side explanation of why a saved AI draft can/cannot continue.
// Final validation still takes place on Yardit's server.
const LABELS={
  listingType:'listing type', title:'listing title', description:'event description',
  startDate:'start date',endDate:'end date',startTime:'start time',
  endTime:'closing time',postingFor:'who you are posting for',
  category:'event category',admission:'admission cost',tierPreference:'listing tier',
  christmasType:'Christmas display type',homeownerEmail:'organizer/homeowner contact email',
};

export function getAIListingProgress(draft={}) {
  const facts=draft.facts||{};
  const required=['listingType','title','description','startDate','endDate','startTime','endTime','postingFor',
    ...(facts.listingType==='event'?['category','admission']:[]),
    ...(facts.listingType==='yard_sale'?['tierPreference']:[]),
    ...(facts.listingType==='holiday_lights'?['christmasType']:[]),
    ...(facts.postingFor==='someone_else'?['homeownerEmail']:[])];
  const missing=required.filter(key=>!String(facts[key]??'').trim());
  const warnings=(draft.warnings||[]).filter(w=>typeof w==='string'&&w.trim());
  const blockedLocation=draft.location_confirmed!==true;
  let nextQuestion='';
  if(!facts.listingType)nextQuestion='What kind of listing are you creating?';
  else if(!facts.postingFor)nextQuestion='Are you posting for yourself or on behalf of an organizer?';
  else if(!facts.endTime)nextQuestion='What time does this listing end?';
  else if(!facts.description)nextQuestion='What would you like visitors to know about this listing?';
  else if(facts.postingFor==='someone_else'&&!facts.homeownerEmail)nextQuestion='What is the contact email for the organizer or homeowner?';
  else if(missing.length)nextQuestion='Can you confirm the '+(LABELS[missing[0]]||missing[0])+'?';
  else if(warnings.length)nextQuestion='Please clarify this before publishing: '+warnings[0];
  else if(blockedLocation)nextQuestion='Please confirm the address and map pin.';
  const ready=!missing.length&&!warnings.length&&!blockedLocation;
  return {
    missing,missingLabels:missing.map(key=>LABELS[key]||key),
    warnings,ready,nextQuestion,blockedLocation,
  };
}
