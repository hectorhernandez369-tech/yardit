import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EVENT_CATEGORIES, EVENT_CATEGORY_GROUPS, SEASONAL_COMMUNITY_CARE_CATEGORIES,
  getDefaultEventIconForCategory} from '../eventListingConfig.js';

const names=['Free Community Meals','Toy Donation Drop-Off','Warming Center'];
test('three seasonal humanitarian categories are distinct and available to events',()=>{
 const group=EVENT_CATEGORY_GROUPS.find(g=>g.label==='Community Care & Winter Relief');
 assert.equal(group?.seasonal,true);
 assert.deepEqual(group?.categories,names);
 for(const name of names) {
   assert.equal(EVENT_CATEGORIES.filter(c=>c===name).length,1);
   assert.ok(SEASONAL_COMMUNITY_CARE_CATEGORIES[name]?.guidance);
   assert.notEqual(getDefaultEventIconForCategory(name),'calendar');
 }
});
test('seasonal group retains all the existing event categories without duplicates',()=>{
 const categories=EVENT_CATEGORY_GROUPS.flatMap(g=>g.categories);
 assert.equal(categories.length,new Set(categories).size);
 assert.deepEqual([...categories].sort(),[...EVENT_CATEGORIES].sort());
});
test('community care guidance never implies verified hours or bypasses existing schedule and payments',()=>{
 const details=readFileSync('src/components/create/event/EventDetailsStep.jsx','utf8');
 assert.match(details,/Here for our neighbors/);
 assert.match(details,/Only publish a date when service hours are/);
 assert.match(details,/one-day event listing/);
 const config=readFileSync('src/lib/eventListingConfig.js','utf8');
 assert.match(config,/RESIDENTIAL_EVENT_BASE_PRICE = 999/);
});
