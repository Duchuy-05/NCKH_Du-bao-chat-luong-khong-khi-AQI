import test from 'node:test';
import assert from 'node:assert/strict';
import { AppDataSource, connectDatabase } from '../src/config/database.config';
import { healthAdviceService } from '../src/services/healthAdvice.service';

test('HealthAdviceService returns 8 topics with maximum 4 items each and sources', async () => {
  await connectDatabase();
  try {
    const res = await healthAdviceService.getHealthAdvice(new Date('2026-10-03T12:00:00Z').getTime());
    assert.equal(res.topics.length, 8);
    for (const topic of res.topics) {
      assert(topic.items.length <= 4 && topic.items.length > 0);
      assert(Array.isArray(topic.sources));
    }
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
});
