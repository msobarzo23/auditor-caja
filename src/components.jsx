import React from 'react';
import { getRisk, fmt } from './config';

export const SeverityBadge = ({ severity }) => {
  const cfg = {
    critical: { bg: '#fef2f2', bd: '#fca5a5', tx: '#991b1b', lb: 'CRÍTICO', ic: '⚠' },
    warning:  { bg: '#fffbeb', bd: '#fcd34d', tx: '#92400e', lb: 'AVISO',   ic: '⚡' },
    info:     { bg: '#eff6ff', bd: '#93c5fd', tx: '#1e40af', lb: 'INFO',    ic: 'ℹ' },
  }[severity] || { bg: '#f3f4f6', bd: '#d1d5db', tx: '#374151', lb: severity, ic: '•' };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 5,
      background: cfg.bg, border: `1px solid ${cfg.bd}`,
      color: cfg.tx, fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
      whiteSpace: 'nowrap',
    }}>
      {cfg.ic} {cfg.lb}
    </span>
  );
};

export const Pill = ({ text, color }) => (
  <span style={{
    fontSize: 10, padding: '2px 6px', borderRadius: 4,
    background: (color || '#6b7280') + '18',
    color: color || '#6b7280',
    fontWeight: 600, whiteSpace: 'nowrap',
  }}>
    {text}
  </span>
);

export const AccountPill = ({ cuenta }) => {
  const r = getRisk(cuenta);
  return <Pill text={cuenta} color={r.c} />;
};

export const StatCard = ({ label, value, sub, accent }) => {
  const isLong = typeof value === 'string' && value.length > 10;
  return (
    <div style={{
      background: 'var(--c2)', borderRadius: 10, padding: '14px 16px',
      border: '1px solid var(--bd)', flex: '1 1 160px', minWidth: 145,
    }}>
      <div style={{
        fontSize: 10, color: 'var(--mt)', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: 0.7,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: isLong ? 18 : 24, fontWeight: 800, color: accent || 'var(--tx)',
        marginTop: 3, fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--mt)', marginTop: 1 }}>{sub}</div>}
    </div>
  );
};

export const RiskBar = ({ cuenta, total, maxTotal }) => {
  const risk = getRisk(cuenta);
  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <div style={{
        width: 120, fontSize: 11, fontWeight: 600, color: 'var(--tx)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {cuenta}
      </div>
      <div style={{
        flex: 1, height: 16, background: 'var(--bd)',
        borderRadius: 5, overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.max(pct, 2)}%`, height: '100%',
          background: risk.c, borderRadius: 5,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <div style={{
        width: 70, textAlign: 'right', fontSize: 11, fontWeight: 600,
        color: 'var(--tx)', fontVariantNumeric: 'tabular-nums',
      }}>
        {fmt(total)}
      </div>
      <Pill text={risk.l} color={risk.c} />
    </div>
  );
};
