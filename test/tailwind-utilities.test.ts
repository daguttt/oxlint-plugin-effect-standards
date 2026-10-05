import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isUtilityList } from '../src/tailwind-utilities.ts';

await test('recognises utilities from the UI and frontend stylesheets', () => {
  assert.equal(isUtilityList('sticky left-0 z-20 bg-background'), true);
  assert.equal(isUtilityList('border-label-red/40 bg-label-red/12'), true);
  assert.equal(isUtilityList('text-base! size-4.5 2xl:grid-cols-4'), true);
  assert.equal(isUtilityList('no-underline hyphens-auto'), true);
  assert.equal(isUtilityList('group flex items-center peer/menu'), true);
});

await test('rejects prose, CSS values and single words', () => {
  assert.equal(isUtilityList('table-driven tests for hidden fields'), false);
  assert.equal(isUtilityList('border-box, content-box'), false);
  assert.equal(isUtilityList('uppercase slug'), false);
  assert.equal(isUtilityList('inline flex'), false);
  assert.equal(isUtilityList('flex items-center my-custom-class'), false);
  assert.equal(isUtilityList('outline'), false);
  assert.equal(isUtilityList(''), false);
});
