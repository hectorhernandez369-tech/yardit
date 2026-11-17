import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Linter} from 'eslint';

const read=file=>readFileSync(file,'utf8');
const entry='src/components/create/ai/AIListingEntry.jsx';
const inline='src/components/create/ai/AIListingInlineSession.jsx';
const source=[entry,inline,'src/components/create/ai/AIListingConversation.jsx'];
test('inline Ask Yardit UI has no missing JSX globals',()=>{
  const linter=new Linter();
  for(const file of source){
    const errors=linter.verify(read(file),[{
      files:['**/*.jsx'],languageOptions:{ecmaVersion:'latest',sourceType:'module',globals:{crypto:'readonly',URL:'readonly',window:'readonly'},parserOptions:{ecmaFeatures:{jsx:true}}},
      rules:{'no-undef':'error'}
    }],{filename:file});
    assert.deepEqual(errors.map(({line,message})=>({line,message})),[],file);
  }
});
test('new initial message stays within Step One and auto-starts AI reply',()=>{
  const entryCode=read(entry),chatCode=read(inline),hook=read('src/components/create/ai/useAIListingDraft.js');
  assert.match(entryCode,/setId\(response\.draft\.id\)/);
  assert.match(entryCode,/Send to Ask Yardit/);
  assert.match(entryCode,/setOpen\(true\);onActiveChange\?\.\(true\)/);
  assert.doesNotMatch(entryCode,/navigate\(/);
  assert.match(chatCode,/send\(''\)/);
  assert.match(chatCode,/autoStarted\.current\.add\(id\)/);
  assert.match(hook,/initial_request_id/);
  assert.match(chatCode,/AIListingConversation model=\{model\} inline/);
});
test('AI-only view hides competing manual steps and actions',()=>{
  const parent=read('src/pages/CreateListing.jsx'),step=read('src/components/create/StepOne.jsx'),event=read('src/components/create/CreateListingEvent.jsx');
  assert.match(step,/!aiActive &&/);
  assert.match(event,/!aiActive&&<EventDetailsStep/);
  assert.match(parent,/!\(step===1 && aiChatActive\)/);
  assert.match(parent,/onAIActiveChange=\{setAiChatActive\}/);
});
test('restricted account access and server-owned submission remain',()=>{
  assert.match(read(entry),/canUseAIListing\(user\)/);
  assert.match(read(inline),/onComplete=\{model\.complete\}/);
  assert.match(read('base44/functions/draftAssistedEventAI/entry.ts'),/courthouse, school, park/);
});
