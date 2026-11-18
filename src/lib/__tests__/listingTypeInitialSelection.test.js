import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import createListingInitialData from '../../components/create/createListingInitialData.js';

const read=p=>readFileSync(p,'utf8');
test('new posting starts without a preselected listing type',()=>{
 const initial=createListingInitialData();
 assert.equal(initial.listingType,'');
 assert.equal(initial.title,'');
 assert.equal(initial.event_name,'');
});
test('Step One uses the actual selection, not an implicit Yard Sale',()=>{
 const source=read('src/components/create/StepOne.jsx');
 assert.match(source,/const listingType = formData\?\.listingType \|\| ""/);
 assert.match(source,/value=\{listingType\}/);
 assert.match(source,/isSelected && !isNeighborhood/);
});
test('unselected step renders the chooser but not a Continue action',()=>{
 const page=read('src/pages/CreateListing.jsx');
 assert.match(page,/step===1 && !formData\.listingType && \(/);
 assert.match(page,/!\(step===1 && !formData\.listingType\)/);
 assert.match(page,/if\(step===1 && !formData\.listingType\)/);
});
test('Holiday Lights matches the other options with an unselected radio dot, keeping existing navigation',()=>{
 const choice=read('src/components/create/ChristmasListingChoice.jsx');
 assert.match(choice,/rounded-full border-2/);
 assert.match(choice,/aria-hidden="true"/);
 assert.match(choice,/navigate\(assisted \? "\/CreateHolidayLights\?assisted=1" : "\/CreateHolidayLights"\)/);
});
test('explicit Yard Sale links and resume/relist types remain available',()=>{
 const page=read('src/pages/CreateListing.jsx');
 assert.match(page,/discovery_promo_code: normalizedPromoCode/);
 assert.match(page,/setFormData\(\(prev\) => \(\{\s*\.\.\.prev,\s*listingType: "yard_sale"/);
 assert.match(page,/relistPrefillTier/);
});
