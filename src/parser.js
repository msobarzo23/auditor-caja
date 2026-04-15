import * as XLSX from 'xlsx';

/**
 * Parse uploaded file (.xls, .xlsx, .csv) into normalized record objects.
 * Uses SheetJS which handles binary OLE2 .xls (BIFF format) natively.
 */
export async function parseFile(file) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', codepage: 1252 });

  // Use first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON with raw headers
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!json || json.length === 0) return null;

  // Normalize headers (lowercase, trim)
  const normalized = json.map((row, i) => {
    const clean = {};
    Object.entries(row).forEach(([key, val]) => {
      clean[key.trim().toLowerCase()] = String(val ?? '').trim();
    });
    return clean;
  });

  // Validate that essential columns exist
  const firstRow = normalized[0];
  const hasRequired = firstRow.hasOwnProperty('cuenta') || firstRow.hasOwnProperty('monto');
  if (!hasRequired) return null;

  // Parse into final record shape
  const records = normalized
    .map((r, i) => ({
      _i: i,
      descripcion: (r.descripcion || '').toUpperCase(),
      nrocaja: r.nrocaja || '',
      valeid: r.valeid || '',
      fecha: r.fecha || '',
      apellido: r.apellido || '',
      nombre: r.nombre || '',
      cuenta: (r.cuenta || '').toUpperCase(),
      glosa: r.glosa || '',
      monto: parseFloat(String(r.monto || '0').replace(/,/g, '')) || 0,
      expedicionid: r.expedicionid || '',
      tipocambio: r.tipocambio || '',
    }))
    .filter(r => r.cuenta);

  return records.length > 0 ? records : null;
}
