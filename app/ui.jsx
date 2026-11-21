// Server-rendered building blocks in the Minarva staff-console style. Charts are plain SVG/CSS: no client JS.
import Link from 'next/link';

// Turns `backticked` words in ticket copy into <code>.
export const Rich = ({ text }) => text.split('`').map((p, i) => (i % 2 ? <code key={i}>{p}</code> : p));

export const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN');
export const fmtPct = (n) => `${n >= 10 || n === 0 ? Math.round(n) : n.toFixed(1)}%`;
export const tone = (p) => (p >= 50 ? 'ok' : p >= 15 ? 'warn' : 'bad');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dayLabel = (k) => `${+k.slice(8, 10)} ${MONTHS[+k.slice(5, 7) - 1]}`;
export const istTime = (iso) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const NAV = [
  { href: '/', key: 'funnel', label: 'Funnel' },
  { href: '/solutions', key: 'solutions', label: 'Fixes for tech' },
  { href: '/calls', key: 'calls', label: 'Call list · staff' },
];

export function Shell({ active, data, children }) {
  return (
    <>
      <header className="hdr">
        <div className="inner hdr-row">
          <Link href="/" className="brand">
            <span className="wordmark"><i aria-hidden="true" />Yugaantar</span>
            <span className="badge ink">Staff</span>
          </Link>
          {data && (
            <span className="status" title="Refreshes from PostHog every 10 minutes">
              <span className={`ping ${data.sample ? 'sample' : ''}`} aria-hidden="true" />
              {data.sample ? 'Sample' : 'Live'}<span className="when"> · {istTime(data.updatedAt)} IST</span>
            </span>
          )}
        </div>
        <nav className="inner tabs" aria-label="Sections">
          <ul>
            {NAV.map((n) => (
              <li key={n.key}><Link href={n.href} aria-current={active === n.key ? 'page' : undefined}>{n.label}</Link></li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" className="inner">{children}</main>
    </>
  );
}

export function PageHeader({ eyebrow, title, lead }) {
  return (
    <header className="ph">
      {eyebrow && <p className="eyebrow enter">{eyebrow}</p>}
      <h1 className="display enter" style={{ '--d': '0.06s' }}>{title}</h1>
      {lead && <p className="lead enter" style={{ '--d': '0.12s' }}>{lead}</p>}
    </header>
  );
}

export function Card({ title, action, children, className = '', id }) {
  return (
    <section className={`card enter ${className}`} id={id}>
      {title && <div className="card-title"><h2>{title}</h2>{action}</div>}
      {children}
    </section>
  );
}

export function Tile({ label, value, of, hint, toneName, progress }) {
  return (
    <div className="tile enter">
      <p className="label">{label}</p>
      <p className={`display value ${toneName ? `t-${toneName}` : ''}`}>{value}{of && <small> / {of}</small>}</p>
      {progress != null && <div className="track" aria-hidden="true"><span className="accent" style={{ width: `${Math.max(progress, 0.6)}%` }} /></div>}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

// The Minarva funnel rows, on a log scale so the bottom steps stay visible.
export function Funnel({ funnel }) {
  const max = funnel.stages[0].value || 1;
  const logW = (v) => (v > 0 ? Math.max(1.5, (Math.log10(v + 1) / Math.log10(max + 1)) * 100) : 0);
  return (
    <ol className="funnel" aria-label="Funnel steps">
      {funnel.stages.map((s) => {
        const leak = s.key === funnel.leakKey;
        return (
          <li key={s.key} className={`frow ${leak ? 'leak' : ''}`}>
            <span className="name">{s.label} {leak && <span className="badge bad">Biggest leak</span>}<small>{s.hint}</small></span>
            <span className="track" aria-hidden="true"><span className={leak ? 'bad' : ''} style={{ width: `${logW(s.value)}%` }} /></span>
            <span className="num"><b>{fmt(s.value)}</b>{s.step != null && <span>{fmtPct(s.step)}</span>}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function Bars({ items, max, unit, color = '' }) {
  const m = max ?? Math.max(1, ...items.map((x) => x.value));
  return (
    <ul className="rows">
      {items.map((x) => (
        <li key={x.name} className="bar-row">
          <span className="name" title={x.name}>{x.name}</span>
          <span className="track" aria-hidden="true"><span className={x.color || color} style={{ width: `${(x.value / m) * 100}%` }} /></span>
          <span className="num">{unit === '%' ? fmtPct(x.value) : fmt(x.value)}</span>
        </li>
      ))}
    </ul>
  );
}

const niceMax = (v) => {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((c) => c >= v);
};
const tick = { fontSize: 12, fill: 'var(--muted)', fontFamily: 'var(--mono)' };

function Grid({ max, y, L, R, W }) {
  return [0, max / 2, max].map((t) => (
    <g key={t}>
      <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--hairline)" strokeWidth="1" />
      <text x={L - 6} y={y(t) + 4} textAnchor="end" {...tick}>{t}</text>
    </g>
  ));
}

// Columns for several series drawn front-to-back (first series widest, behind).
export function Columns({ rows, series, label }) {
  const W = 720, H = 220, L = 36, R = 8, T = 12, B = 30;
  const max = niceMax(Math.max(1, ...rows.flatMap((r) => series.map((s) => r.values[s.i]))));
  const bw = (W - L - R) / rows.length;
  const y = (v) => T + (H - T - B) * (1 - v / max);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <Grid max={max} y={y} L={L} R={R} W={W} />
      {rows.map((r, i) => (
        <g key={r.key}>
          {series.map((s, j) => {
            const v = r.values[s.i];
            if (!v) return null;
            const w = bw * (j === 0 ? 0.78 : 0.42);
            return <rect key={s.i} x={L + i * bw + (bw - w) / 2} y={y(v)} width={w} height={y(0) - y(v)} fill={s.color} rx="2" />;
          })}
          {r.key.endsWith(' 00') && <text x={L + i * bw + bw / 2} y={H - 8} textAnchor="middle" {...tick}>{dayLabel(r.key)}</text>}
        </g>
      ))}
    </svg>
  );
}

export function Area({ rows, i, label }) {
  const W = 720, H = 180, L = 36, R = 8, T = 12, B = 30;
  const max = niceMax(Math.max(1, ...rows.map((r) => r.values[i])));
  const x = (k) => L + (k / Math.max(1, rows.length - 1)) * (W - L - R);
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const pts = rows.map((r, k) => `${x(k)},${y(r.values[i])}`).join(' ');
  const last = rows.at(-1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <Grid max={max} y={y} L={L} R={R} W={W} />
      <polygon points={`${x(0)},${y(0)} ${pts} ${x(rows.length - 1)},${y(0)}`} fill="var(--mist-strong)" />
      <polyline points={pts} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
      {last && <circle cx={x(rows.length - 1)} cy={y(last.values[i])} r="4.5" fill="var(--accent)" stroke="#fff" strokeWidth="2" />}
      {rows.map((r, k) => r.key.endsWith(' 00') && <text key={r.key} x={x(k)} y={H - 8} textAnchor="middle" {...tick}>{dayLabel(r.key)}</text>)}
    </svg>
  );
}

export function HourStrip({ hours }) {
  const m = Math.max(1, ...hours);
  return (
    <div>
      <div className="hours" role="img" aria-label="Checkout opens by hour of day, IST">
        {hours.map((v, h) => <div key={h} title={`${h}:00 IST: ${v} opens`} style={{ opacity: v ? 0.12 + 0.88 * (v / m) : 0.05 }} />)}
      </div>
      <div className="hours-lbl"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span></div>
    </div>
  );
}
