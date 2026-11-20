// SQL for every number on the dashboard. Plain module so it can be checked outside Next.
const day = (v, d) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : d); // validated: these go into SQL
export const LAUNCH = day(process.env.PASS_LAUNCH_DATE, '2026-11-13');
export const FEST_END = day(process.env.FEST_END_DATE, '2026-11-29');
export const TARGET = Number(process.env.FEST_PASS_TARGET) || 700;
export const REFRESH_SECONDS = 600;

const SINCE = `timestamp >= toDateTime('${LAUNCH} 00:00:00')`;
const FP = `properties.fest_pass = true`;
const ATTEMPTED = `('authorized','paid','failed','refunded','refundPending','refundFailed')`;
const MONEY = `('paid','refunded','refundPending','refundFailed')`;
const IST = (ts = 'timestamp') => `toTimeZone(${ts}, 'Asia/Kolkata')`;
// PostHog stamps each event with the person's properties *at that moment*, so someone who browsed
// before signing in has events with and without an email. Resolve one email per person (max skips
// the empty ones) and segment on that, or that person is counted in two segments.
const PERSON_EMAIL = `max(coalesce(person.properties.email, ''))`;
const SEG = (email) => `multiIf(
  ${email} like '%@sst.scaler.com', 'SST student',
  ${email} like '%@ssb.scaler.com', 'SSB student',
  ${email} like '%@scaler.com', 'Scaler employee',
  ${email} like '%@%', 'Outside student / public',
  'Not signed in')`;
// People whose latest money status is still 'paid', so refunded passes never count as sold.
const KEPT = `(select person_id from events where event = 'payment.status_changed' and ${FP} and properties.status in ${MONEY}
  group by person_id having argMax(properties.status, timestamp) = 'paid')`;
const STAGE_METRICS = `
  count(distinct if(event = '$pageview' and properties.$pathname = '/pass', person_id, null)),
  count(distinct if(event = 'fest_pass_window_opened', person_id, null)),
  count(distinct if(event = 'payment.status_changed' and ${FP} and properties.status in ${ATTEMPTED}, person_id, null)),
  count(distinct if(event = 'payment.status_changed' and ${FP} and properties.status = 'paid' and person_id in ${KEPT}, person_id, null))`;
const FUNNEL_EVENTS = `event in ('$pageview', 'fest_pass_window_opened', 'payment.status_changed')`;

export const Q = {
  // One row per person first, then count per segment, so nobody is counted twice.
  segments: `select seg, countIf(viewed), countIf(pass), countIf(opened), countIf(attempt) from (
      select person_id, ${SEG(PERSON_EMAIL)} as seg,
        max(event = '$pageview') as viewed,
        max(event = '$pageview' and properties.$pathname = '/pass') as pass,
        max(event = 'fest_pass_window_opened') as opened,
        max(event = 'payment.status_changed' and ${FP} and properties.status in ${ATTEMPTED}) as attempt
      from events where ${SINCE} and ${FUNNEL_EVENTS} group by person_id)
    group by seg`,
  // A person's pass counts only if their latest money status is still 'paid' (refunds drop out).
  paid: `select seg, count(), sum(amt) from (
      select person_id, ${SEG(PERSON_EMAIL)} as seg, argMax(properties.status, timestamp) as last,
             argMax(toFloat(properties.amount_rupees), timestamp) as amt
      from events where event = 'payment.status_changed' and ${FP} and properties.status in ${MONEY}
      group by person_id) where last = 'paid' group by seg`,
  hourly: `select formatDateTime(toStartOfHour(${IST()}), '%Y-%m-%d %H') as h, ${STAGE_METRICS}
    from events where timestamp > now() - interval 73 hour and ${FUNNEL_EVENTS} group by h order by h`,
  daily: `select formatDateTime(${IST()}, '%Y-%m-%d') as d, ${STAGE_METRICS}
    from events where ${SINCE} and ${FUNNEL_EVENTS} group by d order by d`,
  products: `select multiIf(${FP}, 'Fest Pass', properties.event_slug is not null, 'Event entry', properties.kind = 'merch', 'Merch', 'Other') as product,
      count(distinct person_id),
      count(distinct if(properties.status in ${ATTEMPTED}, person_id, null)),
      count(distinct if(properties.status = 'paid', person_id, null))
    from events where event = 'payment.status_changed' group by product`,
  openers: `select count(), countIf(c > 1), countIf(r > 0) from (
      select person_id, countIf(event = 'fest_pass_window_opened') as c,
             countIf(event in ('registration.created', 'registration.joined')) as r
      from events where event in ('fest_pass_window_opened', 'registration.created', 'registration.joined')
      group by person_id) where c > 0`,
  devices: `select properties.$device_type, count(distinct person_id) from events
    where event = 'fest_pass_window_opened' group by 1 order by 2 desc`,
  referrers: `select properties.$session_entry_referring_domain, count(distinct person_id) from events
    where event = 'fest_pass_window_opened' group by 1 order by 2 desc limit 6`,
  hours: `select toHour(${IST()}), count() from events where event = 'fest_pass_window_opened' group by 1`,
  after: `with o as (select person_id as pid, min(timestamp) as ts from events where event = 'fest_pass_window_opened' group by pid)
    select e.properties.$pathname as p, count(distinct o.pid) from o join events e on e.person_id = o.pid
    where e.event = '$pageview' and e.timestamp > o.ts and e.timestamp < o.ts + interval 30 minute and ${SINCE.replace('timestamp', 'e.timestamp')}
    group by p order by 2 desc limit 8`,
  codes: `select properties.outcome, count() from events
    where event = 'referral_code_tried' and properties.kind = 'festPass' group by 1 order by 2 desc`,
};

