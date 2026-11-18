import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EVENT_CATEGORIES,EVENT_CATEGORY_GROUPS,getDefaultEventIconForCategory} from '../eventListingConfig.js';

const ordered=(a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'});
test('all original event categories remain available exactly once in groups',()=>{
  const values=EVENT_CATEGORY_GROUPS.flatMap(group=>group.categories);
  assert.equal(values.length,EVENT_CATEGORIES.length);
  assert.equal(new Set(values).size,values.length);
  assert.deepEqual([...values].sort(ordered),[...EVENT_CATEGORIES].sort(ordered));
});
test('group headings and every group\'s options are alphabetical',()=>{
  const headings=EVENT_CATEGORY_GROUPS.map(group=>group.label);
  assert.deepEqual(headings,[...headings].sort(ordered));
  for(const group of EVENT_CATEGORY_GROUPS) {
    assert.deepEqual(group.categories,[...group.categories].sort(ordered),group.label);
  }
});
test('existing category icon mappings and saved values are unchanged',()=>{
  for(const category of EVENT_CATEGORIES){
    assert.equal(typeof getDefaultEventIconForCategory(category),'string');
    assert.ok(getDefaultEventIconForCategory(category));
  }
  const ui=readFileSync('src/components/create/event/EventDetailsStep.jsx','utf8');
  assert.match(ui,/<SelectGroup key=\{group.label\}>/);
  assert.match(ui,/<SelectLabel/);
  assert.match(ui,/value=\{category\}/);
  assert.match(ui,/event_category: value/);
  assert.match(ui,/getDefaultEventIconForCategory\(category\)/);
});
