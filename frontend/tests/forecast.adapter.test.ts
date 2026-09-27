import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toDisplayDailyCards,
  toDisplayHourlyCards,
  toChartData,
  formatWeekday,
} from '../src/adapters/forecast.adapter';

test('formatWeekday returns correct Vietnamese and English weekday', () => {
  // 2026-09-26 is a Saturday
  const vi = formatWeekday('2026-09-26', 'vi');
  const en = formatWeekday('2026-09-26', 'en');
  assert.equal(vi, 'Thứ 7');
  assert.equal(en, 'Sat');
});

test('toDisplayDailyCards handles null level by falling back to getAQICategory', () => {
  const points = [
    { date: '2026-09-26', aqi: 45.0, level: null },
    { date: '2026-09-27', aqi: 155.0, level: 'unhealthy' as const },
  ];
  const cards = toDisplayDailyCards(points, 'vi');

  assert.equal(cards.length, 2);
  assert.equal(cards[0].level, 'good'); // 45 AQI is good
  assert.equal(cards[0].dayOfWeekVi, 'Thứ 7');
  assert.equal(cards[1].level, 'unhealthy');
});

test('toDisplayHourlyCards formats timestamps into HH:mm', () => {
  const points = [
    { timestamp: '2026-09-25T10:00:00Z', aqi: 90.0, level: null },
  ];
  const cards = toDisplayHourlyCards(points);
  assert.equal(cards.length, 1);
  assert.match(cards[0].timeStr, /^\d{2}:\d{2}$/);
  assert.equal(cards[0].level, 'moderate');
});

test('toChartData formats data for Recharts', () => {
  const points = [
    { date: '2026-09-26', aqi: 125.4, level: null },
  ];
  const chartData = toChartData(points, 'vi');
  assert.equal(chartData.length, 1);
  assert.equal(chartData[0].aqi, 125);
  assert.equal(chartData[0].dayOfWeek, 'Thứ 7');
});
