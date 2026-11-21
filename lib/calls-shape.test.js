import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusOf, shapeRow, mergeMarks, toCsv } from './calls-shape.js';

test('status reflects the latest money state, then attempts', () => {
  assert.equal(statusOf(false, ''), 'Never tried to pay');
  assert.equal(statusOf(true, ''), 'Payment failed');
  assert.equal(statusOf(true, 'refunded'), 'Refunded');
  assert.equal(statusOf(true, 'refundPending'), 'Refund in progress');
});

test('rows are shaped and paid people are flagged for removal', () => {
  const r = shapeRow(['id-1', 'A', 'a@x.com', '9000000001', 'C', 'Pune', '2', '2026-11-20 14:02:11.1', '2026-11-21 09:15:59.9', 1, 'paid', 1]);
  assert.equal(r.paid, true);
  assert.equal(r.opens, 2);
  assert.equal(r.lastOpen, '2026-11-21 09:15');
  assert.equal(r.registered, true);
});

test('marks merge by id; unmarked and un-called rows stay unchecked', () => {
  const people = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const m = mergeMarks(people, { a: { called: true, at: '2026-11-21 10:00', by: 'Riya' }, b: { called: false, at: 'x', by: 'y' } });
  assert.deepEqual(m.map((p) => [p.called, p.calledBy]), [[true, 'Riya'], [false, ''], [false, '']]);
});

test('csv quotes cells and defuses formulas', () => {
  const csv = toCsv([{ called: true, calledBy: 'R', calledAt: 't', name: '=HYPERLINK("x")', phone: '+919000000001', email: 'a@x.com', college: 'C, D', city: '', status: 'Refunded', opens: 1, lastOpen: 'l', registered: false }]);
  const row = csv.split('\r\n')[1];
  assert.ok(row.includes(`"'=HYPERLINK(""x"")"`));
  assert.ok(row.includes(`"'+919000000001"`));
  assert.ok(row.includes('"C, D"'));
});
