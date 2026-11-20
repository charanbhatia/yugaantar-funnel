import { getDashboard } from '../../lib/data.js';
import { RULE, TICKETS } from '../../lib/solutions.js';
import { Shell, PageHeader, Card, Rich } from '../ui.jsx';

export const revalidate = 600;
export const metadata = { title: 'Fixes for tech · Yugaantar Fest Pass' };

const PRIO_TONE = { P0: 'bad', P1: 'warn', P2: 'neutral' };

export default async function Solutions() {
  let d = null;
  try { d = await getDashboard(); } catch { /* tickets still render without live numbers */ }

  return (
    <Shell active="solutions" data={d}>
      <PageHeader
        eyebrow="Staff console · for the tech team"
        title="Nine fixes to sell the pass"
        lead="Ordered by payoff. P0 ships this weekend, P1 by Tue 24 Nov, P2 before the gates open. Each shows the live number it should move."
      />
      <nav className="toc" aria-label="Tickets">
        {TICKETS.map((t) => <a key={t.id} href={`#${t.id}`}>{t.id}</a>)}
      </nav>

      <Card title={RULE.title} className="rule" action={<span className="badge accent">Read first</span>}>
        <p className="muted" style={{ marginBottom: 12 }}>{RULE.intro}</p>
        <ul>{RULE.points.map((p) => <li key={p}>{p}</li>)}</ul>
      </Card>

      {TICKETS.map((t) => {
        const m = d ? t.metric(d) : null;
        return (
          <article className="card ticket enter" id={t.id} key={t.id}>
            <div className="ticket-head">
              <span className="id">{t.id}</span>
              <span className={`badge ${PRIO_TONE[t.prio]}`}>{t.prio}</span>
              <span className="badge neutral">{t.area}</span>
              <span className="badge neutral">{t.effort}</span>
            </div>
            <h3>{t.title}</h3>
            <p className="why"><Rich text={t.problem} /></p>
            <div className="cols">
              <div><p className="sub" style={{ marginTop: 0 }}>Build</p><ul>{t.build.map((b) => <li key={b}><Rich text={b} /></li>)}</ul></div>
              <div><p className="sub" style={{ marginTop: 0 }}>Done when</p><ul>{t.done.map((b) => <li key={b}><Rich text={b} /></li>)}</ul></div>
            </div>
            {m && <div className="metric"><span className="muted">{m.label} · live</span><b>{m.value}</b></div>}
          </article>
        );
      })}

      <p className="muted" style={{ fontSize: '.85rem' }}>Numbers come from the same PostHog data as the funnel and refresh every 10 minutes.</p>
    </Shell>
  );
}
