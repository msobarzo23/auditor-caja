import { INTL_BRANCHES, OP_ACCOUNTS, fFull } from './config';

/**
 * Run all audit rules against parsed records.
 * @param {Array} records - All parsed records
 * @param {boolean} isIntl - Whether to audit international or national records
 * @returns {Array} Sorted alerts
 */
export function runAudit(records, isIntl) {
  const alerts = [];
  const scope = isIntl
    ? records.filter(r => INTL_BRANCHES.includes(r.descripcion))
    : records.filter(r => !INTL_BRANCHES.includes(r.descripcion));

  if (scope.length === 0) return alerts;

  const isDonLuisRetiro = r =>
    r.apellido === 'BELLO LOPEZ' &&
    (r.nombre || '').includes('LUIS') &&
    r.descripcion === 'CASA MATRIZ';

  // ── R01: Duplicados exactos ──
  const seen = new Map();
  scope.forEach(r => {
    const k = `${r.fecha}|${r.apellido}|${r.nombre}|${r.cuenta}|${r.glosa}|${r.monto}`;
    if (seen.has(k)) {
      const p = seen.get(k);
      alerts.push({
        rule: 'R01', sev: 'critical', title: 'Duplicado exacto', suc: r.descripcion,
        desc: `${r.apellido} ${r.nombre} — ${r.cuenta} ${fFull(r.monto)} el ${r.fecha}`,
        det: `Glosa: "${r.glosa}" — Vale ${r.valeid} vs ${p.valeid}`,
        recs: [r, p],
      });
    } else {
      seen.set(k, r);
    }
  });

  // ── R02: Gasto General sin respaldo ──
  const facturaPat = /fact|factura|bol|boleta|n\.\s*\d|n°|nro|n\.\d|b\//i;
  scope
    .filter(r => r.cuenta === 'GASTOS GENERALES' && !facturaPat.test(r.glosa) && r.monto > 50000 && !isDonLuisRetiro(r))
    .forEach(r => {
      alerts.push({
        rule: 'R02', sev: 'critical', title: 'Gasto General sin respaldo', suc: r.descripcion,
        desc: `${r.apellido} ${r.nombre} — ${fFull(r.monto)} el ${r.fecha}`,
        det: `"${r.glosa}" — Sin referencia a factura/boleta`,
        recs: [r],
      });
    });

  // ── R03: Despachador en cuenta restringida (La Negra) ──
  if (!isIntl) {
    const restricted = ['BONO', 'GASTOS GENERALES', 'PROVEEDOR', 'POR RENDIR'];
    const staffLN = new Set(['BELLO LAZON', 'BELLO LOPEZ', 'HARO TORRES']);
    const personAccounts = new Map();
    scope.forEach(r => {
      if (!personAccounts.has(r.apellido)) personAccounts.set(r.apellido, new Set());
      personAccounts.get(r.apellido).add(r.cuenta);
    });
    scope
      .filter(r => r.descripcion === 'LA NEGRA' && restricted.includes(r.cuenta) && !staffLN.has(r.apellido))
      .forEach(r => {
        const accts = personAccounts.get(r.apellido) || new Set();
        if (accts.size <= 3 && (accts.has('GASTO VIAJE') || accts.has('VIATICO')) && !accts.has('SALDO TRASPASO')) {
          alerts.push({
            rule: 'R03', sev: 'critical', title: 'Despachador en cta. restringida', suc: 'LA NEGRA',
            desc: `${r.apellido} ${r.nombre} → ${r.cuenta} ${fFull(r.monto)}`,
            det: `${r.fecha} — "${r.glosa}" — Cuentas habituales: ${[...accts].join(', ')}`,
            recs: [r],
          });
        }
      });
  }

  // ── R04: Sueldo alto post-marzo La Negra ──
  if (!isIntl) {
    scope
      .filter(r => r.cuenta === 'SUELDO' && r.descripcion === 'LA NEGRA')
      .forEach(r => {
        const parts = r.fecha.split('/');
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        if (year >= 2026 && month >= 3 && r.monto > 500000) {
          alerts.push({
            rule: 'R04', sev: 'critical', title: 'Sueldo alto post-marzo LN', suc: 'LA NEGRA',
            desc: `${r.apellido} ${r.nombre} — ${fFull(r.monto)} el ${r.fecha}`,
            det: `Desde marzo sueldos transferencia van por Santiago. "${r.glosa}"`,
            recs: [r],
          });
        }
      });
  }

  // ── R05: Factura proveedor duplicada ──
  const factNums = new Map();
  const factNumPat = /(?:fact|factura|f\/|f\.)[.\s\-]*(\d{4,})/i;
  scope
    .filter(r => r.cuenta === 'PROVEEDOR')
    .forEach(r => {
      const m = r.glosa.match(factNumPat);
      if (m) {
        const num = m[1];
        if (factNums.has(num)) {
          const prev = factNums.get(num);
          if (prev.apellido !== r.apellido || prev.fecha !== r.fecha || prev.descripcion !== r.descripcion) {
            alerts.push({
              rule: 'R05', sev: 'critical', title: 'Factura duplicada', suc: r.descripcion,
              desc: `Fact. ${num} en registros distintos`,
              det: `${prev.apellido} (${prev.descripcion} ${prev.fecha}) vs ${r.apellido} (${r.descripcion} ${r.fecha})`,
              recs: [r, prev],
            });
          }
        } else {
          factNums.set(num, r);
        }
      }
    });

  // ── R06: Bono sin autorización ──
  const authPat = /aut[.\s]|autoriza/i;
  scope
    .filter(r => r.cuenta === 'BONO' && !authPat.test(r.glosa) && r.monto > 50000)
    .forEach(r => {
      alerts.push({
        rule: 'R06', sev: 'critical', title: 'Bono sin autorización', suc: r.descripcion,
        desc: `${r.apellido} ${r.nombre} — ${fFull(r.monto)} el ${r.fecha}`,
        det: `"${r.glosa}"`,
        recs: [r],
      });
    });

  // ── R07: Razón social sin persona responsable ──
  scope
    .filter(r => (r.apellido || '').startsWith('[') && !OP_ACCOUNTS.includes(r.cuenta) && r.monto > 30000)
    .forEach(r => {
      alerts.push({
        rule: 'R07', sev: 'warning', title: 'Sin persona responsable', suc: r.descripcion,
        desc: `${r.cuenta} ${fFull(r.monto)} el ${r.fecha}`,
        det: `"${r.glosa}" — Registrado a nombre de la empresa`,
        recs: [r],
      });
    });

  // ── Stats para outliers ──
  const acctStats = {};
  scope.forEach(r => {
    if (OP_ACCOUNTS.includes(r.cuenta) || isDonLuisRetiro(r)) return;
    if (!acctStats[r.cuenta]) acctStats[r.cuenta] = [];
    acctStats[r.cuenta].push(r.monto);
  });
  const statsCalc = {};
  Object.entries(acctStats).forEach(([cuenta, montos]) => {
    const mean = montos.reduce((a, b) => a + b, 0) / montos.length;
    const std = Math.sqrt(montos.reduce((a, b) => a + (b - mean) ** 2, 0) / montos.length);
    statsCalc[cuenta] = { mean, std, t3: mean + 3 * std };
  });

  // ── A01: Outliers estadísticos ──
  scope.forEach(r => {
    if (OP_ACCOUNTS.includes(r.cuenta) || isDonLuisRetiro(r)) return;
    const s = statsCalc[r.cuenta];
    if (s && s.std > 0 && r.monto > s.t3) {
      alerts.push({
        rule: 'A01', sev: 'warning', title: 'Outlier estadístico', suc: r.descripcion,
        desc: `${r.apellido} ${r.nombre} — ${r.cuenta} ${fFull(r.monto)} (prom: ${fFull(s.mean)})`,
        det: `${r.fecha} — "${r.glosa}" — 3σ: ${fFull(s.t3)}`,
        recs: [r],
      });
    }
  });

  // ── A04: Anticipo elevado ──
  scope
    .filter(r => r.cuenta === 'ANTICIPO' && r.monto > 500000)
    .forEach(r => {
      alerts.push({
        rule: 'A04', sev: 'warning', title: 'Anticipo elevado', suc: r.descripcion,
        desc: `${r.apellido} ${r.nombre} — ${fFull(r.monto)} el ${r.fecha}`,
        det: `"${r.glosa}"`,
        recs: [r],
      });
    });

  // ── A06: Gasto viaje sin expedición ──
  const noExpPat = /vigilante|mecanico|mecánico|guardia|sereno/i;
  scope
    .filter(r => r.cuenta === 'GASTO VIAJE' && (!r.expedicionid || !r.expedicionid.trim()) && !noExpPat.test(r.glosa))
    .forEach(r => {
      alerts.push({
        rule: 'A06', sev: 'warning', title: 'Gasto viaje sin expedición', suc: r.descripcion,
        desc: `${r.apellido} ${r.nombre} — ${fFull(r.monto)} el ${r.fecha}`,
        det: `"${r.glosa}"`,
        recs: [r],
      });
    });

  // ── I04: Notas de crédito ──
  scope
    .filter(r => r.monto < 0)
    .forEach(r => {
      alerts.push({
        rule: 'I04', sev: 'info', title: 'Nota de crédito', suc: r.descripcion,
        desc: `${r.apellido || '—'} — ${r.cuenta} ${fFull(r.monto)}`,
        det: `${r.fecha} — "${r.glosa}"`,
        recs: [r],
      });
    });

  // Sort: critical first, then warning, then info
  const sevOrder = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => (sevOrder[a.sev] ?? 3) - (sevOrder[b.sev] ?? 3));
}
