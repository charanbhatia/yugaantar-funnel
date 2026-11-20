import { unstable_cache } from 'next/cache';
import { hogql } from './posthog.js';
import { Q, LAUNCH, FEST_END, TARGET, REFRESH_SECONDS } from './queries.js';
import { buildFunnel, buildSegments, fillHours, fillDays, pace, pct } from './shape.js';

const REFERRER_NAMES = {
  $direct: 'Direct / typed',
  'com.google.android.gm': 'Gmail app',
  'com.google.android.googlequicksearchbox': 'Google app',
  'accounts.google.com': 'Google sign-in',
  'l.instagram.com': 'Instagram',
  'www.google.com': 'Google search',
  'yugaantar.org': 'yugaantar.org (internal)',
};

// PostHog allows only a few concurrent queries per project, so run them 3 at a time.
async function runAll() {
  const names = Object.keys(Q);
  const out = {};
  for (let i = 0; i < names.length; i += 3) {
    const batch = names.slice(i, i + 3);
    const res = await Promise.all(batch.map((n) => hogql(Q[n])));
    batch.forEach((n, j) => (out[n] = res[j]));
  }
  return out;
}

// Local dev without a key renders a real (aggregate-only) snapshot, clearly labelled. Production never does.
async function fetchResults() {
  if (!process.env.POSTHOG_PERSONAL_API_KEY && process.env.NODE_ENV !== 'production') {
    const { default: fx } = await import('./fixture.json', { with: { type: 'json' } });
    return { r: fx.results, now: Date.parse(fx.capturedAt), sample: true };
  }
  return { r: await runAll(), now: Date.now(), sample: false };
}

async function load() {
  const { r, now, sample } = await fetchResults();
  const funnel = buildFunnel(r.segments, r.paid);
  const sold = funnel.stages.at(-1).value;
  const [openers = 0, repeat = 0, registered = 0] = r.openers[0] || [];
  const products = r.products
    .filter((p) => p[0] !== 'Other')
    .map(([name, people, attempted, paid]) => ({ name, people, attempted, paid, attemptRate: pct(attempted, people) }));
  const hours = Array(24).fill(0);
  r.hours.forEach(([h, c]) => (hours[h] = c));

  return {
    updatedAt: new Date(now).toISOString(),
    sample,
    launch: LAUNCH,
    target: TARGET,
    funnel,
    sold,
    pace: pace(sold, TARGET, Date.parse(`${FEST_END}T23:59:59+05:30`), now),
    segments: buildSegments(r.segments, r.paid),
    hourly: fillHours(r.hourly, now, 72),
    daily: fillDays(r.daily, LAUNCH, now),
    products,
    openers: { total: openers, repeat, registered },
    devices: r.devices.map(([k, v]) => ({ name: k || 'Unknown', value: v })),
    referrers: r.referrers.map(([k, v]) => ({ name: REFERRER_NAMES[k] || k || 'Unknown', value: v })),
    hours,
    after: r.after.map(([k, v]) => ({ name: k, value: v })),
    codes: r.codes.map(([k, v]) => ({ name: k || 'unknown', value: v })),
  };
}

export const getDashboard = unstable_cache(load, ['dashboard-v1'], { revalidate: REFRESH_SECONDS });
