// ── Risk levels by account ──
export const RISK = {
  'GASTOS GENERALES': { l: 'Muy Alto', c: '#dc2626' },
  'BONO':             { l: 'Alto',     c: '#ea580c' },
  'PROVEEDOR':        { l: 'Medio',    c: '#d97706' },
  'POR RENDIR':       { l: 'Medio',    c: '#d97706' },
  'HONORARIO':        { l: 'Medio',    c: '#d97706' },
  'GASTO VIAJE':      { l: 'Bajo',     c: '#16a34a' },
  'SUELDO':           { l: 'Bajo',     c: '#16a34a' },
  'VIATICO':          { l: 'Bajo',     c: '#16a34a' },
  'ANTICIPO':         { l: 'Bajo',     c: '#16a34a' },
  'PRESTAMO':         { l: 'Bajo',     c: '#16a34a' },
  'PENSION ALIMENTOS':{ l: 'Bajo',     c: '#16a34a' },
  'RETIRO':           { l: 'Operativo',c: '#6b7280' },
};

// Operational accounts (no fraud alerts)
export const OP_ACCOUNTS = [
  'SALDO TRASPASO', 'CAJA MEJILLONES', 'CAJA CALAMA', 'CAJA COPIAPO',
  'CAJA COQUIMBO', 'CAJA IQUIQUE', 'CAJA LOS VILOS', 'CAJA ARICA',
  'CAJA CARGA ESPECIAL', 'CAJA SANTIAGO', 'CAJA', 'BANCO',
];
OP_ACCOUNTS.forEach(a => { RISK[a] = { l: 'Operativo', c: '#6b7280' }; });

// International branch names
export const INTL_BRANCHES = ['INTERNACIONAL ARG', 'INTERNACIONAL SOLES', 'INTERNACIONAL DOLARES'];

// Get risk for any account
export const getRisk = (cuenta) => RISK[cuenta] || { l: '—', c: '#6b7280' };

// ── Formatting ──
export const fmt = (n) => {
  if (n == null || isNaN(n)) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export const fFull = (n) => {
  if (n == null || isNaN(n)) return '$0';
  return '$' + Math.round(n).toLocaleString('es-CL');
};

// ── Audit rules metadata ──
export const RULES = [
  { r: 'R01', l: 'Duplicados exactos' },
  { r: 'R02', l: 'Gasto Gral sin respaldo' },
  { r: 'R03', l: 'Despachador cta. restringida' },
  { r: 'R04', l: 'Sueldo alto post-marzo LN' },
  { r: 'R05', l: 'Factura duplicada' },
  { r: 'R06', l: 'Bono sin autorización' },
  { r: 'R07', l: 'Sin persona responsable' },
  { r: 'A01', l: 'Outliers estadísticos' },
  { r: 'A04', l: 'Anticipo elevado' },
  { r: 'A06', l: 'Gasto viaje sin expedición' },
  { r: 'I04', l: 'Notas de crédito' },
];
