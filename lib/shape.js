// Pure functions that turn PostHog rows into dashboard numbers. No I/O, so they're unit-tested.

export const FREE_SEGMENTS = ['SST student', 'SSB student'];
export const ANON = 'Not signed in';

const sum = (rows, i) => rows.reduce((a, r) => a + (Number(r[i]) || 0), 0);
export const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0);

// segRows: [seg, visitors, passPage, checkout, attempted]; paidRows: [seg, kept, revenue]
export function buildFunnel(segRows, paidRows) {
  const paying = segRows.filter((r) => !FREE_SEGMENTS.includes(r[0]));
  const payingPaid = paidRows.filter((r) => !FREE_SEGMENTS.includes(r[0]));
  // Each step is a subset of the one above: buying needs an account, so pass-page visitors
  // who never signed in are left out of step 3 (they show up in the segments table instead).
  const signedIn = paying.filter((r) => r[0] !== ANON);
  const stages = [
    { key: 'visitors', label: 'Visited the site', hint: 'Anyone who loaded a page', value: sum(paying, 1) },
    { key: 'signedIn', label: 'Signed in', hint: 'Has an account email', value: sum(signedIn, 1) },
    { key: 'passPage', label: 'Opened the pass page', hint: 'Signed in, visited /pass', value: sum(signedIn, 2) },
    { key: 'checkout', label: 'Opened Razorpay checkout', hint: 'fest_pass_window_opened', value: sum(paying, 3) },
    { key: 'attempted', label: 'Tried to pay', hint: 'UPI / card attempt reached Razorpay', value: sum(paying, 4) },
    { key: 'paid', label: 'Bought the pass', hint: 'Paid and not refunded', value: sum(payingPaid, 1) },
  ];
  stages.forEach((s, i) => {
    const prev = stages[i - 1];
    s.step = prev ? pct(s.value, prev.value) : null;
    s.lost = prev ? Math.max(0, prev.value - s.value) : 0;
  });
  // The worst step after sign-in is where we leak the most (sign-in is mostly casual browsers).
  const leak = stages.slice(2).reduce((w, s) => (w == null || s.step < w.step ? s : w), null);
  return { stages, leakKey: leak?.key ?? null, revenue: sum(payingPaid, 2) };
}

// rows: [segment, visitors, passPage, checkout, attempted] + paid rows → one table row per segment.
export function buildSegments(segRows, paidRows) {
  const paid = Object.fromEntries(paidRows.map((r) => [r[0], Number(r[1]) || 0]));
  return segRows
    .map((r) => ({
      name: r[0],
      free: FREE_SEGMENTS.includes(r[0]),
      visitors: +r[1], passPage: +r[2], checkout: +r[3], attempted: +r[4], paid: paid[r[0]] || 0,
    }))
    .sort((a, b) => b.visitors - a.visitors);
}

// IST bucket key for a timestamp, matching formatDateTime(..., '%Y-%m-%d %H') in HogQL.
const IST_MS = 5.5 * 3600 * 1000;
export const istHourKey = (ms) => new Date(ms + IST_MS).toISOString().slice(0, 13).replace('T', ' ');
export const istDayKey = (ms) => new Date(ms + IST_MS).toISOString().slice(0, 10);

// rows: [key, ...metrics]; returns exactly `n` buckets ending at `nowMs`, zero-filled.
export function fillHours(rows, nowMs, n = 72) {
  const byKey = new Map(rows.map((r) => [r[0], r.slice(1).map(Number)]));
  const width = rows[0] ? rows[0].length - 1 : 4;
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const key = istHourKey(nowMs - i * 3600 * 1000);
    out.push({ key, values: byKey.get(key) || Array(width).fill(0) });
  }
  return out;
}

export function fillDays(rows, startDay, nowMs) {
  const byKey = new Map(rows.map((r) => [r[0], r.slice(1).map(Number)]));
  const width = rows[0] ? rows[0].length - 1 : 4;
  const out = [];
  const end = istDayKey(nowMs);
  for (let t = Date.parse(`${startDay}T00:00:00Z`); ; t += 86400000) {
    const key = new Date(t).toISOString().slice(0, 10);
    if (key > end) break;
    out.push({ key, values: byKey.get(key) || Array(width).fill(0) });
  }
  return out;
}

export function pace(sold, target, festEndMs, nowMs) {
  const daysLeft = Math.max(1, Math.ceil((festEndMs - nowMs) / 86400000));
  const remaining = Math.max(0, target - sold);
  return { daysLeft, remaining, perDay: Math.ceil(remaining / daysLeft), progress: Math.min(100, pct(sold, target)) };
}
