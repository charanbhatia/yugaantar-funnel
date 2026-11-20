import { getDashboard } from '../../lib/data.js';
import { RULE, TICKETS } from '../../lib/solutions.js';
import { TopBar, SecHead, Rich } from '../ui.jsx';

export const revalidate = 600;
export const metadata = { title: 'Fixes for tech · Yugaantar Fest Pass' };

export default async function Solutions() {
  let d = null;
  try { d = await getDashboard(); } catch { /* tickets still render without live numbers */ }

  return (
    <>
      <TopBar active="solutions" data={d} />
      <main className="wrap">
        <div className="hero">
          <span className="eyebrow">For the yugaantar.org tech team</span>
          <h1>Nine fixes to sell the pass</h1>
          <p className="lede">
            Ordered by payoff. <b>P0</b> ships this weekend, <b>P1</b> by Tue 24 Nov, <b>P2</b> before the gates open.
            Each ticket shows the live number it should move.
          </p>
          <nav className="toc" aria-label="Tickets">
            {TICKETS.map((t) => <a key={t.id} href={`#${t.id}`}>{t.id} · {t.prio}</a>)}
          </nav>
        </div>

        <section className="panel rule">
          <h2 style={{ fontSize: '1.25rem' }}>{RULE.title}</h2>
          <p className="muted">{RULE.intro}</p>
          <ul>{RULE.points.map((p) => <li key={p}>{p}</li>)}</ul>
        </section>

        <section>
          <SecHead eyebrow="Tickets" title="What to build" />
          {TICKETS.map((t) => {
            const m = d ? t.metric(d) : null;
            return (
              <article className="panel ticket" id={t.id} key={t.id}>
                <header>
                  <span className="tid">{t.id}</span>
                  <span className={`prio ${t.prio.toLowerCase()}`}>{t.prio}</span>
                  <span className="area">{t.area} · {t.effort}</span>
                </header>
                <h3 style={{ fontSize: '1.2rem' }}>{t.title}</h3>
                <p className="muted"><Rich text={t.problem} /></p>
                <div className="tgrid">
                  <div><h4>Build</h4><ul>{t.build.map((b) => <li key={b}><Rich text={b} /></li>)}</ul></div>
                  <div><h4>Done when</h4><ul>{t.done.map((b) => <li key={b}><Rich text={b} /></li>)}</ul></div>
                </div>
                {m && <div className="metric"><span>{m.label} (live)</span><b>{m.value}</b></div>}
              </article>
            );
          })}
        </section>

        <footer>Numbers on this page come from the same PostHog data as the funnel and refresh every 10 minutes.</footer>
      </main>
    </>
  );
}
