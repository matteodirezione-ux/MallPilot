import * as XLSX from 'xlsx-js-style';
import { unzipSync } from 'fflate';

// --- CSV parser (handles quoted fields, configurable delimiter) ---
function parseCSVLine(line, delim = ';') {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === delim && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseDelimitedCSV(text, delim) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0], delim);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line, delim);
    const obj = {};
    headers.forEach((h, i) => { obj[(h || '').trim()] = (values[i] || '').trim(); });
    return obj;
  });
}

function parseSemicolonCSV(text) {
  return parseDelimitedCSV(text, ';');
}

function parseCommaCSV(text) {
  return parseDelimitedCSV(text, ',');
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

// --- Normalize store name for fuzzy matching (uppercase, remove spaces/punctuation) ---
function normalizeName(name) {
  return String(name || '').toUpperCase().replace(/[\s'\-\.]/g, '').replace(/[^A-Z0-9]/g, '');
}

// --- Levenshtein distance ---
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = [];
  for (let i = 0; i <= m; i++) dp.push([i]);
  for (let j = 1; j <= n; j++) dp[0].push(j);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

// --- Find matrix locale by store name (exact → contains → fuzzy) ---
function findLocaleByName(store, nameToLocale, nameLocaleList) {
  const norm = normalizeName(store);
  if (!norm) return null;
  // 1. Exact normalized match
  if (nameToLocale[norm]) return nameToLocale[norm];
  // 2. Contains match (one is substring of the other)
  for (const { norm: matNorm, locale } of nameLocaleList) {
    if (norm.length >= 4 && matNorm.includes(norm)) return locale;
    if (matNorm.length >= 4 && norm.includes(matNorm)) return locale;
  }
  // 3. Fuzzy: compare CSV name with prefix of matrix name (handles suffixes like "BY OPTISSIMO")
  for (const { norm: matNorm, locale } of nameLocaleList) {
    const minLen = Math.min(norm.length, matNorm.length);
    if (minLen < 5) continue;
    const truncated = matNorm.slice(0, norm.length);
    const dist = levenshtein(norm, truncated);
    if (dist <= 2 || dist <= Math.floor(minLen * 0.2)) return locale;
  }
  return null;
}

// --- Source file parser (CSV or XLSX) ---
// rawCsv=true → parse as comma-delimited (file grezzo da Mallcomm)
async function parseSourceFile(file, rawCsv = false) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = (await file.text()).replace(/^\ufeff/, '');
    return rawCsv ? parseCommaCSV(text) : parseSemicolonCSV(text);
  }
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { raw: true, defval: '' });
}

// --- Aggregate CSV rows by Unit No (sum multiple entries per store) ---
// nameToLocale: exact normalized name → locale
// nameLocaleList: [{ norm, locale }] for fuzzy matching
// matrixLocales: Set of valid matrix locales (to detect non-matching Unit No)
function aggregateData(rows, nameToLocale, nameLocaleList, matrixLocales) {
  const byUnit = {};
  const anomalies = [];
  let year = null;
  let centre = '';
  let formName = '';
  rows.forEach(row => {
    let unitNo = String(getField(row, 'Unit No', 'Unit_No', 'Locale') || '').trim().toUpperCase();
    const store = String(getField(row, 'Store') || '').trim();
    // If Unit No is empty OR not in matrix, try matching by Store name
    if ((!unitNo || (matrixLocales && !matrixLocales.has(unitNo))) && nameLocaleList && store) {
      const matched = findLocaleByName(store, nameToLocale, nameLocaleList);
      if (matched) unitNo = matched;
    }
    // If still no unitNo, use Store name as key
    if (!unitNo) unitNo = store.toUpperCase();
    if (!unitNo) return;
    if (!year) year = parseInt(getField(row, 'Year')) || new Date().getFullYear();
    if (!centre) centre = String(getField(row, 'Centre') || '');
    if (!formName) formName = String(getField(row, 'Form_Name') || '');
    const ttc = parseFloat(getField(row, 'DeclaredTurnoverTTC')) || 0;
    const ht = parseFloat(getField(row, 'DeclaredTurnoverHT')) || 0;
    // Fatturato = importo senza IVA (il più basso tra TTC e HT)
    const fatturato = (ttc > 0 && ht > 0) ? Math.min(ttc, ht) : (ttc || ht);
    // Segnala se HT > TTC (possibile errore di inserimento)
    if (ttc > 0 && ht > 0 && ht > ttc) {
      anomalies.push({ store: store || unitNo, ttc, ht });
    }
    const transactions = parseInt(getField(row, 'transactions')) || 0;
    if (!byUnit[unitNo]) byUnit[unitNo] = { fatturato: 0, scontrini: 0, insegna: store };
    byUnit[unitNo].fatturato += fatturato;
    byUnit[unitNo].scontrini += transactions;
  });
  return { byUnit, anomalies, year: year || new Date().getFullYear(), centre, formName };
}

