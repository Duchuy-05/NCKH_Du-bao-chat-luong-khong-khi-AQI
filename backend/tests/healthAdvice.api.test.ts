import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { connectDatabase, AppDataSource } from '../src/config/database.config';
import healthAdviceRouter from '../src/routers/healthAdvice.router';

test('GET /api/health-advice returns 200 with ApiEnvelope and Cache-Control header', async () => {
  await connectDatabase();
  const app = express();
  app.use('/api/health-advice', healthAdviceRouter);

  const server = app.listen(0);
  const address = server.address() as any;
  const port = address.port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health-advice`);
    assert.equal(res.status, 200);
    assert(res.headers.get('cache-control')?.includes('max-age'));

    const body: any = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.topics.length, 8);
    assert(typeof body.data.slot === 'number');
  } finally {
    server.close();
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
});
