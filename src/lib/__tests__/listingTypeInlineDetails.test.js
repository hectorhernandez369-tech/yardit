import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('yard sale details are rendered with the selected listing card, not after all the choices',()=>{
  const text=readFileSync('src/components/create/StepOne.jsx','utf8');
  const choice=text.indexOf('className={`relative rounded-xl border transition-all');
  const details=text.indexOf('data-listing-type-details={value}');
  const radioEnd=text.indexOf('</RadioGroup>',choice);
  const title=text.indexOf('htmlFor="title"',details);
  const categories=text.indexOf('Categories <span',details);
  const description=text.indexOf('htmlFor="description"',details);
  assert.ok(choice>=0 && details>choice && title>details && categories>details && description>details);
  assert.ok(description<radioEnd,'Details should appear within selection area before closing its group');
  assert.match(text, /isSelected && !isNeighborhood/);
  assert.match(text, /formData\.categories\.map/);
  assert.match(text, /description: limitText/);
});

test('event name, description, and category are under the selected Event option',()=>{
  const text=readFileSync('src/components/create/event/EventDetailsStep.jsx','utf8');
  const details=text.indexOf('const eventDetails = (');
  assert.ok(details>=0);
  for(const label of ['htmlFor="event_name"','htmlFor="event_description"','Event Category']) {
    assert.ok(text.indexOf(label,details)>details, label);
  }
  const radioEnd=text.indexOf('</RadioGroup>');
  const inline=text.indexOf('{eventDetails}',text.indexOf('return (',details));
  assert.ok(inline>details && inline<radioEnd);
  assert.match(text,/option\.value === "event" && selected/);
  assert.match(text,/setFormData\(\(prev\) => \(\{ \.\.\.prev, event_name: e\.target\.value/);
  assert.match(text,/getDefaultEventIconForCategory\(value\)/);
});