// --- Matrix template parser (extracts store order + name→locale mappings) ---
async function parseMatrixTemplate(file) {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  const stores = [];
  const nameToLocale = {};
  const nameLocaleList = [];
  // Extract font from data cells (fatturato area) via styles.xml
  let fontName = 'Calibri';
  let fontSize = 11;
  try {
    const files = unzipSync(new Uint8Array(data));
    const stylesXml = new TextDecoder().decode(files['xl/styles.xml']);
    // Parse fonts
    const fontsMatch = stylesXml.match(/<fonts[^>]*>([\s\S]*?)<\/fonts>/);
    const fonts = fontsMatch
      ? fontsMatch[1].match(/<font>[\s\S]*?<\/font>/g).map(f => {
          const name = f.match(/<name val="([^"]*)"/);
          const sz = f.match(/<sz val="([^"]*)"/);
          return { name: name?.[1] || 'Calibri', sz: sz ? parseFloat(sz[1]) : 11, bold: f.includes('<b/>') };
        })
      : [];
    // Parse cellXfs (style index -> fontId)
    const cellXfsMatch = stylesXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/);
    const xfs = cellXfsMatch
      ? cellXfsMatch[1].match(/<xf[^>]*>/g).map(xf => {
          const fid = xf.match(/fontId="(\d+)"/);
          return fid ? parseInt(fid[1]) : 0;
        })
      : [];
    // Scan data cells (columns E-L, rows 4-50) to find most common font
    const sheetXml = new TextDecoder().decode(files['xl/worksheets/sheet1.xml']);
    const fontCounts = {};
    for (let row = 4; row <= 50; row++) {
      for (const col of ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']) {
        const cellMatch = sheetXml.match(new RegExp(`<c r="${col}${row}"[^>]*>`));
        if (cellMatch) {
          const sm = cellMatch[0].match(/\ss="(\d+)"/);
          const idx = sm ? parseInt(sm[1]) : 0;
          if (idx < xfs.length) {
            const font = fonts[xfs[idx]];
            if (font) {
              const key = `${font.name}|${font.sz}`;
              fontCounts[key] = (fontCounts[key] || 0) + 1;
            }
          }
        }
      }
    }
    // Pick most common font
    const top = Object.entries(fontCounts).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      const [name, sz] = top[0].split('|');
      fontName = name;
      fontSize = parseFloat(sz);
    }
  } catch (e) { /* use defaults */ }
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const hasLocale = row && row[0] && String(row[0]).trim();
    const hasInsegna = row && row[3] && String(row[3]).trim();
    if (!hasLocale && !hasInsegna) {
      // Preserve empty/subtotal separator rows as spacers
      stores.push({ locale: '', insegna: '', isSpacer: true });
      continue;
    }
    let locale = hasLocale ? String(row[0]).trim().toUpperCase() : '';
    const insegna = hasInsegna ? String(row[3]).trim() : '';
    // Se il Unit No è vuoto ma c'è l'insegna, usa il nome normalizzato come chiave locale
    if (!locale && insegna) locale = normalizeName(insegna).toUpperCase();
    stores.push({ locale, insegna });
    if (insegna) {
      const norm = normalizeName(insegna);
      nameToLocale[norm] = locale;
      nameLocaleList.push({ norm, locale });
    }
  }
  return { stores, nameToLocale, nameLocaleList, fontName, fontSize };
}

// --- Main conversion function ---
// rawCsvFile: optional raw comma-delimited CSV (file grezzo da Mallcomm)
export async function convertiFile(csvFile, matriceFile, rawCsvFile) {
  const sourceFile = rawCsvFile || csvFile;
  if (!sourceFile) throw new Error('Nessun file da convertire');
  const rows = await parseSourceFile(sourceFile, !!rawCsvFile);
  if (!rows.length) throw new Error('Nessun dato trovato nel file');

  // Parse matrix template first (if provided) to get store order + name mappings
  let stores = [];
  let nameToLocale = {};
  let nameLocaleList = [];
  let matrixLocales = null;
  let matrixCount = 0;
  let fontName = 'Calibri';
  let fontSize = 11;
  if (matriceFile) {
    const result = await parseMatrixTemplate(matriceFile);
    stores = result.stores;
    nameToLocale = result.nameToLocale;
    nameLocaleList = result.nameLocaleList;
    matrixLocales = new Set(stores.filter(s => !s.isSpacer).map(s => s.locale));
    matrixCount = stores.filter(s => !s.isSpacer).length;
    fontName = result.fontName;
    fontSize = result.fontSize;
  }

  // Aggregate CSV data, using name matching as fallback for empty/non-matching Unit No
  const { byUnit, anomalies, year, centre, formName } = aggregateData(rows, nameToLocale, nameLocaleList, matrixLocales);

  if (!matriceFile) {
    stores = Object.entries(byUnit).map(([locale, d]) => ({ locale, insegna: d.insegna }));
  }

  const matched = new Set();
  let matchedWithData = 0;
  let withoutData = 0;
  const prevYear = year - 1;

  const dataRows = stores.map(store => {
    if (store.isSpacer) {
      return [null, null, null, null, null, null, null, null, null, null];
    }
    const data = byUnit[store.locale] || { fatturato: 0, scontrini: 0 };
    matched.add(store.locale);
    if (byUnit[store.locale]) matchedWithData++;
    else withoutData++;
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

  // Apply font from matrix template to all cells
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[cellRef]) {
        ws[cellRef].s = { font: { name: fontName, sz: fontSize } };
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Matrice');
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

  const filename = `Matrice_${centre || 'centro'}${formName ? '_' + formName : ''}.xlsx`;

  return {
    blob: new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename,
    stats: {
      total: stores.filter(s => !s.isSpacer).length + unmatchedCount,
      matched: matchedWithData,
      unmatched: withoutData,
      year,
      matrixCount,
    },
    anomalies,
  };
}