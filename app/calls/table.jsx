'use client';
import { useEffect, useMemo, useState } from 'react';

const FILTERS = [['todo', 'Not called'], ['done', 'Called'], ['all', 'Everyone']];

export default function CallTable({ initial }) {
  const [people, setPeople] = useState(initial);
  const [filter, setFilter] = useState('todo');
  const [search, setSearch] = useState('');
  const [me, setMe] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState({});

  useEffect(() => { try { setMe(localStorage.getItem('caller-name') || ''); } catch { /* storage blocked */ } }, []);
  const saveMe = (v) => { setMe(v); try { localStorage.setItem('caller-name', v); } catch { /* storage blocked */ } };

  const counts = { todo: people.filter((p) => !p.called).length, done: people.filter((p) => p.called).length, all: people.length };
  const shown = useMemo(() => {
    const s = search.trim().toLowerCase();
    return people.filter((p) => (filter === 'all' || (filter === 'done') === p.called)
      && (!s || [p.name, p.email, p.phone, p.college, p.city].some((v) => String(v).toLowerCase().includes(s))));
  }, [people, filter, search]);

  async function toggle(p) {
    const called = !p.called;
    setError('');
    setSaving((x) => ({ ...x, [p.id]: true }));
    setPeople((list) => list.map((x) => (x.id === p.id ? { ...x, called, calledBy: called ? me : '', calledAt: called ? 'just now' : '' } : x)));
    try {
      // location.origin, not a relative path: a page opened as https://user:pass@host/ can't fetch relative URLs.
      const res = await fetch(new URL('/api/calls', window.location.origin), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId: p.id, called, by: me }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
    } catch (e) {
      setPeople((list) => list.map((x) => (x.id === p.id ? p : x)));
      setError(`Couldn't save the check mark for ${p.name || 'this person'}: ${e.message}. Try again.`);
    } finally {
      setSaving((x) => ({ ...x, [p.id]: false }));
    }
  }

  return (
    <section className="card enter">
      <div className="calls-bar">
        <div className="seg" role="tablist" aria-label="Filter">
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
              {label} <span className="tabular">{counts[k]}</span>
            </button>
          ))}
        </div>
        <input id="call-search" className="field" type="search" placeholder="Search name, phone, email, college" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search the list" />
        <input id="caller-name" className="field narrow" placeholder="Your name (saved on marks)" value={me} onChange={(e) => saveMe(e.target.value.slice(0, 60))} aria-label="Your name" />
        <a className="btn ghost" href="/api/calls?format=csv">Download sheet</a>
      </div>
      {error && <p className="note bad" role="alert" style={{ marginBottom: 12 }}>{error}</p>}
      <div className="tw">
        <table className="calls">
          <thead>
            <tr><th>Called</th><th>Name</th><th>Phone</th><th>Email</th><th>College</th><th>Status</th><th className="n">Opened</th><th>Last opened (IST)</th></tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className={p.called ? 'done' : ''}>
                <td>
                  <label className="check">
                    <input type="checkbox" checked={p.called} disabled={!!saving[p.id]} onChange={() => toggle(p)} aria-label={`Called ${p.name}`} />
                    <span aria-hidden="true" />
                  </label>
                  {p.called && <small className="by">{[p.calledBy, p.calledAt].filter(Boolean).join(' · ')}</small>}
                </td>
                <td className="strong">{p.name || '–'}{p.registered && <span className="badge accent" title="Registered for an event">Event</span>}</td>
                <td className="tabular"><a href={`tel:${p.phone}`}>{p.phone || '–'}</a></td>
                <td><a href={`mailto:${p.email}`}>{p.email}</a></td>
                <td>{p.college}{p.city && <small className="by">{p.city}</small>}</td>
                <td><span className={`badge ${p.status === 'Never tried to pay' ? 'neutral' : 'warn'}`}>{p.status}</span></td>
                <td className="n">{p.opens}×</td>
                <td className="tabular">{p.lastOpen}</td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={8} className="muted">Nobody here. {filter === 'todo' ? 'Everyone on the list has been called.' : 'Try a different filter or search.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
