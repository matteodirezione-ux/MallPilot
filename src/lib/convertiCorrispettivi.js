import * as XLSX from 'xlsx';

// --- CSV parser (semicolon-delimited, handles quoted fields) ---
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseSemicolonCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[(h || '').trim()] = (values[i] || '').trim(); });
    return obj;
  });
}

// --- Flexible field getter (case-insensitive) ---
function getField(row, ...names) {
  const keys = Object.keys(row);
  for (const name of names) {
    const found = keys.find(k => k.toLowerCase() === name.toLowerCase());
    if (found !== undefined) return row[found];
  }
  return '';
}

// --- Source file parser (CSV or XLSX) ---
async function parseSourceFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = (await file.text()).replace(/^\ufeff/, '');
    return parseSemicolonCSV(text);
  }
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { raw: true, defval: '' });
}

// --- Aggregate CSV rows by Unit No (sum multiple entries per store) ---
function aggregateData(rows) {
  const byUnit = {};
  let year = null;
  let centre = '';
  let formName = '';
  rows.forEach(row => {
    const unitNo = String(getField(row, 'Unit No', 'Unit_No', 'Locale') || '').trim().toUpperCase();
    if (!unitNo) return;
    if (!year) year = parseInt(getField(row, 'Year')) || new Date().getFullYear();
    if (!centre) centre = String(getField(row, 'Centre') || '');
    if (!formName) formName = String(getField(row, 'Form_Name') || '');
    const ttc = parseFloat(getField(row, 'DeclaredTurnoverTTC')) || 0;
    const transactions = parseInt(getField(row, 'transactions')) || 0;
    const store = String(getField(row, 'Store') || '');
    if (!byUnit[unitNo]) byUnit[unitNo] = { fatturato: 0, scontrini: 0, insegna: store };
    byUnit[unitNo].fatturato += ttc;
    byUnit[unitNo].scontrini += transactions;
  });
  return { byUnit, year: year || new Date().getFullYear(), centre, formName };
}

// --- Matrix template parser (extracts store order) ---
async function parseMatrixTemplate(file) {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  const stores = [];
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    stores.push({
      locale: String(row[0]).trim().toUpperCase(),
      insegna: row[3] ? String(row[3]).trim() : '',
    });
  }
  return stores;
}

// --- Main conversion function ---
export async function convertiFile(csvFile, matriceFile) {
  const rows = await parseSourceFile(csvFile);
  if (!rows.length) throw new Error('Nessun dato trovato nel file');

  const { byUnit, year, centre, formName } = aggregateData(rows);

  let stores;
  let matrixCount = 0;
  if (matriceFile) {
    stores = await parseMatrixTemplate(matriceFile);
    matrixCount = stores.length;
  } else {
    stores = Object.entries(byUnit).map(([locale, d]) => ({ locale, insegna: d.insegna }));
  }

  const matched = new Set();
  const prevYear = year - 1;

  const dataRows = stores.map(store => {
    const data = byUnit[store.locale] || { fatturato: 0, scontrini: 0 };
    matched.add(store.locale);
    return [
      store.locale,
      store.insegna,
      0,              // FATTURATI anno precedente
      data.fatturato, // FATTURATI anno corrente
      null,           // diff.
      null,           // diff.%
      0,              // SCONTRINI anno precedente
      data.scontrini, // SCONTRINI anno corrente
      null,           // diff.
      null,           // diff.%
    ];
  });

  // Append unmatched CSV stores at the end
  let unmatchedCount = 0;
  Object.entries(byUnit).forEach(([locale, d]) => {
    if (!matched.has(locale)) {
      unmatchedCount++;
      dataRows.push([locale, d.insegna, 0, d.fatturato, null, null, 0, d.scontrini, null, null]);
    }
  });

  const headerRow1 = [null, null, 'FATTURATI', null, null, null, 'SCONTRINI', null, null, null];
  const headerRow2 = ['Locale', 'Merceologia/Insegna', prevYear, year, 'diff.', 'diff.%', prevYear, year, 'diff.', 'diff.%'];

  const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);
  ws['!merges'] = [
    { s: { r: 0, c: 2 }, e: { r: 0, c: 5 } },
    { s: { r: 0, c: 6 }, e: { r: 0, c: 9 } },
  ];
  ws['!cols'] = [
    { wch: 12 }, { wch: 25 },
    { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Matrice');
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

  const filename = `Matrice_${centre || 'centro'}${formName ? '_' + formName : ''}.xlsx`;

  return {
    blob: new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename,
    stats: {
      total: dataRows.length,
      matched: stores.length,
      unmatched: unmatchedCount,
      year,
      matrixCount,
    },
  };
}