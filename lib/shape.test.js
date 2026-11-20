import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFunnel, buildSegments, fillHours, fillDays, istHourKey, pace } from './shape.js';

const segRows = [
  ['Not signed in', 8000, 600, 0, 0],
  ['Outside student / public', 3800, 760, 120, 4],
  ['SST student', 900, 500, 0, 0],
  ['Scaler employee', 25, 9, 5, 0],
];
const paidRows = [['Outside student / public', 2, 1998]];

test('funnel excludes free SST/SSB students and finds the leak', () => {
  const f = buildFunnel(segRows, paidRows);
  const v = Object.fromEntries(f.stages.map((s) => [s.key, s.value]));
  assert.deepEqual(v, { visitors: 11825, signedIn: 3825, passPage: 769, checkout: 125, attempted: 4, paid: 2 });
  assert.equal(f.leakKey, 'attempted');
  assert.equal(f.revenue, 1998);
  assert.equal(f.stages[0].step, null);
  assert.equal(f.stages[4].lost, 121);
});

test('segments merge paid counts and flag free ones', () => {
  const s = buildSegments(segRows, paidRows);
  assert.equal(s[0].name, 'Not signed in');
  assert.equal(s.find((x) => x.name === 'SST student').free, true);
  assert.equal(s.find((x) => x.name === 'Outside student / public').paid, 2);
});

test('hour buckets are IST and zero-filled', () => {
  const now = Date.parse('2026-11-20T17:30:00Z'); // 23:00 IST
  assert.equal(istHourKey(now), '2026-11-20 23');
  const h = fillHours([['2026-11-20 22', 5, 1, 0, 0]], now, 3);
  assert.deepEqual(h.map((x) => x.key), ['2026-11-20 21', '2026-11-20 22', '2026-11-20 23']);
  assert.deepEqual(h[1].values, [5, 1, 0, 0]);
  assert.deepEqual(h[2].values, [0, 0, 0, 0]);
});

test('day buckets run from launch to today', () => {
  const d = fillDays([['2026-11-14', 3, 1, 0, 0]], '2026-11-13', Date.parse('2026-11-15T20:00:00Z'));
  assert.deepEqual(d.map((x) => x.key), ['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16']);
});

test('pace spreads the remaining target over days left', () => {
  const p = pace(100, 700, Date.parse('2026-11-29T18:29:59Z'), Date.parse('2026-11-23T18:30:00Z'));
  assert.deepEqual([p.daysLeft, p.remaining, p.perDay], [6, 600, 100]);
});
