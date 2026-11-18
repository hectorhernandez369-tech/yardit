import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Step One shows a natural-language, editable example without posting it automatically',()=>{
  const content=readFileSync('src/components/create/ai/AIListingEntry.jsx','utf8');
  assert.match(content,/Example of what you can type:/);
  assert.match(content,/EXAMPLE_IDEA = "I want to post a Christmas light show in Porterville/);
  assert.match(content,/onClick=\{\(\)=>\{setMessage\(EXAMPLE_IDEA\);activate\(\);\}\}/);
  assert.match(content,/you can edit it/);
  assert.match(content,/onSend=\{start\}/);
  assert.doesNotMatch(content,/onClick=\{start\}.*EXAMPLE_IDEA/);
});
