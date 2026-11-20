// Server-rendered building blocks. Every chart is plain SVG/CSS: no client JS ships to viewers.
import Link from 'next/link';

// Turns `backticked` words in ticket copy into <code>.
export const Rich = ({ text }) => text.split('`').map((p, i) => (i % 2 ? <code key={i}>{p}</code> : p));

export const fmt =(n) => Math.round(Number(n) || 0).toLocaleString('en-IN');
export const fmtPct = (n) => `${n >= 10 || n === 0 ? Math.round(n) : n.toFixed(1)}%`;
export const tone = (p) => (p >= 50 ? 'good' : p >= 15 ? 'warn' : 'bad');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dayLabel = (k) => `${+k.slice(8, 10)} ${MONTHS[+k.slice(5, 7) - 1]}`;
export const istTime = (iso) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function TopBar({ active, data }) {
  return (
    <div className="top">
      <div className="top-in">
        <Link href="/" className="brand">YUGAANTAR · PASS FUNNEL</Link>
        {data && (
          <span className="live" title="Data refreshes from PostHog every 10 minutes">
            <span className={`dot ${data.sample ? 'sample' : ''}`} />
            {data.sample ? 'Sample snapshot' : 'Live'} · updated {istTime(data.updatedAt)} IST
          </span>
        )}
        <nav className="nav" aria-label="Pages">
          <Link href="/" aria-current={active === 'funnel' ? 'page' : undefined}>Funnel</Link>
          <Link href="/solutions" aria-current={active === 'solutions' ? 'page' : undefined}>Fixes for tech</Link>
        </nav>
      </div>
    </div>
  );
}

export function SecHead({ eyebrow, title, children }) {
  return (
    <div className="sec-head">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}

export function Ladder({ funnel }) {
  const max = funnel.stages[0].value || 1;
  const logW = (v) => (v > 0 ? Math.max(1.5, (Math.log10(v + 1) / Math.log10(max + 1)) * 100) : 0);
  return (
    <div className="panel ladder">
      {funnel.stages.map((s, i) => {
        const leak = s.key === funnel.leakKey;
        return (
          <div className={`rung ${leak ? 'leak' : ''}`} key={s.key}>
            <span className="i">{String(i + 1).padStart(2, '0')}</span>
            <div className="lbl">
              {s.label}
              {leak && <span className="tag">Biggest leak</span>}
              <small>{s.hint}</small>
            </div>
            <div className="bar" aria-hidden="true"><i style={{ width: `${logW(s.value)}%` }} /></div>
            <span className="val">{fmt(s.value)}</span>
            <div className="step">
              {s.step == null ? <span className="muted">start</span> : <span className={`pill ${tone(s.step)}`}>{fmtPct(s.step)} of above</span>}
              {s.lost > 0 && <span className="muted">−{fmt(s.lost)} lost</span>}
            </div>
          </div>
        );
      })}
      <div className="ladder-foot">Bar length uses a log scale so the small bottom stages stay visible. Free SST/SSB students are excluded because they don&apos;t pay.</div>
    </div>
  );
}

export function HBars({ items, max, unit = '', color = '', axis = false }) {
  const m = max ?? Math.max(1, ...items.map((x) => x.value));
  return (
    <div className="hbars">
      {items.map((x) => (
        <div className="hb" key={x.name}>
          <span className="name" title={x.name}>{x.name}</span>
          <div className="track"><i className={x.color || color} style={{ width: `${(x.value / m) * 100}%` }} /></div>
          <span className="v">{unit === '%' ? fmtPct(x.value) : fmt(x.value)}</span>
        </div>
      ))}
      {axis && (
        <div className="axis"><span /><div className="t"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div><span /></div>
      )}
    </div>
  );
}

const niceMax = (v) => {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((c) => c >= v);
};

// Columns for several series drawn front-to-back (first series widest, behind).
export function Columns({ rows, series, label }) {
  const W = 720, H = 220, L = 36, R = 8, T = 12, B = 30;
  const max = niceMax(Math.max(1, ...rows.flatMap((r) => series.map((s) => r.values[s.i]))));
  const bw = (W - L - R) / rows.length;
  const y = (v) => T + (H - T - B) * (1 - v / max);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {[0, max / 2, max].map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
          <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="12" fill="var(--muted)" fontFamily="var(--mono)">{t}</text>
        </g>
      ))}
      {rows.map((r, i) => (
        <g key={r.key}>
          {series.map((s, j) => {
            const v = r.values[s.i];
            if (!v) return null;
            const w = bw * (j === 0 ? 0.8 : 0.45);
            return <rect key={s.i} x={L + i * bw + (bw - w) / 2} y={y(v)} width={w} height={y(0) - y(v)} fill={s.color} rx="1" />;
          })}
          {r.key.endsWith(' 00') && (
            <text x={L + i * bw + bw / 2} y={H - 10} textAnchor="middle" fontSize="12" fill="var(--muted)" fontFamily="var(--mono)">{dayLabel(r.key)}</text>
          )}
          {r.key.endsWith(' 12') && (
            <text x={L + i * bw + bw / 2} y={H - 10} textAnchor="middle" fontSize="12" fill="var(--muted)" fontFamily="var(--mono)">noon</text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function Area({ rows, i, label }) {
  const W = 720, H = 160, L = 36, R = 8, T = 12, B = 30;
  const max = niceMax(Math.max(1, ...rows.map((r) => r.values[i])));
  const x = (k) => L + (k / Math.max(1, rows.length - 1)) * (W - L - R);
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const pts = rows.map((r, k) => `${x(k)},${y(r.values[i])}`).join(' ');
  const last = rows.at(-1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {[0, max / 2, max].map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
          <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="12" fill="var(--muted)" fontFamily="var(--mono)">{t}</text>
        </g>
      ))}
      <polygon points={`${x(0)},${y(0)} ${pts} ${x(rows.length - 1)},${y(0)}`} fill="var(--sky)" opacity="0.18" />
      <polyline points={pts} fill="none" stroke="var(--sky)" strokeWidth="2" />
      {last && <circle cx={x(rows.length - 1)} cy={y(last.values[i])} r="4" fill="var(--lime)" />}
      {rows.map((r, k) => r.key.endsWith(' 00') && (
        <text key={r.key} x={x(k)} y={H - 10} textAnchor="middle" fontSize="12" fill="var(--muted)" fontFamily="var(--mono)">{dayLabel(r.key)}</text>
      ))}
    </svg>
  );
}

export function HourStrip({ hours }) {
  const m = Math.max(1, ...hours);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="hstrip" role="img" aria-label="Checkout opens by hour of day, IST">
        {hours.map((v, h) => <div key={h} title={`${h}:00 IST: ${v} opens`} style={{ opacity: v ? 0.15 + 0.85 * (v / m) : 0.06 }} />)}
      </div>
      <div className="hstrip-lbl"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span></div>
    </div>
  );
}
