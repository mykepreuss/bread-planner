import test from 'node:test';
import assert from 'node:assert/strict';
import { loafText } from './text.ts';

test('loaf counts read as one loaf or several loaves', () => {
  assert.equal(loafText(1), '1 loaf');
  assert.equal(loafText(2), '2 loaves');
  assert.equal(loafText(3), '3 loaves');
});
