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
  // Prioritize just one genuinely missing answer. The map and final payment
  // confirmation remain separate, explicit actions.
  const nextField=(
    !facts.listingType?'listingType':
    !facts.postingFor?'postingFor':
    !facts.endTime?'endTime':
    !facts.description?'description':
    facts.postingFor==='someone_else'&&!facts.homeownerEmail?'homeownerEmail':
    missing[0]||''
  );
  const QUESTIONS={
    listingType:'What are you posting?',
    postingFor:'Are you posting for yourself or an organizer?',
    endTime:'What time does this listing end?',
    description:'What would you like visitors to know?',
    homeownerEmail:'What is the organizer or homeowner contact email?',
  };
  const nextQuestion=nextField ? QUESTIONS[nextField]||'Please confirm the '+(LABELS[nextField]||nextField)+'.'
    : warnings.length?'Please clarify: '+warnings[0]
    : blockedLocation?'Confirm the address and map pin.':'';
  const ready=!missing.length&&!warnings.length&&!blockedLocation;
  return {
    missing,missingLabels:missing.map(key=>LABELS[key]||key),
    warnings,ready,nextQuestion,nextField,blockedLocation,
  };
}
