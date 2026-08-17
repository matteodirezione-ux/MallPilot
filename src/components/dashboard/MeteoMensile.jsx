import React, { useState, useEffect } from 'react';
import { format, getDaysInMonth, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, FileDown, GitCompareArrows } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MeteoConfrontoPeriodi from './MeteoConfrontoPeriodi';

const WMO_ICONS = {
  0: { label: 'Sereno', emoji: '☀️', rank: 0 },
  1: { label: 'Prev. sereno', emoji: '🌤️', rank: 1 },
  2: { label: 'Parz. nuvoloso', emoji: '⛅', rank: 2 },
  3: { label: 'Nuvoloso', emoji: '☁️', rank: 3 },
  45: { label: 'Nebbia', emoji: '🌫️', rank: 4 },
  48: { label: 'Nebbia gelata', emoji: '🌫️', rank: 4 },
  51: { label: 'Pioggerella', emoji: '🌦️', rank: 5 },
  53: { label: 'Pioggerella', emoji: '🌦️', rank: 5 },
  55: { label: 'Pioggerella int.', emoji: '🌧️', rank: 6 },
  61: { label: 'Pioggia lieve', emoji: '🌧️', rank: 6 },
  63: { label: 'Pioggia', emoji: '🌧️', rank: 7 },
  65: { label: 'Pioggia int.', emoji: '🌧️', rank: 7 },
  71: { label: 'Neve lieve', emoji: '🌨️', rank: 8 },
  73: { label: 'Neve', emoji: '❄️', rank: 8 },
  75: { label: 'Neve int.', emoji: '❄️', rank: 8 },
  80: { label: 'Rovesci', emoji: '🌦️', rank: 6 },
  81: { label: 'Rovesci', emoji: '🌧️', rank: 7 },
  82: { label: 'Rovesci int.', emoji: '⛈️', rank: 9 },
  95: { label: 'Temporale', emoji: '⛈️', rank: 9 },
  96: { label: 'Temporale+gr.', emoji: '⛈️', rank: 10 },
  99: { label: 'Temporale forte', emoji: '⛈️', rank: 10 },
};

const getWmo = (code) => WMO_ICONS[code] ?? WMO_ICONS[Math.max(...Object.keys(WMO_ICONS).map(Number).filter(k => k <= (code ?? 0)))] ?? { label: '—', emoji: '🌡️', rank: 0 };

// Costruisce un oggetto "mese" con la stessa forma della risposta daily di Open-Meteo,
// a partire dai record archiviati (indicizzati per giorno del mese).
function buildMonthData(records, year, month) {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
  const weather_code = new Array(daysInMonth).fill(null);
  const temperature_2m_max = new Array(daysInMonth).fill(null);
  const temperature_2m_min = new Array(daysInMonth).fill(null);
  const time = [];
  for (let d = 1; d <= daysInMonth; d++) {
    time.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  for (const r of records) {
    if (!r.data) continue;
    const parts = r.data.split('-');
    const yy = Number(parts[0]); const mm = Number(parts[1]); const dd = Number(parts[2]);
    if (yy !== year || mm !== month) continue;
    const idx = dd - 1;
    if (idx < 0 || idx >= daysInMonth) continue;
    weather_code[idx] = r.weather_code ?? null;
    temperature_2m_max[idx] = r.temp_max ?? null;
    temperature_2m_min[idx] = r.temp_min ?? null;
  }
  return { weather_code, temperature_2m_max, temperature_2m_min, time };
}

// Codici meteo "piatti" da gennaio fino a endMonth (per i progressivi YTD).
function flatCodes(records, year, endMonth, capToToday) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const codes = [];
  for (let m = 1; m <= endMonth; m++) {
    const md = buildMonthData(records, year, m);
    md.weather_code.forEach((code, i) => {
      if (code === null || code === undefined) return;
      if (capToToday) {
        const d = new Date(year, m - 1, i + 1);
        if (d > now) return;
      }
      codes.push(code);
    });
  }
  return codes;
}

