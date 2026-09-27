import test from 'node:test';
import assert from 'node:assert/strict';
import { airQualityApi, AirQualityApiError } from '../src/services/apiClient/airquality.api';

test('airQualityApi.getDailyForecast unwraps envelope on success', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        data: {
          city: 'hanoi',
          algo: 'svr',
          generated_at: '2026-09-25T07:00:00Z',
          horizon_days: 7,
          forecast: [{ date: '2026-09-26', aqi: 120.0, level: 'unhealthy_sensitive' }],
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  try {
    const res = await airQualityApi.getDailyForecast('svr');
    assert.equal(res.city, 'hanoi');
    assert.equal(res.forecast.length, 1);
    assert.equal(res.forecast[0].aqi, 120.0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('airQualityApi throws AirQualityApiError with status 503 when ML service is down', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: false,
        message: 'Dịch vụ AI/ML (ml-service) hiện không phản hồi. Vui lòng kiểm tra lại dịch vụ.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );

  try {
    await assert.rejects(
      async () => {
        await airQualityApi.getDailyForecast('svr');
      },
      (err: any) => {
        assert(err instanceof AirQualityApiError);
        assert.equal(err.status, 503);
        assert.match(err.message, /ml-service/);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
