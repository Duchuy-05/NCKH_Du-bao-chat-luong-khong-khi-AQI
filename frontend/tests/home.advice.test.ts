import test from 'node:test';
import assert from 'node:assert/strict';
import type { HealthAdviceTopic } from '../src/types/healthAdvice.types.ts';

test('HealthAdviceTopic data can be partitioned into 2 pages with 4 cards each', () => {
  const mockTopics: HealthAdviceTopic[] = Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    slug: `topic-${i + 1}`,
    titleVi: `Nhóm ${i + 1}`,
    titleEn: null,
    iconKey: 'Baby',
    riskLevel: 'moderate',
    displayOrder: i + 1,
    items: [],
    sources: [],
  }));

  const page1 = mockTopics.slice(0, 4);
  const page2 = mockTopics.slice(4, 8);

  assert.equal(page1.length, 4);
  assert.equal(page2.length, 4);
  assert.equal(page1[0].displayOrder, 1);
  assert.equal(page2[3].displayOrder, 8);
});
