// Staff-only call list: people who opened the Fest Pass checkout but don't hold a paid pass.
// Contains personal data, so it is only imported by routes behind middleware.js (STAFF_PASSWORD).
import { unstable_cache } from 'next/cache';
import { hogql } from './posthog.js';
import { REFRESH_SECONDS } from './queries.js';
import { shapeRow } from './calls-shape.js';
export { mergeMarks, toCsv } from './calls-shape.js';

export const CALL_EVENT = 'funnel_dashboard_call_marked';
const HOST = process.env.POSTHOG_INGEST_HOST || 'https://us.i.posthog.com';
// Write-only project token. It is public by design (it ships in yugaantar.org's own page JS).
const TOKEN = process.env.POSTHOG_PROJECT_TOKEN || 'phc_tqLFtxJXRicjF5cccY9EmzgvQhBbAYatZfQxcSeLpaUd';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ATTEMPTED = `('authorized','paid','failed','refunded','refundPending','refundFailed')`;
const MONEY = `('paid','refunded','refundPending','refundFailed')`;

export const LIST_SQL = `select toString(o.pid), coalesce(p.properties.name, ''), coalesce(p.properties.email, ''),
    coalesce(toString(p.properties.phone), ''), coalesce(p.properties.college, ''), coalesce(p.properties.city, ''),
    o.opens, toString(o.first_open), toString(o.last_open), coalesce(m.attempted, 0), coalesce(m.last_money, ''), coalesce(r.reg, 0)
  from (select person_id as pid, count() as opens, min(timestamp) as first_open, max(timestamp) as last_open
        from events where event = 'fest_pass_window_opened' group by pid) as o
  left join (select person_id, max(properties.status in ${ATTEMPTED}) as attempted,
                    argMaxIf(properties.status, timestamp, properties.status in ${MONEY}) as last_money
             from events where event = 'payment.status_changed' and properties.fest_pass = true group by person_id) as m
    on m.person_id = o.pid
  left join (select person_id, 1 as reg from events where event in ('registration.created', 'registration.joined') group by person_id) as r
    on r.person_id = o.pid
  left join persons as p on p.id = o.pid
  order by o.last_open desc
  limit 10000`;

// Sample rows only for `npm run dev` without a key. Clearly fake: real personal data never goes in the repo.
const SAMPLE = [
  ['00000000-0000-4000-8000-000000000001', 'Sample Person A', 'sample.a@example.com', '9000000001', 'Example College', 'Bengaluru', 3, '2026-11-20 14:02:00.0', '2026-11-20 22:10:00.0', 0, '', 1],
  ['00000000-0000-4000-8000-000000000002', 'Sample Person B', 'sample.b@example.com', '9000000002', 'Example College', 'Mysuru', 1, '2026-11-19 18:30:00.0', '2026-11-19 18:30:00.0', 1, 'refunded', 0],
  ['00000000-0000-4000-8000-000000000003', 'Sample Person C', 'sample.c@example.com', '9000000003', 'Example Institute', 'Pune', 2, '2026-11-18 11:00:00.0', '2026-11-21 09:15:00.0', 1, '', 1],
];
const devSample = () => !process.env.POSTHOG_PERSONAL_API_KEY && process.env.NODE_ENV !== 'production';
const devMarks = globalThis.__devMarks || (globalThis.__devMarks = new Map());

export const getCallList = unstable_cache(
  async () => {
    const rows = devSample() ? SAMPLE : await hogql(LIST_SQL);
    return { updatedAt: new Date().toISOString(), sample: devSample(), people: rows.map(shapeRow).filter((p) => !p.paid) };
  },
  ['calls-v1'],
  { revalidate: REFRESH_SECONDS },
);

// Never cached: a check mark must show up for everyone as soon as PostHog has it.
export async function getMarks() {
  if (devSample()) return Object.fromEntries(devMarks);
  // Keep the alias: grouping by the bare `properties.person_id` silently returns no rows in HogQL.
  const rows = await hogql(`select properties.person_id as pid, argMax(properties.called, timestamp), toString(max(timestamp)), argMax(properties.by, timestamp)
    from events where event = '${CALL_EVENT}' group by pid limit 10000`);
  return Object.fromEntries(rows.map(([id, called, at, by]) => [id, { called: called === true || called === 'true', at: String(at).slice(0, 16), by: by || '' }]));
}

export async function saveMark({ personId, called, by }) {
  if (!UUID.test(personId || '')) throw new Error('Invalid person id');
  const mark = { called: called === true, by: String(by || '').slice(0, 60), at: new Date().toISOString() };
  if (devSample()) {
    const ist = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 16).replace('T', ' '); // same format PostHog returns
    devMarks.set(personId, { ...mark, at: ist });
    return;
  }
  const res = await fetch(`${HOST}/i/v0/e/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TOKEN,
      event: CALL_EVENT,
      distinct_id: 'yugaantar-funnel-dashboard',
      timestamp: mark.at,
      properties: { person_id: personId, called: mark.called, by: mark.by, $process_person_profile: false },
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`PostHog capture failed (${res.status})`);
}
