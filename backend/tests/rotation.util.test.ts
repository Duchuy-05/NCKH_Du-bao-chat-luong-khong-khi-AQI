import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRotation } from '../src/utils/rotation.util';

test('calculateRotation computes 6-hour slots aligned with Vietnam Time (UTC+7)', () => {
  // 2026-10-03T16:59:59Z = 23:59:59 VN (slot trước 00h)
  const t1 = new Date('2026-10-03T16:59:59Z').getTime();
  const r1 = calculateRotation(t1);

  // 2026-10-03T17:00:00Z = 00:00:00 VN ngày mới (slot 00h)
  const t2 = new Date('2026-10-03T17:00:00Z').getTime();
  const r2 = calculateRotation(t2);

  assert.equal(r2.slot, r1.slot + 1);
  assert(r1.rotatesAt.getTime() > t1);
  assert(r1.secondsRemaining > 0 && r1.secondsRemaining <= 21600);
});
