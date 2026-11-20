import Link from 'next/link';
import { getDashboard } from '../lib/data.js';
import { REFRESH_SECONDS } from '../lib/queries.js';
import { pct } from '../lib/shape.js';
import { TopBar, SecHead, Ladder, HBars, Columns, Area, HourStrip, fmt, fmtPct, tone, dayLabel } from './ui.jsx';

export const revalidate = 600; // must match REFRESH_SECONDS (Next needs a literal here)

export default async function Dashboard() {
  let d;
  try {
    d = await getDashboard();
  } catch (e) {
    return (
      <>
        <TopBar active="funnel" />
        <main className="wrap">
          <div className="hero"><h1>Fest Pass funnel</h1></div>
          <p className="banner err">Couldn&apos;t load data from PostHog: {e.message}</p>
        </main>
      </>
    );
  }

  const s = Object.fromEntries(d.funnel.stages.map((x) => [x.key, x]));
  const fp = d.products.find((p) => p.name === 'Fest Pass') || { people: 0, attempted: 0, attemptRate: 0 };
  const ev = d.products.find((p) => p.name === 'Event entry') || { attemptRate: 0 };
  const desktop = d.devices.find((x) => x.name === 'Desktop')?.value || 0;
  const deviceTotal = d.devices.reduce((a, x) => a + x.value, 0);
  const regShare = pct(d.openers.registered, d.openers.total);
  const peakHour = d.hours.indexOf(Math.max(...d.hours));

  const insights = [
    {
      t: `Only ${fmtPct(fp.attemptRate)} of people who open the pass checkout even try to pay`,
      b: `For event entry on the same Razorpay checkout it's ${fmtPct(ev.attemptRate)}. The gateway works. People see ₹999 and don't find a reason to pay.`,
    },
    {
      t: `${fmtPct(regShare)} of checkout openers already registered for an event`,
      b: `They're coming to campus anyway, so the pass has to give them something extra. ${fmt(d.openers.repeat)} people opened checkout more than once: interested, but not convinced.`,
    },
    {
      t: `${fmtPct(pct(desktop, deviceTotal))} of pass checkouts happen on a laptop`,
      b: 'On desktop Razorpay shows a QR first, so people have to pick up their phone to pay. Event payments mostly happen on phones.',
    },
    {
      t: `Checkouts peak around ${peakHour}:00 IST`,
      b: 'Send emails and posts an hour before this.',
    },
  ];

  const eventsDaily = d.daily.slice().reverse();
  const next = ({ ...d.funnel.stages.find((x) => x.key === d.funnel.leakKey) });

  return (
    <>
      <meta httpEquiv="refresh" content={String(REFRESH_SECONDS)} />
      <TopBar active="funnel" data={d} />
      <main className="wrap">
        <div className="hero">
          <span className="eyebrow">Yugaantar 2026 · Fest Pass · since {dayLabel(d.launch)}</span>
          <h1>Where Fest Pass buyers drop off</h1>
          <p className="lede">
            <b>{fmt(s.checkout.value)}</b> people opened the payment page. <b>{fmt(s.attempted.value)}</b> tried to pay. <b>{fmt(d.sold)}</b> bought.
            The biggest leak right now is <b>{next.label?.toLowerCase()}</b>, where we lose {fmt(next.lost)} people.
          </p>
          {d.sample && <p className="banner">Showing a saved real snapshot from {dayLabel('2026-11-21')} because no PostHog key is set locally. The deployed site shows live data.</p>}
        </div>

        <section>
          <div className="grid g4">
            <div className="panel kpi">
              <span className="eyebrow">Passes sold</span>
              <span className="v">{fmt(d.sold)}<small> / {fmt(d.target)}</small></span>
              <div className="meter" aria-hidden="true"><i style={{ width: `${Math.max(d.pace.progress, 0.5)}%` }} /></div>
              <span className="s">{fmtPct(d.pace.progress)} of target · ₹{fmt(d.funnel.revenue)} collected</span>
            </div>
            <div className="panel kpi">
              <span className="eyebrow">Needed per day</span>
              <span className="v">{fmt(d.pace.perDay)}</span>
              <span className="s">{fmt(d.pace.remaining)} to go · {d.pace.daysLeft} days until the fest ends</span>
            </div>
            <div className="panel kpi">
              <span className="eyebrow">Checkout → tried to pay</span>
              <span className={`v tone-${tone(fp.attemptRate)}`}>{fmtPct(fp.attemptRate)}</span>
              <span className="s">Event entry: {fmtPct(ev.attemptRate)} on the same gateway</span>
            </div>
            <div className="panel kpi">
              <span className="eyebrow">Pass page → checkout</span>
              <span className={`v tone-${tone(s.checkout.step)}`}>{fmtPct(s.checkout.step)}</span>
              <span className="s">{fmt(s.passPage.value)} people saw the pass page</span>
            </div>
          </div>
        </section>

        <section>
          <SecHead eyebrow="01 · Funnel" title="Top to bottom">
            Unique people at each step since the pass went on sale. The red row is where we lose the biggest share.
          </SecHead>
          <Ladder funnel={d.funnel} />
        </section>

        <section>
          <SecHead eyebrow="02 · What the data says" title="Why people stop" />
          <div className="grid g2">
            {insights.map((x) => (
              <div className="panel" key={x.t} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h3>{x.t}</h3>
                <p className="muted">{x.b}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SecHead eyebrow="03 · Same gateway, different product" title="Who tries to pay after opening checkout">
            Share of people who opened a Razorpay checkout and then tried UPI or a card.
          </SecHead>
          <div className="panel">
            <HBars
              axis
              unit="%"
              max={100}
              items={d.products.map((p) => ({ name: `${p.name} (${fmt(p.people)})`, value: p.attemptRate, color: p.name === 'Fest Pass' ? 'bad' : 'lime' }))}
            />
          </div>
        </section>

        <section>
          <SecHead eyebrow="04 · Hour by hour" title="Last 72 hours, IST">
            Updated every 10 minutes. Each column is one hour.
          </SecHead>
          <div className="grid g2">
            <div className="panel chart" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3>Pass page visitors</h3>
              <Area rows={d.hourly} i={0} label="Unique pass page visitors per hour, last 72 hours" />
            </div>
            <div className="panel chart" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3>Checkout opened vs tried to pay</h3>
              <Columns
                rows={d.hourly}
                label="Checkout opens and payment attempts per hour, last 72 hours"
                series={[{ i: 1, color: 'var(--sky)' }, { i: 2, color: 'var(--lime)' }]}
              />
              <div className="legend"><span><i style={{ background: 'var(--sky)' }} />Opened checkout</span><span><i style={{ background: 'var(--lime)' }} />Tried to pay</span></div>
            </div>
          </div>
        </section>

        <section>
          <SecHead eyebrow="05 · Day by day" title="Every day since launch" />
          <div className="panel tw">
            <table>
              <thead><tr><th>Day (IST)</th><th className="n">Pass page</th><th className="n">Opened checkout</th><th className="n">Tried to pay</th><th className="n">Paid</th><th className="n">Checkout → paid</th></tr></thead>
              <tbody>
                {eventsDaily.map((r) => (
                  <tr key={r.key}>
                    <td>{dayLabel(r.key)}</td>
                    <td className="n">{fmt(r.values[0])}</td>
                    <td className="n">{fmt(r.values[1])}</td>
                    <td className="n">{fmt(r.values[2])}</td>
                    <td className="n">{fmt(r.values[3])}</td>
                    <td className="n">{r.values[1] ? fmtPct(pct(r.values[3], r.values[1])) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <SecHead eyebrow="06 · Segments" title="Who is in the funnel">
            Grouped by sign-in email. SST and SSB students get the pass free, so they never reach checkout.
          </SecHead>
          <div className="panel tw">
            <table>
              <thead><tr><th>Segment</th><th className="n">Visitors</th><th className="n">Pass page</th><th className="n">Opened checkout</th><th className="n">Tried to pay</th><th className="n">Bought</th></tr></thead>
              <tbody>
                {d.segments.map((r) => (
                  <tr key={r.name} className={r.free ? 'free' : ''}>
                    <td>{r.name}{r.free ? ' · free pass' : ''}</td>
                    <td className="n">{fmt(r.visitors)}</td>
                    <td className="n">{fmt(r.passPage)}</td>
                    <td className="n">{fmt(r.checkout)}</td>
                    <td className="n">{fmt(r.attempted)}</td>
                    <td className="n">{fmt(r.paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <SecHead eyebrow="07 · People who opened checkout" title="What they look like" />
          <div className="grid g3">
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3>Device</h3>
              <HBars items={d.devices} />
            </div>
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3>Where they came from</h3>
              <HBars items={d.referrers} />
            </div>
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3>Pages they visited after closing checkout</h3>
              <HBars items={d.after} color="lime" />
            </div>
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3>Time of day they open checkout</h3>
              <HourStrip hours={d.hours} />
            </div>
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3>Discount codes tried on the pass</h3>
              <HBars items={d.codes.map((c) => ({ ...c, name: { unknown: 'Invalid code', applied: 'Worked', notForYou: 'Not eligible' }[c.name] || c.name }))} />
            </div>
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3>Intent signals</h3>
              <HBars
                items={[
                  { name: 'Registered for an event', value: d.openers.registered },
                  { name: 'Opened checkout 2+ times', value: d.openers.repeat },
                  { name: 'All checkout openers', value: d.openers.total },
                ]}
              />
            </div>
          </div>
        </section>

        <section>
          <div className="panel cta">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h3>What do we change?</h3>
              <p className="muted">Nine fixes for the tech team, each tied to a number on this page.</p>
            </div>
            <Link className="btn" href="/solutions">See the fixes →</Link>
          </div>
        </section>

        <footer>
          Source: PostHog project events (pageviews, <code>fest_pass_window_opened</code>, server-side <code>payment.status_changed</code>). Refreshed every 10 minutes. Aggregate counts only, no personal data. JSON: <a href="/api/funnel">/api/funnel</a>
        </footer>
      </main>
    </>
  );
}
