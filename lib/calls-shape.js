// Pure helpers for the call list (no I/O), so they are unit-tested in calls-shape.test.js.

export function statusOf(attempted, lastMoney) {
  if (lastMoney === 'refunded') return 'Refunded';
  if (lastMoney === 'refundPending' || lastMoney === 'refundFailed') return 'Refund in progress';
  if (attempted) return 'Payment failed';
  return 'Never tried to pay';
}

// PostHog returns timestamps in the project timezone (IST) as 'YYYY-MM-DD HH:MM:SS.ffffff'.
export const shapeRow = (r) => ({
  id: r[0], name: r[1], email: r[2], phone: r[3], college: r[4], city: r[5],
  opens: Number(r[6]) || 0, firstOpen: r[7].slice(0, 16), lastOpen: r[8].slice(0, 16),
  status: statusOf(Number(r[9]) === 1 || r[9] === true, r[10]), registered: Number(r[11]) === 1,
  paid: r[10] === 'paid',
});

// Merge the cached list with live marks. Pure, so it is unit-tested.
export function mergeMarks(people, marks) {
  return people.map((p) => ({ ...p, called: marks[p.id]?.called ?? false, calledAt: marks[p.id]?.called ? marks[p.id].at : '', calledBy: marks[p.id]?.called ? marks[p.id].by : '' }));
}

const csvCell = (v) => {
  const s = String(v ?? '');
  // Quote everything and neutralise spreadsheet formulas (=, +, -, @) so a name can't run as a formula.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replaceAll('"', '""')}"`;
};
export function toCsv(rows) {
  const cols = [['Called', (r) => (r.called ? 'Yes' : 'No')], ['Called by', 'calledBy'], ['Called at (IST)', 'calledAt'], ['Name', 'name'], ['Phone', 'phone'], ['Email', 'email'], ['College', 'college'], ['City', 'city'], ['Status', 'status'], ['Times opened checkout', 'opens'], ['Last opened (IST)', 'lastOpen'], ['Registered for an event', (r) => (r.registered ? 'Yes' : 'No')]];
  const get = (r, c) => (typeof c === 'function' ? c(r) : r[c]);
  return [cols.map((c) => csvCell(c[0])).join(','), ...rows.map((r) => cols.map((c) => csvCell(get(r, c[1]))).join(','))].join('\r\n');
}
