import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Linter } from 'eslint';

const file = 'src/components/create/AIListingFlow.jsx';
test('AI listing flow has no missing JS globals, including React hooks', () => {
  const src = readFileSync(file, 'utf8');
  const linter = new Linter();
  const errors = linter.verify(src, [{
    files: ['**/*.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: { 'no-undef': 'error' },
  }], { filename: file });
  assert.deepEqual(errors.map(({ruleId,line,message})=>({ruleId,line,message})),[]);
});

test('AI listing route has a recoverable rendering error screen', () => {
  const page = readFileSync('src/pages/CreateListingAI.jsx', 'utf8');
  const boundary = readFileSync('src/components/create/ai/AIListingErrorBoundary.jsx', 'utf8');
  assert.match(page, /<AIListingErrorBoundary/);
  assert.match(boundary, /My saved AI drafts/);
  assert.match(boundary, /Reload AI draft/);
});