export default function MeteoMensile({ citta, provincia, centroId }) {
  const location = citta || provincia;
  const now = new Date();
  const [meseCorrente, setMeseCorrente] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [mesePrecedente, setMesePrecedente] = useState(null);
  const [records, setRecords] = useState([]);
  const [placeName, setPlaceName] = useState(citta || '');
  const [dataCorrente, setDataCorrente] = useState(null);
  const [dataPrecedente, setDataPrecedente] = useState(null);
  const [progressivoCorrente, setProgressivoCorrente] = useState(null);
  const [progressivoPrecedente, setProgressivoPrecedente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confrontoOpen, setConfrontoOpen] = useState(false);
  const [confrontoAttivo, setConfrontoAttivo] = useState(null);
  const [periodoA, setPeriodoA] = useState({ start: '', end: '' });
  const [periodoB, setPeriodoB] = useState({ start: '', end: '' });

  // Mese di confronto: stesso mese dell'anno precedente
  useEffect(() => {
    if (!location) return;
    setMesePrecedente({ year: meseCorrente.year - 1, month: meseCorrente.month });
  }, [meseCorrente, location]);

  // Carica tutti i record meteo archiviati per il centro (una sola volta)
  useEffect(() => {
    if (!centroId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const all = await base44.entities.MeteoGiornaliero.filter({ centro_id: centroId }, 'data', 2000);
        if (cancelled) return;
        setRecords(all);
        setPlaceName(citta || '');
      } catch {
        if (!cancelled) setError('Errore caricamento dati meteo archiviati');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [centroId, citta]);

  // Ricalcola i dati visualizzati a partire dai record archiviati (no chiamate API per mese)
  useEffect(() => {
    if (records.length === 0) {
      setDataCorrente(null); setDataPrecedente(null);
      setProgressivoCorrente(null); setProgressivoPrecedente(null);
      return;
    }
    const realNow = new Date();
    const realYear = realNow.getFullYear();
    const realMonth = realNow.getMonth() + 1;
    const isFuture = meseCorrente.year > realYear || (meseCorrente.year === realYear && meseCorrente.month > realMonth);
    const ytdEndC = isFuture ? realMonth : meseCorrente.month;
    const ytdEndP = mesePrecedente ? mesePrecedente.month : 0;

    setDataCorrente(buildMonthData(records, meseCorrente.year, meseCorrente.month));
    setDataPrecedente(mesePrecedente ? buildMonthData(records, mesePrecedente.year, mesePrecedente.month) : null);
    setProgressivoCorrente(flatCodes(records, meseCorrente.year, ytdEndC, true));
    setProgressivoPrecedente(mesePrecedente ? flatCodes(records, mesePrecedente.year, ytdEndP, false) : null);
  }, [records, meseCorrente, mesePrecedente]);

  const navigate = (dir) => {
    setMeseCorrente(prev => {
      let m = prev.month + dir;
      let y = prev.year;
      if (m > 12) { m = 1; y++; }
      if (m < 1) { m = 12; y--; }
      return { year: y, month: m };
    });
  };

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const todayDate = new Date(); todayDate.setHours(0,0,0,0);
    const labelC = format(new Date(meseCorrente.year, meseCorrente.month - 1, 1), 'MMMM yyyy', { locale: it });
    const labelP = format(new Date(mesePrecedente.year, mesePrecedente.month - 1, 1), 'MMMM yyyy', { locale: it });

    const countDaysPdf = (data, year, month, filterFn, capToToday) => {
      if (!data?.weather_code) return null;
      return data.weather_code.filter((code, i) => {
        if (capToToday) { const d = new Date(year, month - 1, i + 1); if (d > todayDate) return false; }
        return filterFn(getWmo(code));
      }).length;
    };
    const avgTempPdf = (data, year, month, capToToday) => {
      if (!data?.temperature_2m_max || !data?.temperature_2m_min) return null;
      let sum = 0, count = 0;
      data.temperature_2m_max.forEach((max, i) => {
        if (capToToday) { const d = new Date(year, month - 1, i + 1); if (d > todayDate) return; }
        sum += (max + (data.temperature_2m_min[i] ?? max)) / 2; count++;
      });
      return count ? +(sum / count).toFixed(1) : null;
    };
    const countFromCodesPdf = (codes, filterFn) => codes ? codes.filter(c => filterFn(getWmo(c))).length : null;

    const soleC = countDaysPdf(dataCorrente, meseCorrente.year, meseCorrente.month, w => w.rank <= 2, true);
    const soleP = countDaysPdf(dataPrecedente, mesePrecedente.year, mesePrecedente.month, w => w.rank <= 2, false);
    const piogC = countDaysPdf(dataCorrente, meseCorrente.year, meseCorrente.month, w => w.rank >= 5, true);
    const piogP = countDaysPdf(dataPrecedente, mesePrecedente.year, mesePrecedente.month, w => w.rank >= 5, false);
    const tempC = avgTempPdf(dataCorrente, meseCorrente.year, meseCorrente.month, true);
    const tempP = avgTempPdf(dataPrecedente, mesePrecedente.year, mesePrecedente.month, false);
    const ytdSoleC = countFromCodesPdf(progressivoCorrente, w => w.rank <= 2);
    const ytdSoleP = countFromCodesPdf(progressivoPrecedente, w => w.rank <= 2);
    const ytdPiogC = countFromCodesPdf(progressivoCorrente, w => w.rank >= 5);
    const ytdPiogP = countFromCodesPdf(progressivoPrecedente, w => w.rank >= 5);

    const fmtDelta = (val) => val === null ? '-' : (val > 0 ? `+${val}` : `${val}`);
    const fmtVal = (val, unit = '') => val !== null && val !== undefined ? `${val}${unit}` : '-';

    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text(`Meteo - ${placeName} - ${labelC.charAt(0).toUpperCase() + labelC.slice(1)}`, 14, 12);

    const cardY = 17;
    const cardH = 16;
    const cardW = 60;
    const cardGap = 5;

    const cardsData = [
      {
        label: 'Giorni Sereni',
        line1: `${meseCorrente.year}: ${fmtVal(soleC, ' gg')}   ${mesePrecedente.year}: ${fmtVal(soleP, ' gg')}   Delta: ${fmtDelta(soleC !== null && soleP !== null ? soleC - soleP : null)}`,
        line2: `YTD: ${fmtVal(ytdSoleC, ' gg')} vs ${fmtVal(ytdSoleP, ' gg')}  Delta: ${fmtDelta(ytdSoleC !== null && ytdSoleP !== null ? ytdSoleC - ytdSoleP : null)}`,
        r: 245, g: 158, b: 11
      },
      {
        label: 'Giorni Pioggia',
        line1: `${meseCorrente.year}: ${fmtVal(piogC, ' gg')}   ${mesePrecedente.year}: ${fmtVal(piogP, ' gg')}   Delta: ${fmtDelta(piogC !== null && piogP !== null ? piogC - piogP : null)}`,
        line2: `YTD: ${fmtVal(ytdPiogC, ' gg')} vs ${fmtVal(ytdPiogP, ' gg')}  Delta: ${fmtDelta(ytdPiogC !== null && ytdPiogP !== null ? ytdPiogC - ytdPiogP : null)}`,
        r: 59, g: 130, b: 246
      },
      {
        label: 'Temp. Media',
        line1: `${meseCorrente.year}: ${fmtVal(tempC, 'C')}   ${mesePrecedente.year}: ${fmtVal(tempP, 'C')}   Delta: ${fmtDelta(tempC !== null && tempP !== null ? +(tempC - tempP).toFixed(1) : null)}`,
        line2: null,
        r: 249, g: 115, b: 22
      },
    ];

    cardsData.forEach((card, ci) => {
      const cx = 10 + ci * (cardW + cardGap);
      doc.setFillColor(card.r, card.g, card.b);
      doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(card.label.toUpperCase(), cx + 3, cardY + 5);
      doc.setFontSize(6.5);
      doc.text(card.line1, cx + 3, cardY + 10, { maxWidth: cardW - 4 });
      if (card.line2) doc.text(card.line2, cx + 3, cardY + 15, { maxWidth: cardW - 4 });
    });

    const dC = getDaysInMonth(new Date(meseCorrente.year, meseCorrente.month - 1, 1));
    const dP = getDaysInMonth(new Date(mesePrecedente.year, mesePrecedente.month - 1, 1));

    const colW = [16, 32, 10, 10, 32, 10, 10, 22, 10];
    const startX = 10;
    const rowH = 5;
    let y = cardY + cardH + 6;

    doc.setFontSize(8);
    let x = startX;

    doc.setFillColor(30, 58, 95);
    doc.setTextColor(255, 255, 255);
    doc.rect(x, y, colW[0], rowH, 'F');
    x += colW[0];

    const wC = colW[1] + colW[2] + colW[3];
    doc.setFillColor(59, 130, 246);
    doc.rect(x, y, wC, rowH, 'F');
    doc.text(labelC.charAt(0).toUpperCase() + labelC.slice(1), x + wC / 2, y + 4, { align: 'center' });
    x += wC;

    const wP = colW[4] + colW[5] + colW[6];
    doc.setFillColor(100, 116, 139);
    doc.rect(x, y, wP, rowH, 'F');
    doc.text(labelP.charAt(0).toUpperCase() + labelP.slice(1), x + wP / 2, y + 4, { align: 'center' });
    x += wP;

    const wD = colW[7] + colW[8];
    doc.setFillColor(234, 88, 12);
    doc.rect(x, y, wD, rowH, 'F');
    doc.text('Delta', x + wD / 2, y + 4, { align: 'center' });
    y += rowH;

    const subCols = ['Giorno', 'Condizione', 'Max', 'Min', 'Condizione', 'Max', 'Min', 'Stato', 'Delta T'];
    const subColors = [
      [30, 58, 95],
      [59, 130, 246], [59, 130, 246], [59, 130, 246],
      [100, 116, 139], [100, 116, 139], [100, 116, 139],
      [234, 88, 12], [234, 88, 12],
    ];
    doc.setFontSize(7);
    x = startX;
    subCols.forEach((col, idx) => {
      doc.setFillColor(...subColors[idx]);
      doc.setTextColor(255, 255, 255);
      doc.rect(x, y, colW[idx], rowH, 'F');
      doc.text(col, x + 1, y + 4, { maxWidth: colW[idx] - 2 });
      x += colW[idx];
    });
    y += rowH;

    for (let i = 0; i < Math.max(dC, dP); i++) {
      const day = i + 1;
      const thisDayDate = new Date(meseCorrente.year, meseCorrente.month - 1, day);
      const isFuture = thisDayDate > todayDate;
      const weekDay = format(thisDayDate, 'EEE', { locale: it });

      const cValid = !!dataCorrente && i < dC && !isFuture && i < (dataCorrente?.time?.length ?? 0);
      const cCode = cValid ? dataCorrente.weather_code?.[i] : null;
      const cMax = cValid ? Math.round(dataCorrente.temperature_2m_max?.[i] ?? 0) : null;
      const cMin = cValid ? Math.round(dataCorrente.temperature_2m_min?.[i] ?? 0) : null;
      const cWmo = cCode !== null && cCode !== undefined ? getWmo(cCode) : null;

      const pValid = !!dataPrecedente && i < dP && i < (dataPrecedente?.time?.length ?? 0);
      const pCode = pValid ? dataPrecedente.weather_code?.[i] : null;
      const pMax = pValid ? Math.round(dataPrecedente.temperature_2m_max?.[i] ?? 0) : null;
      const pMin = pValid ? Math.round(dataPrecedente.temperature_2m_min?.[i] ?? 0) : null;
      const pWmo = pCode !== null && pCode !== undefined ? getWmo(pCode) : null;

      const deltaT = (cMax !== null && pMax !== null) ? cMax - pMax : null;
      const deltaM = (cWmo && pWmo) ? cWmo.rank - pWmo.rank : null;
      const deltaMLabel = deltaM === null ? '-' : deltaM > 1 ? 'Peggio' : deltaM < -1 ? 'Meglio' : 'Simile';

      const safeLabel = (wmo) => wmo ? wmo.label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\xFF]/g, '') : '-';

      const cells = [
        `${day} ${weekDay}`,
        safeLabel(cWmo),
        cMax !== null ? `${cMax}C` : '-',
        cMin !== null ? `${cMin}C` : '-',
        safeLabel(pWmo),
        pMax !== null ? `${pMax}C` : '-',
        pMin !== null ? `${pMin}C` : '-',
        deltaMLabel,
        deltaT !== null ? `${deltaT > 0 ? '+' : ''}${deltaT}C` : '-',
      ];

      if (i % 2 === 0) {
        doc.setFillColor(245, 247, 250);
        x = startX;
        colW.forEach(w => { doc.rect(x, y, w, rowH, 'F'); x += w; });
      }

      doc.setTextColor(30, 41, 59);
      x = startX;
      cells.forEach((cell, idx) => {
        doc.text(String(cell), x + 1, y + 4, { maxWidth: colW[idx] - 2 });
        x += colW[idx];
      });
      y += rowH;
    }

    doc.save(`meteo_${placeName}_${meseCorrente.year}_${String(meseCorrente.month).padStart(2,'0')}.pdf`);
  };

  if (!location) return null;

  const daysInMonth = meseCorrente ? getDaysInMonth(new Date(meseCorrente.year, meseCorrente.month - 1, 1)) : 0;
  const daysInPrevMonth = mesePrecedente ? getDaysInMonth(new Date(mesePrecedente.year, mesePrecedente.month - 1, 1)) : 0;

  const labelCorrente = meseCorrente ? format(new Date(meseCorrente.year, meseCorrente.month - 1, 1), 'MMMM yyyy', { locale: it }) : '';
  const labelPrecedente = mesePrecedente ? format(new Date(mesePrecedente.year, mesePrecedente.month - 1, 1), 'MMMM yyyy', { locale: it }) : '';

  if (confrontoAttivo) {
    return (
      <MeteoConfrontoPeriodi
        records={records}
        periodoA={confrontoAttivo.a}
        periodoB={confrontoAttivo.b}
        placeName={placeName}
        onChiudi={() => setConfrontoAttivo(null)}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.12)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌤️</span>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Tabella Meteo Mensile</h3>
            {placeName && <p className="text-xs text-slate-500">📍 {placeName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-white/70 transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-xs font-semibold text-slate-700 min-w-[120px] text-center capitalize">{labelCorrente}</span>
            <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-white/70 transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
          <button
            onClick={() => setConfrontoOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700 shadow-sm"
          >
            <GitCompareArrows className="w-3.5 h-3.5" />
            Confronta periodi
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700 shadow-sm"
          >
            <FileDown className="w-3.5 h-3.5" />
            PDF
          </button>
        </div>
      </div>

      {/* Dialog confronto periodi */}
      {confrontoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfrontoOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Confronta due periodi</h3>
              <button onClick={() => setConfrontoOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Seleziona due intervalli di date personalizzati per confrontarli.</p>
            <div className="space-y-4">
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
                <p className="text-xs font-semibold text-indigo-700 mb-2">Periodo A</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase">Dal</label>
                    <input type="date" value={periodoA.start} onChange={(e) => setPeriodoA({ ...periodoA, start: e.target.value })} className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase">Al</label>
                    <input type="date" value={periodoA.end} onChange={(e) => setPeriodoA({ ...periodoA, end: e.target.value })} className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5" />
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-purple-100 bg-purple-50/40 p-3">
                <p className="text-xs font-semibold text-purple-700 mb-2">Periodo B</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase">Dal</label>
                    <input type="date" value={periodoB.start} onChange={(e) => setPeriodoB({ ...periodoB, start: e.target.value })} className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase">Al</label>
                    <input type="date" value={periodoB.end} onChange={(e) => setPeriodoB({ ...periodoB, end: e.target.value })} className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfrontoOpen(false)} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Annulla</button>
              <button
                onClick={() => {
                  if (periodoA.start && periodoA.end && periodoB.start && periodoB.end) {
                    setConfrontoAttivo({ a: { ...periodoA }, b: { ...periodoB } });
                    setConfrontoOpen(false);
                  }
                }}
                disabled={!(periodoA.start && periodoA.end && periodoB.start && periodoB.end)}
                className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confronta
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2 animate-pulse">
          <span>🌤️</span><span>Caricamento dati meteo...</span>
        </div>
      )}
      {error && <div className="text-center py-6 text-red-500 text-sm">{error}</div>}
      {!loading && !error && records.length === 0 && (
        <div className="text-center py-10 text-slate-400 text-sm">
          <span className="text-2xl block mb-2">📊</span>
          Nessun dato meteo archiviato per questo centro.
        </div>
      )}

      {!loading && !error && records.length > 0 && dataPrecedente && (() => {
        const todayDate = new Date(); todayDate.setHours(0,0,0,0);

        const countDays = (data, year, month, filterFn, capToToday) => {
          if (!data?.weather_code) return null;
          return data.weather_code.filter((code, i) => {
            if (capToToday) {
              const d = new Date(year, month - 1, i + 1);
              if (d > todayDate) return false;
            }
            if (code === null || code === undefined) return false;
            return filterFn(getWmo(code));
          }).length;
        };

        const avgTemp = (data, year, month, capToToday) => {
          if (!data?.temperature_2m_max || !data?.temperature_2m_min) return null;
          let sum = 0, count = 0;
          data.temperature_2m_max.forEach((max, i) => {
            if (capToToday) {
              const d = new Date(year, month - 1, i + 1);
              if (d > todayDate) return;
            }
            if (max === null || max === undefined) return;
            const min = data.temperature_2m_min[i] ?? max;
            sum += (max + min) / 2;
            count++;
          });
          return count ? +(sum / count).toFixed(1) : null;
        };

        const soleC = countDays(dataCorrente, meseCorrente.year, meseCorrente.month, w => w.rank <= 2, true);
        const soleP = countDays(dataPrecedente, mesePrecedente.year, mesePrecedente.month, w => w.rank <= 2, false);
        const piogC = countDays(dataCorrente, meseCorrente.year, meseCorrente.month, w => w.rank >= 5, true);
        const piogP = countDays(dataPrecedente, mesePrecedente.year, mesePrecedente.month, w => w.rank >= 5, false);

        const countFromCodes = (codes, filterFn) => codes ? codes.filter(c => filterFn(getWmo(c))).length : null;
        const ytdSoleC = countFromCodes(progressivoCorrente, w => w.rank <= 2);
        const ytdSoleP = countFromCodes(progressivoPrecedente, w => w.rank <= 2);
        const ytdPiogC = countFromCodes(progressivoCorrente, w => w.rank >= 5);
        const ytdPiogP = countFromCodes(progressivoPrecedente, w => w.rank >= 5);
        const tempC = avgTemp(dataCorrente, meseCorrente.year, meseCorrente.month, true);
        const tempP = avgTemp(dataPrecedente, mesePrecedente.year, mesePrecedente.month, false);
        const deltaSole = (soleC !== null && soleP !== null) ? soleC - soleP : null;
        const deltaPiog = (piogC !== null && piogP !== null) ? piogC - piogP : null;
        const deltaTemp = (tempC !== null && tempP !== null) ? +(tempC - tempP).toFixed(1) : null;

        const DeltaBadge = ({ val, invert }) => {
          if (val === null || val === undefined) return null;
          const positive = invert ? val < 0 : val > 0;
          return (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${val === 0 ? 'bg-slate-100 text-slate-500' : positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {val > 0 ? '+' : ''}{val}{typeof val === 'number' && !Number.isInteger(val) ? '' : ''}
            </span>
          );
        };

        return (
          <>
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-slate-100">
              {/* Card Sole */}
              <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-amber-50 border border-amber-100 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xl">☀️</span>
                  <span className="text-xs font-semibold text-amber-700">Giorni sereni/nuvolosi</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-amber-800">{soleC !== null ? soleC : '—'}</span>
                    <span className="text-xs text-amber-600">{meseCorrente.year}</span>
                    <span className="text-slate-300 text-xs">vs</span>
                    <span className="text-base font-medium text-amber-500">{soleP}</span>
                    <span className="text-xs text-amber-400">{mesePrecedente?.year}</span>
                  </div>
                  <DeltaBadge val={deltaSole} invert={false} />
                </div>
                <div className="mt-2 pt-2 border-t border-amber-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Progressivo anno</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-amber-800">{ytdSoleC !== null ? ytdSoleC : '—'}</span>
                        <span className="text-xs text-amber-500">{meseCorrente.year}</span>
                        <span className="text-slate-300 text-xs">vs</span>
                        <span className="text-sm font-medium text-amber-400">{ytdSoleP !== null ? ytdSoleP : '—'}</span>
                        <span className="text-xs text-amber-300">{mesePrecedente?.year}</span>
                      </div>
                    </div>
                    <DeltaBadge val={(ytdSoleC !== null && ytdSoleP !== null) ? ytdSoleC - ytdSoleP : null} invert={false} />
                  </div>
                </div>
              </div>
              {/* Card Pioggia */}
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xl">🌧️</span>
                  <span className="text-xs font-semibold text-blue-700">Giorni di pioggia</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-blue-800">{piogC !== null ? piogC : '—'}</span>
                    <span className="text-xs text-blue-600">{meseCorrente.year}</span>
                    <span className="text-slate-300 text-xs">vs</span>
                    <span className="text-base font-medium text-blue-400">{piogP}</span>
                    <span className="text-xs text-blue-300">{mesePrecedente?.year}</span>
                  </div>
                  <DeltaBadge val={deltaPiog} invert={true} />
                </div>
                <div className="mt-2 pt-2 border-t border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1">Progressivo anno</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-blue-800">{ytdPiogC !== null ? ytdPiogC : '—'}</span>
                        <span className="text-xs text-blue-500">{meseCorrente.year}</span>
                        <span className="text-slate-300 text-xs">vs</span>
                        <span className="text-sm font-medium text-blue-300">{ytdPiogP !== null ? ytdPiogP : '—'}</span>
                        <span className="text-xs text-blue-200">{mesePrecedente?.year}</span>
                      </div>
                    </div>
                    <DeltaBadge val={(ytdPiogC !== null && ytdPiogP !== null) ? ytdPiogC - ytdPiogP : null} invert={true} />
                  </div>
                </div>
              </div>
              {/* Card Temperatura */}
              <div className="rounded-xl bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xl">🌡️</span>
                  <span className="text-xs font-semibold text-orange-700">Temperatura media</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-orange-800">{tempC !== null ? `${tempC}°` : '—'}</span>
                    <span className="text-xs text-orange-600">{meseCorrente.year}</span>
                    <span className="text-slate-300 text-xs">vs</span>
                    <span className="text-base font-medium text-orange-400">{tempP !== null ? `${tempP}°` : '—'}</span>
                    <span className="text-xs text-orange-300">{mesePrecedente?.year}</span>
                  </div>
                  <DeltaBadge val={deltaTemp} invert={false} />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600 border-b border-slate-200 z-10 w-10">Giorno</th>
                {/* Anno corrente */}
                <th colSpan={3} className="px-2 py-2 text-center font-semibold text-blue-700 border-b border-slate-200 bg-blue-50 capitalize">
                  {labelCorrente}
                </th>
                {/* Anno precedente */}
                <th colSpan={3} className="px-2 py-2 text-center font-semibold text-slate-600 border-b border-slate-200 capitalize">
                  {labelPrecedente}
                </th>
                {/* Delta */}
                <th colSpan={2} className="px-2 py-2 text-center font-semibold text-orange-700 border-b border-slate-200 bg-orange-50">
                  Delta
                </th>
              </tr>
              <tr className="bg-slate-50 text-[10px] text-slate-500">
                <th className="sticky left-0 bg-slate-50 px-3 py-1 border-b border-slate-100 z-10"></th>
                <th className="px-2 py-1 border-b border-slate-100 bg-blue-50 text-blue-600">Meteo</th>
                <th className="px-2 py-1 border-b border-slate-100 bg-blue-50 text-blue-600">Max</th>
                <th className="px-2 py-1 border-b border-slate-100 bg-blue-50 text-blue-600">Min</th>
                <th className="px-2 py-1 border-b border-slate-100">Meteo</th>
                <th className="px-2 py-1 border-b border-slate-100">Max</th>
                <th className="px-2 py-1 border-b border-slate-100">Min</th>
                <th className="px-2 py-1 border-b border-slate-100 bg-orange-50 text-orange-600">Stato</th>
                <th className="px-2 py-1 border-b border-slate-100 bg-orange-50 text-orange-600">ΔMax °C</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(daysInMonth, daysInPrevMonth) }, (_, i) => {
                const day = i + 1;
                const todayDate = new Date(); todayDate.setHours(0,0,0,0);
                const thisDayDate = new Date(meseCorrente.year, meseCorrente.month - 1, day);
                const isToday = thisDayDate.getTime() === todayDate.getTime();
                const isFuture = thisDayDate > todayDate;

                const cIdx = day - 1;
                const cValid = !!dataCorrente && cIdx < daysInMonth && cIdx < (dataCorrente?.time?.length ?? 0) && !isFuture;
                const cCode = cValid ? dataCorrente.weather_code?.[cIdx] : null;
                const cMax = cValid ? Math.round(dataCorrente.temperature_2m_max?.[cIdx] ?? 0) : null;
                const cMin = cValid ? Math.round(dataCorrente.temperature_2m_min?.[cIdx] ?? 0) : null;
                const cWmo = cCode !== null && cCode !== undefined ? getWmo(cCode) : null;

                const pIdx = day - 1;
                const pValid = pIdx < daysInPrevMonth && pIdx < (dataPrecedente?.time?.length ?? 0);
                const pCode = pValid ? dataPrecedente.weather_code?.[pIdx] : null;
                const pMax = pValid ? Math.round(dataPrecedente.temperature_2m_max?.[pIdx] ?? 0) : null;
                const pMin = pValid ? Math.round(dataPrecedente.temperature_2m_min?.[pIdx] ?? 0) : null;
                const pWmo = pCode !== null && pCode !== undefined ? getWmo(pCode) : null;

                const deltaTemp = (cMax !== null && pMax !== null) ? cMax - pMax : null;
                const deltaMeteo = (cWmo && pWmo) ? cWmo.rank - pWmo.rank : null;

                let deltaTempColor = 'text-slate-500';
                if (deltaTemp !== null) {
                  if (deltaTemp > 2) deltaTempColor = 'text-red-600 font-semibold';
                  else if (deltaTemp < -2) deltaTempColor = 'text-blue-600 font-semibold';
                }

                let deltaMeteoLabel = '—';
                let deltaMeteoColor = 'text-slate-400';
                if (deltaMeteo !== null) {
                  if (deltaMeteo > 1) { deltaMeteoLabel = '↓ Peggio'; deltaMeteoColor = 'text-red-500 font-medium'; }
                  else if (deltaMeteo < -1) { deltaMeteoLabel = '↑ Meglio'; deltaMeteoColor = 'text-green-600 font-medium'; }
                  else { deltaMeteoLabel = '≈ Simile'; deltaMeteoColor = 'text-slate-500'; }
                }

                const weekDay = format(thisDayDate, 'EEE', { locale: it });

                return (
                  <tr key={day} className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors ${isToday ? 'bg-blue-50' : ''}`}>
                    <td className={`sticky left-0 px-3 py-1.5 font-semibold z-10 ${isToday ? 'bg-blue-100 text-blue-700' : 'bg-white text-slate-700'}`}>
                      <span>{day}</span>
                      <span className="ml-1 text-[9px] font-normal text-slate-400 uppercase">{weekDay}</span>
                    </td>
                    {/* Anno corrente */}
                    <td className="px-2 py-1.5 text-center bg-blue-50/40">
                      {cWmo ? <span title={cWmo.label}>{cWmo.emoji}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center bg-blue-50/40 font-medium text-red-500">
                      {cMax !== null ? `${cMax}°` : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-center bg-blue-50/40 text-slate-500">
                      {cMin !== null ? `${cMin}°` : '—'}
                    </td>
                    {/* Anno precedente */}
                    <td className="px-2 py-1.5 text-center">
                      {pWmo ? <span title={pWmo.label}>{pWmo.emoji}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center font-medium text-red-400">
                      {pMax !== null ? `${pMax}°` : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-center text-slate-400">
                      {pMin !== null ? `${pMin}°` : '—'}
                    </td>
                    {/* Delta */}
                    <td className={`px-2 py-1.5 text-center bg-orange-50/40 ${deltaMeteoColor}`}>
                      {deltaMeteoLabel}
                    </td>
                    <td className={`px-2 py-1.5 text-center bg-orange-50/40 ${deltaTempColor}`}>
                      {deltaTemp !== null ? `${deltaTemp > 0 ? '+' : ''}${deltaTemp}°` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
          </>
        );
      })()}
    </div>
  );
}