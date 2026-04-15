import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { INTL_BRANCHES, OP_ACCOUNTS, getRisk, fFull } from './config';

/**
 * Generate and download a PDF audit report.
 */
export function exportPDF({ records, alerts, fileName, sucFilter }) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 16;
  const usable = W - margin * 2;
  let y = margin;

  // ── Colors ──
  const colors = {
    primary: [30, 58, 138],
    dark: [15, 23, 42],
    muted: [100, 116, 139],
    critical: [220, 38, 38],
    warning: [217, 119, 6],
    info: [59, 130, 246],
    success: [22, 163, 74],
    bg: [241, 245, 249],
    white: [255, 255, 255],
    line: [203, 213, 225],
  };

  // Filter records based on context
  const natRecs = records.filter(r => !INTL_BRANCHES.includes(r.descripcion));
  const scope = sucFilter && sucFilter !== 'all'
    ? natRecs.filter(r => r.descripcion === sucFilter)
    : natRecs;

  const scopeAlerts = sucFilter && sucFilter !== 'all'
    ? alerts.filter(a => a.suc === sucFilter)
    : alerts;

  const criticals = scopeAlerts.filter(a => a.sev === 'critical');
  const warnings = scopeAlerts.filter(a => a.sev === 'warning');
  const infos = scopeAlerts.filter(a => a.sev === 'info');

  // ── Helper: add page with footer ──
  const addFooter = () => {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...colors.muted);
      doc.text(`Auditor de Caja — Transportes Bello e Hijos Ltda.`, margin, H - 8);
      doc.text(`Página ${i} de ${pageCount}`, W - margin, H - 8, { align: 'right' });
      // Line
      doc.setDrawColor(...colors.line);
      doc.setLineWidth(0.3);
      doc.line(margin, H - 12, W - margin, H - 12);
    }
  };

  const checkPage = (needed = 30) => {
    if (y + needed > H - 20) {
      doc.addPage();
      y = margin;
    }
  };

  // ══════════════════════════════════════
  // PAGE 1: HEADER + EXECUTIVE SUMMARY
  // ══════════════════════════════════════

  // Header bar
  doc.setFillColor(...colors.dark);
  doc.rect(0, 0, W, 32, 'F');
  doc.setTextColor(...colors.white);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Auditor de Caja', margin, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Transportes Bello e Hijos Ltda.', margin, 22);
  doc.setFontSize(8);
  doc.text(`Archivo: ${fileName}`, W - margin, 14, { align: 'right' });
  const today = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.text(`Generado: ${today}`, W - margin, 20, { align: 'right' });
  if (sucFilter && sucFilter !== 'all') {
    doc.text(`Sucursal: ${sucFilter}`, W - margin, 26, { align: 'right' });
  }

  y = 42;

  // ── KPI Boxes ──
  const kpis = [
    { label: 'Total Egresos', value: fFull(scope.reduce((s, r) => s + r.monto, 0)), color: colors.primary },
    { label: 'Registros', value: scope.length.toLocaleString('es-CL'), color: colors.primary },
    { label: 'Alertas Críticas', value: String(criticals.length), color: colors.critical },
    { label: 'Advertencias', value: String(warnings.length), color: colors.warning },
  ];

  const boxW = (usable - 9) / 4;
  kpis.forEach((kpi, i) => {
    const bx = margin + i * (boxW + 3);
    doc.setFillColor(...colors.bg);
    doc.roundedRect(bx, y, boxW, 22, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...colors.muted);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.label.toUpperCase(), bx + 4, y + 7);
    doc.setFontSize(13);
    doc.setTextColor(...kpi.color);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, bx + 4, y + 17);
  });

  y += 30;

  // ── Distribution by Account ──
  doc.setFontSize(12);
  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Distribución por Cuenta', margin, y);
  y += 6;

  const byAccount = {};
  scope.forEach(r => {
    if (OP_ACCOUNTS.includes(r.cuenta)) return;
    if (!byAccount[r.cuenta]) byAccount[r.cuenta] = { n: 0, t: 0 };
    byAccount[r.cuenta].n++;
    byAccount[r.cuenta].t += r.monto;
  });
  const accountRows = Object.entries(byAccount)
    .sort((a, b) => b[1].t - a[1].t)
    .map(([cuenta, data]) => {
      const risk = getRisk(cuenta);
      return [cuenta, data.n.toLocaleString('es-CL'), fFull(data.t), risk.l];
    });

  autoTable(doc, {
    startY: y,
    head: [['Cuenta', 'Registros', 'Monto Total', 'Riesgo']],
    body: accountRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2.5, textColor: colors.dark },
    headStyles: { fillColor: colors.dark, textColor: colors.white, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { halign: 'right', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 35 },
      3: { cellWidth: 25 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const val = data.cell.raw;
        if (val === 'Muy Alto') data.cell.styles.textColor = colors.critical;
        else if (val === 'Alto') data.cell.styles.textColor = [234, 88, 12];
        else if (val === 'Medio') data.cell.styles.textColor = colors.warning;
        else if (val === 'Bajo') data.cell.styles.textColor = colors.success;
        else data.cell.styles.textColor = colors.muted;
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── Rule Summary ──
  checkPage(40);
  doc.setFontSize(12);
  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen de Reglas', margin, y);
  y += 6;

  const ruleCounts = {};
  scopeAlerts.forEach(a => {
    if (!ruleCounts[a.rule]) ruleCounts[a.rule] = { critical: 0, warning: 0, info: 0, total: 0 };
    ruleCounts[a.rule][a.sev]++;
    ruleCounts[a.rule].total++;
  });

  const ruleNames = {
    R01: 'Duplicados exactos', R02: 'Gasto Gral sin respaldo', R03: 'Despachador cta. restringida',
    R04: 'Sueldo alto post-marzo LN', R05: 'Factura duplicada', R06: 'Bono persona duplicada',
    R07: 'Sin persona responsable', A01: 'Outliers estadísticos', A04: 'Anticipo elevado',
    A06: 'Gasto viaje sin expedición', I04: 'Notas de crédito',
  };

  const ruleRows = Object.entries(ruleCounts)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([rule, counts]) => [rule, ruleNames[rule] || rule, String(counts.critical), String(counts.warning), String(counts.total)]);

  autoTable(doc, {
    startY: y,
    head: [['Regla', 'Descripción', 'Críticas', 'Avisos', 'Total']],
    body: ruleRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2.5, textColor: colors.dark },
    headStyles: { fillColor: colors.dark, textColor: colors.white, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 18 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 2 && parseInt(data.cell.raw) > 0) data.cell.styles.textColor = colors.critical;
        if (data.column.index === 3 && parseInt(data.cell.raw) > 0) data.cell.styles.textColor = colors.warning;
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ══════════════════════════════════════
  // CRITICAL ALERTS DETAIL
  // ══════════════════════════════════════
  if (criticals.length > 0) {
    checkPage(30);
    doc.setFontSize(12);
    doc.setTextColor(...colors.critical);
    doc.setFont('helvetica', 'bold');
    doc.text(`Alertas Críticas (${criticals.length})`, margin, y);
    y += 6;

    const critRows = criticals.slice(0, 100).map(a => [
      a.rule, a.suc, a.title, a.desc, a.det,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Regla', 'Sucursal', 'Tipo', 'Descripción', 'Detalle']],
      body: critRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7, cellPadding: 2, textColor: colors.dark, overflow: 'linebreak' },
      headStyles: { fillColor: colors.critical, textColor: colors.white, fontStyle: 'bold', fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 14, fontStyle: 'bold' },
        1: { cellWidth: 24 },
        2: { cellWidth: 28 },
        3: { cellWidth: 45 },
        4: { cellWidth: usable - 14 - 24 - 28 - 45 },
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ══════════════════════════════════════
  // WARNING ALERTS DETAIL
  // ══════════════════════════════════════
  if (warnings.length > 0) {
    checkPage(30);
    doc.setFontSize(12);
    doc.setTextColor(...colors.warning);
    doc.setFont('helvetica', 'bold');
    doc.text(`Advertencias (${warnings.length})`, margin, y);
    y += 6;

    const warnRows = warnings.slice(0, 100).map(a => [
      a.rule, a.suc, a.title, a.desc,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Regla', 'Sucursal', 'Tipo', 'Descripción']],
      body: warnRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7, cellPadding: 2, textColor: colors.dark, overflow: 'linebreak' },
      headStyles: { fillColor: [217, 119, 6], textColor: colors.white, fontStyle: 'bold', fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 14, fontStyle: 'bold' },
        1: { cellWidth: 24 },
        2: { cellWidth: 35 },
        3: { cellWidth: usable - 14 - 24 - 35 },
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ══════════════════════════════════════
  // SUCURSAL BREAKDOWN
  // ══════════════════════════════════════
  if (!sucFilter || sucFilter === 'all') {
    checkPage(30);
    doc.setFontSize(12);
    doc.setTextColor(...colors.dark);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen por Sucursal', margin, y);
    y += 6;

    const bySuc = {};
    scope.forEach(r => {
      if (!bySuc[r.descripcion]) bySuc[r.descripcion] = { n: 0, t: 0, personas: new Set() };
      bySuc[r.descripcion].n++;
      bySuc[r.descripcion].t += r.monto;
      bySuc[r.descripcion].personas.add(r.apellido);
    });
    const sucRows = Object.entries(bySuc)
      .sort((a, b) => b[1].t - a[1].t)
      .map(([suc, d]) => {
        const sucAlerts = scopeAlerts.filter(a => a.suc === suc);
        return [suc, d.n.toLocaleString('es-CL'), String(d.personas.size), fFull(d.t),
          String(sucAlerts.filter(a => a.sev === 'critical').length),
          String(sucAlerts.filter(a => a.sev === 'warning').length)];
      });

    autoTable(doc, {
      startY: y,
      head: [['Sucursal', 'Registros', 'Personas', 'Total', 'Críticas', 'Avisos']],
      body: sucRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: colors.dark },
      headStyles: { fillColor: colors.dark, textColor: colors.white, fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 35 },
        1: { halign: 'right', cellWidth: 22 },
        2: { halign: 'right', cellWidth: 22 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 20 },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index === 4 && parseInt(data.cell.raw) > 0) data.cell.styles.textColor = colors.critical;
          if (data.column.index === 5 && parseInt(data.cell.raw) > 0) data.cell.styles.textColor = colors.warning;
        }
      },
    });
  }

  // ── Add footers to all pages ──
  addFooter();

  // ── Save ──
  const safeName = (sucFilter && sucFilter !== 'all') ? sucFilter.replace(/\s+/g, '_') : 'TODAS';
  doc.save(`Auditor_Caja_${safeName}_${today.replace(/\//g, '-')}.pdf`);
}
