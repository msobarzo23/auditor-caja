import { useState, useMemo, useCallback } from 'react';
import { parseFile } from './parser';
import { runAudit } from './audit';
import { INTL_BRANCHES, OP_ACCOUNTS, getRisk, fmt, fFull, RULES } from './config';
import { SeverityBadge, Pill, AccountPill, StatCard, RiskBar } from './components';

export default function App() {
  const [recs, setRecs] = useState([]);
  const [fn, setFn] = useState('');
  const [tab, setTab] = useState('resumen');
  const [filt, setFilt] = useState('all');
  const [q, setQ] = useState('');
  const [sucFilt, setSucFilt] = useState('all');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [sort, setSort] = useState({ col: null, asc: true });

  const load = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setErr('');
    setFn(file.name);
    try {
      const records = await parseFile(file);
      if (!records?.length) {
        setErr('No se pudo leer el archivo. Verifica que sea el .xls del TMS.');
        setLoading(false);
        return;
      }
      setRecs(records);
      setTab('resumen');
      setSucFilt('all');
    } catch (er) {
      setErr(`Error: ${er.message}`);
    }
    setLoading(false);
  }, []);

  // ── Derived data ──
  const natRecs = useMemo(() => recs.filter(r => !INTL_BRANCHES.includes(r.descripcion)), [recs]);
  const intlRecs = useMemo(() => recs.filter(r => INTL_BRANCHES.includes(r.descripcion)), [recs]);
  const isIntlTab = tab === 'intl';

  const activeRecs = useMemo(() => {
    let base = isIntlTab ? intlRecs : natRecs;
    if (sucFilt !== 'all') base = base.filter(r => r.descripcion === sucFilt);
    return base;
  }, [isIntlTab, intlRecs, natRecs, sucFilt]);

  const alerts = useMemo(() => recs.length ? runAudit(recs, isIntlTab) : [], [recs, isIntlTab]);

  const alertsFiltered = useMemo(() => {
    let a = alerts;
    if (sucFilt !== 'all') a = a.filter(x => x.suc === sucFilt);
    if (filt !== 'all') a = a.filter(x => x.sev === filt);
    if (q) {
      const s = q.toLowerCase();
      a = a.filter(x =>
        x.desc.toLowerCase().includes(s) ||
        x.det.toLowerCase().includes(s) ||
        x.rule.toLowerCase().includes(s) ||
        x.suc.toLowerCase().includes(s)
      );
    }
    return a;
  }, [alerts, filt, q, sucFilt]);

  const stats = useMemo(() => {
    if (!activeRecs.length) return null;
    const total = activeRecs.reduce((s, r) => s + r.monto, 0);
    const byC = {};
    activeRecs.forEach(r => {
      if (!byC[r.cuenta]) byC[r.cuenta] = { n: 0, t: 0 };
      byC[r.cuenta].n++;
      byC[r.cuenta].t += r.monto;
    });
    return {
      total, byC,
      sucs: [...new Set(activeRecs.map(r => r.descripcion))],
      personas: new Set(activeRecs.map(r => r.apellido)).size,
      fechas: new Set(activeRecs.map(r => r.fecha)).size,
      cajas: new Set(activeRecs.map(r => r.nrocaja)).size,
      cr: alerts.filter(a => a.sev === 'critical' && (sucFilt === 'all' || a.suc === sucFilt)).length,
      wn: alerts.filter(a => a.sev === 'warning' && (sucFilt === 'all' || a.suc === sucFilt)).length,
    };
  }, [activeRecs, alerts, sucFilt]);

  const filtRecs = useMemo(() => {
    let f = activeRecs;
    if (q) {
      const s = q.toLowerCase();
      f = f.filter(r =>
        r.apellido.toLowerCase().includes(s) || r.nombre.toLowerCase().includes(s) ||
        r.cuenta.toLowerCase().includes(s) || r.glosa.toLowerCase().includes(s) ||
        r.fecha.includes(s) || r.descripcion.toLowerCase().includes(s)
      );
    }
    if (sort.col) {
      f = [...f].sort((a, b) => {
        let va = a[sort.col], vb = b[sort.col];
        if (sort.col === 'monto') { va = +va; vb = +vb; }
        return va < vb ? (sort.asc ? -1 : 1) : va > vb ? (sort.asc ? 1 : -1) : 0;
      });
    }
    return f;
  }, [activeRecs, q, sort]);

  const pStats = useMemo(() => {
    const m = new Map();
    activeRecs.forEach(r => {
      const k = `${r.apellido}|${r.nombre}`;
      if (!m.has(k)) m.set(k, { ap: r.apellido, nm: r.nombre, t: 0, n: 0, cs: new Set(), ss: new Set(), ac: 0 });
      const p = m.get(k);
      p.t += r.monto; p.n++; p.cs.add(r.cuenta); p.ss.add(r.descripcion);
    });
    alerts.forEach(a => a.recs?.forEach(r => {
      const k = `${r.apellido}|${r.nombre}`;
      if (m.has(k)) m.get(k).ac++;
    }));
    return [...m.values()]
      .map(p => ({ ...p, cs: [...p.cs], ss: [...p.ss] }))
      .sort((a, b) => b.ac - a.ac || b.t - a.t);
  }, [activeRecs, alerts]);

  const sucList = useMemo(() => {
    const base = isIntlTab ? intlRecs : natRecs;
    return [...new Set(base.map(r => r.descripcion))].sort();
  }, [isIntlTab, intlRecs, natRecs]);

  // ── Upload screen ──
  if (!recs.length) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="fade-in" style={{ textAlign: 'center', maxWidth: 500, padding: 40 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Auditor de Caja</h1>
          <p style={{ color: 'var(--mt)', fontSize: 13, marginBottom: 6 }}>Transportes Bello e Hijos Ltda.</p>
          <p style={{ color: 'var(--mt)', fontSize: 12, marginBottom: 28, lineHeight: 1.5 }}>
            Sube el archivo .xls del TMS con los egresos de caja (todas las sucursales).
          </p>
          {err && (
            <div style={{
              background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
              borderRadius: 8, padding: 14, marginBottom: 18, textAlign: 'left',
            }}>
              <div style={{ color: 'var(--cr)', fontSize: 12, fontWeight: 600 }}>⚠ {err}</div>
            </div>
          )}
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 28px', borderRadius: 10,
            background: 'var(--ac)', color: '#fff',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(77,138,255,.25)',
          }}>
            {loading ? '⏳ Procesando...' : '📂 Subir archivo .xls'}
            <input type="file" accept=".xls,.xlsx,.csv" onChange={load} style={{ display: 'none' }} />
          </label>
          <p style={{ color: 'var(--mt)', fontSize: 10, marginTop: 14 }}>
            Soporta .xls (TMS directo), .xlsx, .csv — Multi-sucursal
          </p>
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  const maxC = stats ? Math.max(...Object.values(stats.byC).map(c => c.t)) : 0;
  const cSort = stats ? Object.entries(stats.byC).sort((a, b) => b[1].t - a[1].t) : [];

  const tabDefs = [
    { id: 'resumen', lb: 'Resumen' },
    { id: 'alertas', lb: `Alertas (${alertsFiltered.length})` },
    { id: 'detalle', lb: 'Detalle' },
    { id: 'personas', lb: 'Personas' },
    ...(intlRecs.length ? [{ id: 'intl', lb: `Internacional (${intlRecs.length})` }] : []),
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Header ── */}
      <div style={{
        background: 'var(--c1)', borderBottom: '1px solid var(--bd)',
        padding: '10px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🔍</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Auditor de Caja</div>
            <div style={{ fontSize: 10, color: 'var(--mt)' }}>
              {fn} — {recs.length.toLocaleString()} reg — {[...new Set(recs.map(r => r.descripcion))].length} sucursales
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {stats?.cr > 0 && (
            <span style={{
              padding: '3px 10px', borderRadius: 6,
              background: 'rgba(239,68,68,.12)', color: 'var(--cr)',
              fontSize: 12, fontWeight: 700, animation: 'pulse 2s infinite',
            }}>
              ⚠ {stats.cr} críticas
            </span>
          )}
          <select value={sucFilt} onChange={e => setSucFilt(e.target.value)}>
            <option value="all">Todas las sucursales</option>
            {sucList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label style={{
            padding: '5px 12px', borderRadius: 6, background: 'var(--bd)',
            color: 'var(--mt)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
            Cambiar
            <input type="file" accept=".xls,.xlsx,.csv" onChange={load} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        borderBottom: '1px solid var(--bd)', padding: '0 20px',
        display: 'flex', gap: 0, overflowX: 'auto',
      }}>
        {tabDefs.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setQ(''); if (t.id === 'intl') setSucFilt('all'); }}
            style={{
              padding: '8px 14px', border: 'none', background: 'none',
              color: tab === t.id ? 'var(--ac)' : 'var(--mt)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              borderBottom: `2px solid ${tab === t.id ? 'var(--ac)' : 'transparent'}`,
              transition: '0.2s', whiteSpace: 'nowrap',
            }}
          >
            {t.lb}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
        {!stats && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--mt)' }}>
            Sin datos para este filtro.
          </div>
        )}

        {/* ═══ RESUMEN ═══ */}
        {tab === 'resumen' && stats && (
          <div className="fade-in">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              <StatCard label="Total Egresos" value={fmt(stats.total)} sub={`${activeRecs.length.toLocaleString()} reg`} />
              <StatCard label="Críticas" value={stats.cr} accent="var(--cr)" sub="Revisión urgente" />
              <StatCard label="Avisos" value={stats.wn} accent="var(--wn)" sub="Posibles anomalías" />
              <StatCard label="Personas" value={stats.personas} sub={`${stats.sucs.length} suc · ${stats.cajas} cajas`} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>
              {/* Distribution */}
              <div style={{ background: 'var(--c2)', borderRadius: 10, border: '1px solid var(--bd)', padding: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Distribución por Cuenta</h3>
                {cSort.filter(([c]) => !OP_ACCOUNTS.includes(c)).map(([c, d]) => (
                  <RiskBar key={c} cuenta={c} total={d.t} maxTotal={maxC} />
                ))}
              </div>

              {/* Rules + alerts */}
              <div style={{ background: 'var(--c2)', borderRadius: 10, border: '1px solid var(--bd)', padding: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Reglas Activas</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {RULES.map(x => {
                    const n = alertsFiltered.filter(a => a.rule === x.r).length;
                    return (
                      <div
                        key={x.r}
                        onClick={() => { setTab('alertas'); setQ(x.r); }}
                        style={{
                          padding: '6px 10px', borderRadius: 6, border: '1px solid var(--bd)',
                          cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', background: n ? 'rgba(239,68,68,.04)' : 'transparent',
                        }}
                      >
                        <span style={{ fontSize: 11 }}>
                          <span style={{ fontWeight: 700, color: 'var(--mt)', marginRight: 4 }}>{x.r}</span>
                          {x.l}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, minWidth: 24, textAlign: 'center',
                          padding: '1px 6px', borderRadius: 5,
                          background: n ? 'rgba(239,68,68,.12)' : 'var(--bd)',
                          color: n ? 'var(--cr)' : 'var(--mt)',
                        }}>
                          {n}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Top alerts preview */}
                <div style={{ marginTop: 12 }}>
                  {alerts.slice(0, 5).map((a, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--bd)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <SeverityBadge severity={a.sev} />
                        <Pill text={a.suc} color="var(--ac)" />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--mt)' }}>{a.desc}</div>
                    </div>
                  ))}
                  {alerts.length > 5 && (
                    <button
                      onClick={() => setTab('alertas')}
                      style={{
                        marginTop: 8, padding: '6px 12px', border: '1px solid var(--bd)',
                        background: 'transparent', color: 'var(--ac)', fontSize: 11,
                        fontWeight: 600, borderRadius: 6, cursor: 'pointer', width: '100%',
                      }}
                    >
                      Ver todas las alertas →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ ALERTAS ═══ */}
        {tab === 'alertas' && (
          <div className="fade-in">
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {['all', 'critical', 'warning', 'info'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilt(f)}
                  style={{
                    padding: '5px 12px', border: '1px solid var(--bd)',
                    background: filt === f ? 'var(--ac)' : 'var(--c2)',
                    color: filt === f ? '#fff' : 'var(--mt)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    borderRadius: 6, whiteSpace: 'nowrap',
                    borderColor: filt === f ? 'var(--ac)' : 'var(--bd)',
                  }}
                >
                  {{ all: `Todas (${alerts.filter(a => sucFilt === 'all' || a.suc === sucFilt).length})`, critical: 'Críticas', warning: 'Avisos', info: 'Info' }[f]}
                </button>
              ))}
              <div style={{ flex: 1, minWidth: 180 }}>
                <input className="inp" placeholder="Buscar..." value={q} onChange={e => setQ(e.target.value)} />
              </div>
            </div>
            <div className="scroll-area" style={{ maxHeight: 'calc(100vh - 260px)' }}>
              {!alertsFiltered.length ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--mt)' }}>
                  <div style={{ fontSize: 28 }}>✅</div>
                  <p style={{ marginTop: 6, fontSize: 13 }}>Sin alertas</p>
                </div>
              ) : alertsFiltered.map((a, i) => (
                <div key={i} className="fade-in" style={{
                  background: 'var(--c2)', border: '1px solid var(--bd)',
                  borderRadius: 8, padding: '12px 14px', marginBottom: 6,
                  animationDelay: `${Math.min(i, 20) * 0.02}s`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                    <SeverityBadge severity={a.sev} />
                    <span style={{ fontSize: 10, color: 'var(--mt)', fontWeight: 600 }}>{a.rule}</span>
                    <Pill text={a.suc} color="var(--ac)" />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{a.title}</span>
                  </div>
                  <div style={{ fontSize: 12, marginBottom: 3 }}>{a.desc}</div>
                  <div style={{ fontSize: 11, color: 'var(--mt)', lineHeight: 1.4 }}>{a.det}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ DETALLE / INTL ═══ */}
        {(tab === 'detalle' || tab === 'intl') && (
          <div className="fade-in">
            <div style={{ marginBottom: 10 }}>
              <input className="inp" placeholder="Buscar persona, cuenta, glosa, fecha..." value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--mt)', marginBottom: 6 }}>
              {filtRecs.length.toLocaleString()} registros
            </div>
            <div className="scroll-area" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              <table>
                <thead>
                  <tr>
                    {[
                      { c: 'fecha', l: 'Fecha' }, { c: 'descripcion', l: 'Suc.' },
                      { c: 'nrocaja', l: 'Caja' }, { c: 'apellido', l: 'Persona' },
                      { c: 'cuenta', l: 'Cuenta' }, { c: 'glosa', l: 'Glosa' },
                      { c: 'monto', l: 'Monto' },
                      ...(isIntlTab ? [{ c: 'tipocambio', l: 'T/C' }] : []),
                      { c: 'expedicionid', l: 'Exp.' },
                    ].map(h => (
                      <th key={h.c} onClick={() => setSort(p => ({ col: h.c, asc: p.col === h.c ? !p.asc : true }))}>
                        {h.l}{sort.col === h.c ? (sort.asc ? ' ↑' : ' ↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtRecs.slice(0, 500).map((r, i) => {
                    const hasAlert = alerts.some(a => a.recs?.some(x => x._i === r._i));
                    return (
                      <tr key={i} style={{ background: hasAlert ? 'rgba(239,68,68,.03)' : undefined }}>
                        <td style={{ whiteSpace: 'nowrap' }}>{r.fecha}</td>
                        <td><Pill text={r.descripcion} color="var(--ac)" /></td>
                        <td>{r.nrocaja}</td>
                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.apellido} {r.nombre}
                        </td>
                        <td><AccountPill cuenta={r.cuenta} /></td>
                        <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.glosa}>
                          {r.glosa}
                        </td>
                        <td style={{
                          textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                          color: r.monto < 0 ? 'var(--cr)' : 'var(--tx)', whiteSpace: 'nowrap',
                        }}>
                          {fFull(r.monto)}
                        </td>
                        {isIntlTab && <td style={{ color: 'var(--mt)' }}>{r.tipocambio || '—'}</td>}
                        <td style={{ color: 'var(--mt)' }}>{r.expedicionid || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtRecs.length > 500 && (
                <div style={{ textAlign: 'center', padding: 12, color: 'var(--mt)', fontSize: 11 }}>
                  500 de {filtRecs.length.toLocaleString()} — usa el buscador para filtrar
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ PERSONAS ═══ */}
        {tab === 'personas' && (
          <div className="fade-in">
            <div style={{ marginBottom: 10 }}>
              <input className="inp" placeholder="Buscar persona..." value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="scroll-area" style={{ maxHeight: 'calc(100vh - 260px)' }}>
              <table>
                <thead>
                  <tr>
                    <th>Persona</th>
                    <th>Sucursales</th>
                    <th>Reg.</th>
                    <th>Total</th>
                    <th>Cuentas</th>
                    <th>Alertas</th>
                  </tr>
                </thead>
                <tbody>
                  {pStats
                    .filter(p => !q || `${p.ap} ${p.nm}`.toLowerCase().includes(q.toLowerCase()))
                    .slice(0, 200)
                    .map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{p.ap} {p.nm}</td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {p.ss.map(s => <Pill key={s} text={s} color="var(--ac)" />)}
                          </div>
                        </td>
                        <td>{p.n}</td>
                        <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fFull(p.t)}</td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {p.cs.map(c => <AccountPill key={c} cuenta={c} />)}
                          </div>
                        </td>
                        <td>
                          {p.ac > 0 ? (
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                              background: 'rgba(239,68,68,.12)', color: 'var(--cr)',
                            }}>
                              {p.ac}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--ok)', fontSize: 11 }}>✓</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
