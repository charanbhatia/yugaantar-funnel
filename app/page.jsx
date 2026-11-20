import Link from 'next/link';
import { getDashboard } from '../lib/data.js';
import { REFRESH_SECONDS } from '../lib/queries.js';
import { pct } from '../lib/shape.js';
import { Shell, PageHeader, Card, Tile, Funnel, Bars, Columns, Area, HourStrip, fmt, fmtPct, tone, dayLabel } from './ui.jsx';

export const revalidate = 600; // must match REFRESH_SECONDS (Next needs a literal here)

export default async function Dashboard() {
  let d;
  try {
    d = await getDashboard();
  } catch (e) {
    return (
      <Shell active="funnel">
        <PageHeader eyebrow="Staff console" title="Fest Pass funnel" />
        <p className="note bad">Couldn&apos;t load data from PostHog: {e.message}</p>
      </Shell>
    );
  }

  const s = Object.fromEntries(d.funnel.stages.map((x) => [x.key, x]));
  const fp = d.products.find((p) => p.name === 'Fest Pass') || { people: 0, attempted: 0, attemptRate: 0 };
  const ev = d.products.find((p) => p.name === 'Event entry') || { attemptRate: 0 };
  const desktop = d.devices.find((x) => x.name === 'Desktop')?.value || 0;
  const deviceTotal = d.devices.reduce((a, x) => a + x.value, 0);
  const regShare = pct(d.openers.registered, d.openers.total);
  const peakHour = d.hours.indexOf(Math.max(...d.hours));
  const leak = d.funnel.stages.find((x) => x.key === d.funnel.leakKey) || {};

  const insights = [
    [`Only ${fmtPct(fp.attemptRate)} of checkout openers try to pay`, `Event entry on the same Razorpay checkout: ${fmtPct(ev.attemptRate)}. The gateway works. People see ₹999 and don't find a reason to pay.`],
    [`${fmtPct(regShare)} already registered for an event`, `They're coming anyway, so the pass has to add something. ${fmt(d.openers.repeat)} people opened checkout more than once: interested, but not convinced.`],
    [`${fmtPct(pct(desktop, deviceTotal))} of pass checkouts are on a laptop`, 'Razorpay shows a QR first on desktop, so people have to pick up their phone. Event payments mostly happen on phones.'],
    [`Checkouts peak around ${peakHour}:00 IST`, 'Send emails and posts an hour before this.'],
  ];

  return (
    <Shell active="funnel" data={d}>
      <meta httpEquiv="refresh" content={String(REFRESH_SECONDS)} />
      <PageHeader
        eyebrow={`Staff console · since ${dayLabel(d.launch)}`}
        title="Fest Pass funnel"
        lead={<><b>{fmt(s.checkout.value)}</b> opened the payment page, <b>{fmt(s.attempted.value)}</b> tried to pay, <b>{fmt(d.sold)}</b> bought. Biggest leak: <b>{leak.label?.toLowerCase()}</b>.</>}
      />
      {d.sample && <p className="note">Showing a saved real snapshot from 21 Nov because no PostHog key is set locally. The deployed site shows live data.</p>}

      <div className="grid tiles">
        <Tile label="Passes sold" value={fmt(d.sold)} of={fmt(d.target)} progress={d.pace.progress} hint={`₹${fmt(d.funnel.revenue)} collected`} />
        <Tile label="Needed per day" value={fmt(d.pace.perDay)} hint={`${fmt(d.pace.remaining)} to go · ${d.pace.daysLeft} days left`} />
        <Tile label="Checkout → tried to pay" value={fmtPct(fp.attemptRate)} toneName={tone(fp.attemptRate)} hint={`Event entry: ${fmtPct(ev.attemptRate)}`} />
        <Tile label="Pass page → checkout" value={fmtPct(s.checkout.step)} toneName={tone(s.checkout.step)} hint={`${fmt(s.passPage.value)} signed-in people saw it`} />
      </div>

      <Card title="Funnel" action={<span className="badge neutral">Unique people</span>}>
        <Funnel funnel={d.funnel} />
        <p className="card-foot">Each step only counts people who also did the step above it, and the percent is conversion from that step. Bars use a log scale so the small bottom steps stay visible. Free SST/SSB students are left out because they don&apos;t pay, and people who viewed /pass without signing in are in the segments table, not here, since buying needs an account.</p>
      </Card>

      <div className="grid two">
        {insights.map(([t, b]) => (
          <section className="card insight enter" key={t}><h3>{t}</h3><p>{b}</p></section>
        ))}
      </div>

      <Card title="Same checkout, different product" action={<span className="badge neutral">All time · people with an order</span>}>
        <Bars unit="%" max={100} items={d.products.map((p) => ({ name: `${p.name} (${fmt(p.people)})`, value: p.attemptRate, color: p.name === 'Fest Pass' ? 'bad' : '' }))} />
      </Card>

      <div className="grid two">
        <Card title="Pass page visitors" action={<span className="badge neutral">Last 72 h · hourly</span>} className="chart">
          <Area rows={d.hourly} i={0} label="Unique pass page visitors per hour, last 72 hours" />
        </Card>
        <Card title="Opened checkout vs tried to pay" action={<span className="badge neutral">Last 72 h · hourly</span>} className="chart">
          <Columns rows={d.hourly} label="Checkout opens and payment attempts per hour" series={[{ i: 1, color: 'var(--ink)' }, { i: 2, color: 'var(--accent)' }]} />
          <div className="legend"><span><i style={{ background: 'var(--ink)' }} />Opened checkout</span><span><i style={{ background: 'var(--accent)' }} />Tried to pay</span></div>
        </Card>
      </div>

      <Card title="Day by day" action={<span className="badge neutral">IST</span>}>
        <div className="tw">
          <table>
            <thead><tr><th>Day</th><th className="n">Pass page</th><th className="n">Opened checkout</th><th className="n">Tried to pay</th><th className="n">Paid</th><th className="n">Checkout → paid</th></tr></thead>
            <tbody>
              {d.daily.slice().reverse().map((r) => (
                <tr key={r.key}>
                  <td>{dayLabel(r.key)}</td>
                  {r.values.map((v, i) => <td className="n" key={i}>{fmt(v)}</td>)}
                  <td className="n">{r.values[1] ? fmtPct(pct(r.values[3], r.values[1])) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Segments" action={<span className="badge neutral">By sign-in email</span>}>
        <div className="tw">
          <table>
            <thead><tr><th>Segment</th><th className="n">Visitors</th><th className="n">Pass page</th><th className="n">Opened checkout</th><th className="n">Tried to pay</th><th className="n">Bought</th></tr></thead>
            <tbody>
              {d.segments.map((r) => (
                <tr key={r.name} className={r.free ? 'free' : ''}>
                  <td>{r.name} {r.free && <span className="badge ok">Free pass</span>}</td>
                  <td className="n">{fmt(r.visitors)}</td><td className="n">{fmt(r.passPage)}</td><td className="n">{fmt(r.checkout)}</td><td className="n">{fmt(r.attempted)}</td><td className="n">{fmt(r.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid three">
        <Card title="Device" action={<span className="badge neutral">People</span>}>
          <Bars items={d.devices} />
          <p className="card-foot">A person who used a phone and a laptop counts in both.</p>
        </Card>
        <Card title="Came from" action={<span className="badge neutral">People</span>}><Bars items={d.referrers} /></Card>
        <Card title="Next 30 min after opening checkout" action={<span className="badge neutral">People</span>}><Bars items={d.after} color="accent" /></Card>
        <Card title="Time of day" action={<span className="badge neutral">Checkout opens · IST</span>}><HourStrip hours={d.hours} /></Card>
        <Card title="Discount codes tried" action={<span className="badge neutral">Tries</span>}>
          <Bars items={d.codes.map((c) => ({ ...c, name: { unknown: 'Invalid code', applied: 'Worked', notForYou: 'Not eligible' }[c.name] || c.name }))} />
        </Card>
        <Card title="Intent">
          <Bars items={[
            { name: 'Registered for an event', value: d.openers.registered },
            { name: 'Opened checkout 2+ times', value: d.openers.repeat },
            { name: 'All checkout openers', value: d.openers.total },
          ]} />
        </Card>
      </div>

      <section className="card cta enter">
        <div className="insight"><h3>What do we change?</h3><p>Nine fixes for the tech team, each tied to a live number.</p></div>
        <Link className="btn" href="/solutions">See the fixes <i aria-hidden="true">→</i></Link>
      </section>

      <p className="muted" style={{ fontSize: '.85rem' }}>
        Source: PostHog (pageviews, <code>fest_pass_window_opened</code>, server-side <code>payment.status_changed</code>). Refreshed every 10 minutes. Counts only, no personal data. JSON: <a href="/api/funnel">/api/funnel</a>
      </p>
    </Shell>
  );
}
