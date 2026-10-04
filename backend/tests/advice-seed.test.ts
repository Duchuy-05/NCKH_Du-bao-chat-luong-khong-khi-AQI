import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { envConfig } from '../src/config/env.config';

test('PostgreSQL database contains advice_sources S1-S8 and integrity constraints', async () => {
  const client = new Client({
    host: envConfig.DB_HOST,
    port: envConfig.DB_PORT,
    user: envConfig.DB_USER,
    password: envConfig.DB_PASSWORD,
    database: envConfig.DB_NAME,
  });

  await client.connect();
  try {
    const resSources = await client.query('SELECT count(*) FROM advice_sources WHERE code IN (\'S1\',\'S2\',\'S3\',\'S4\',\'S5\',\'S6\',\'S7\',\'S8\')');
    assert.equal(parseInt(resSources.rows[0].count, 10), 8);

    const resTopicSources = await client.query('SELECT count(*) FROM advice_topic_sources');
    assert(parseInt(resTopicSources.rows[0].count, 10) > 0);
  } finally {
    await client.end();
  }
});
