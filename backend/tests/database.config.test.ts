import test from 'node:test';
import assert from 'node:assert/strict';
import { AppDataSource } from '../src/config/database.config';

test('AppDataSource is configured correctly for PostgreSQL with synchronize false', () => {
  assert.equal(AppDataSource.options.type, 'postgres');
  assert.equal(AppDataSource.options.synchronize, false);
  assert(Array.isArray(AppDataSource.options.entities));
});
