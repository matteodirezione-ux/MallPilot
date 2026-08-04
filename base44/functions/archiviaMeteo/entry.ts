import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Archivia i dati meteo giornalieri dai centri commercialali attivi.
// - Modalita' completa (default): backfill dal 1 gennaio dell'anno passato fino a ieri.
// - Modalita' soloIeri (payload { soloIeri: true }): aggiorna solo il giorno precedente.
// Usa esclusivamente l'API archive di Open-Meteo (dati consolidati/osservati), mai il forecast.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let soloIeri = false;
    try {
      if (req.method === 'POST') {
        const body = await req.json();
        soloIeri = body?.soloIeri === true;
      }
    } catch { /* ignore */ }

    const oggi = new Date(); oggi.setHours(0, 0, 0, 0);
    const ieri = new Date(oggi); ieri.setDate(ieri.getDate() - 1);
    const ieriStr = ieri.toISOString().split('T')[0];

    // Range date
    let startStr: string;
    let endStr: string;
    if (soloIeri) {
      startStr = ieriStr;
      endStr = ieriStr;
    } else {
      const startYear = oggi.getFullYear() - 1;
      startStr = `${startYear}-01-01`;
      endStr = ieriStr;
    }

    const centri = await base44.asServiceRole.entities.CentroCommerciale.filter({ attivo: true });
    const results = [];

    for (const centro of centri) {
      if (!centro.citta) { results.push({ centro: centro.nome, skipped: 'no citta' }); continue; }

      // Geocoding citta -> coordinate
      let lat: number, lon: number;
      try {
        const gres = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(centro.citta)}&count=1&language=it&format=json`);
        const gdata = await gres.json();
        const place = gdata?.results?.[0];
        if (!place) { results.push({ centro: centro.nome, skipped: 'geocoding fallito' }); continue; }
        lat = place.latitude; lon = place.longitude;
      } catch {
        results.push({ centro: centro.nome, skipped: 'errore geocoding' }); continue;
      }

      // Fetch archive Open-Meteo (dati storici consolidati)
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FRome&start_date=${startStr}&end_date=${endStr}`;
      let daily: any;
      try {
        const res = await fetch(url);
        const data = await res.json();
        daily = data?.daily;
        if (!daily?.time || !Array.isArray(daily.time)) { results.push({ centro: centro.nome, skipped: 'no dati archive' }); continue; }
      } catch {
        results.push({ centro: centro.nome, skipped: 'errore fetch archive' }); continue;
      }

      // Carica record esistenti per questo centro (upsert per data)
      const existing = await base44.asServiceRole.entities.MeteoGiornaliero.filter({ centro_id: centro.id });
      const existingMap: Record<string, string> = {};
      for (const r of existing) { if (r.data) existingMap[r.data] = r.id; }

      const toCreate = [];
      const toUpdate = [];
      for (let i = 0; i < daily.time.length; i++) {
        const data = daily.time[i];
        const payload = {
          centro_id: centro.id,
          data,
          weather_code: daily.weather_code[i],
          temp_max: daily.temperature_2m_max[i],
          temp_min: daily.temperature_2m_min[i],
        };
        if (existingMap[data]) {
          toUpdate.push({ id: existingMap[data], ...payload });
        } else {
          toCreate.push(payload);
        }
      }
      if (toCreate.length) await base44.asServiceRole.entities.MeteoGiornaliero.bulkCreate(toCreate);
      if (toUpdate.length) await base44.asServiceRole.entities.MeteoGiornaliero.bulkUpdate(toUpdate);
      results.push({ centro: centro.nome, giorni: daily.time.length, created: toCreate.length, updated: toUpdate.length });
    }

    return Response.json({ success: true, soloIeri, range: { start: startStr, end: endStr }, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});