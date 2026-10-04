import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchHealthAdvice } from '../src/services/apiClient/healthAdvice.api.ts';

test('fetchHealthAdvice unwraps envelope and returns health advice data', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        data: {
          slot: 1234,
          generatedAt: '2026-10-03T10:00:00Z',
          rotatesAt: '2026-10-03T16:00:00Z',
          topics: [
            {
              id: 1,
              slug: 'children',
              titleVi: 'Trẻ em',
              titleEn: null,
              iconKey: 'Baby',
              riskLevel: 'high',
              displayOrder: 1,
              items: [{ id: 10, contentVi: 'Khuyến cáo mẫu', contentEn: null }],
              sources: [],
            },
          ],
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  try {
    const res = await fetchHealthAdvice();
    assert.equal(res.slot, 1234);
    assert.equal(res.topics.length, 1);
    assert.equal(res.topics[0].slug, 'children');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
