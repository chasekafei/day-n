import test from 'node:test';
import assert from 'node:assert/strict';
import { countSpecialNumbers, dateDifference, daysSince, eventsForFocus, nextMilestone, titleForDays } from '../src/domain.ts';

test('date calculations include the starting day by default', () => {
  assert.equal(daysSince('2024-07-30', '2024-07-30'), 1);
  assert.equal(daysSince('2024-07-30', '2024-07-31'), 2);
  assert.equal(daysSince('2024-07-30', '2024-07-31', false), 1);
});

test('calendar differences handle leap years and cross-year dates', () => {
  assert.equal(dateDifference('2024-02-28', '2024-03-01'), 2);
  assert.equal(dateDifference('2023-12-31', '2024-01-01'), 1);
  assert.equal(dateDifference('2024-07', '2024-07-30'), null);
});

test('title thresholds and milestones use the reviewed fan-day numbers', () => {
  assert.equal(titleForDays(511).title, '511 资深观众');
  assert.equal(titleForDays(1104).title, '1104 元老');
  assert.equal(nextMilestone(1100).remaining, 4);
  assert.deepEqual(countSpecialNumbers('2024-07-30', '2025-12-23'), [511]);
});

test('event filters keep each focus scoped and hide incidents', () => {
  const shatou = eventsForFocus('shatou');
  assert.ok(shatou.length > 0);
  assert.ok(shatou.every(item => item.who === '双人'));
  assert.ok(!shatou.some(item => item.type.includes('纪事')));
  assert.ok(eventsForFocus('wang-chuqin').some(item => item.who === '王楚钦'));
});
