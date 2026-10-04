import test from 'node:test';
import assert from 'node:assert/strict';
import { AirQualityPrediction } from '../src/models/entities/AirQualityPrediction.entity';

test('AirQualityPrediction can be instantiated with valid attributes', () => {
  const pred = new AirQualityPrediction();
  pred.type = 'daily';
  pred.algo = 'svr';
  pred.city = 'hanoi';
  pred.predictionData = { sample: 123 };
  pred.generatedAt = new Date();

  assert.equal(pred.type, 'daily');
  assert.equal(pred.algo, 'svr');
  assert.equal(pred.city, 'hanoi');
  assert(pred.generatedAt instanceof Date);
});
