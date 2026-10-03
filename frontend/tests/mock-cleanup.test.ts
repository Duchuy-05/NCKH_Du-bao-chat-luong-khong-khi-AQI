import test from 'node:test';
import assert from 'node:assert/strict';
import * as mockModule from '../src/data/mockAirData.ts';

test('HEALTH_GROUPS_ADVICE is completely removed from mockAirData', () => {
  assert.equal('HEALTH_GROUPS_ADVICE' in mockModule, false);
});
