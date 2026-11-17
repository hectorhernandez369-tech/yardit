import test from 'node:test';
import assert from 'node:assert/strict';
import {getAIListingProgress} from '../../components/create/ai/aiListingProgress.js';
const event={
 facts:{listingType:'event',title:'Lindsay Tree Lighting',description:'Parade and celebration',
 startDate:'2026-12-04',endDate:'2026-12-04',startTime:'17:45',endTime:'20:00',
 postingFor:'someone_else',category:'Holiday Celebration',admission:'Free',
 homeownerEmail:'organizer@example.org'},location_confirmed:true,warnings:[]
};
test('confirmed map still shows missing details and next question',()=>{
 const x=getAIListingProgress({...event,facts:{...event.facts,endTime:'',homeownerEmail:''}});
 assert.equal(x.ready,false);assert.equal(x.blockedLocation,false);
 assert.deepEqual(x.missing,['endTime','homeownerEmail']);
 assert.match(x.nextQuestion,/What time/);
});
test('ready requires all fields and confirmed map',()=>assert.equal(getAIListingProgress(event).ready,true));
test('approval uncertainty remains a blocker',()=>{
 const x=getAIListingProgress({...event,warnings:['Organizer approval not confirmed']});
 assert.equal(x.ready,false);assert.match(x.nextQuestion,/Organizer approval/);
});
test('chat never substitutes for map confirmation',()=>{
 const x=getAIListingProgress({...event,location_confirmed:false});
 assert.equal(x.ready,false);assert.match(x.nextQuestion,/map pin/);
});
