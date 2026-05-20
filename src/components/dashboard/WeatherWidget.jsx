import React, { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';

const WMO_ICONS = {
  0: { label: 'Sereno', emoji: '☀️' },
  1: { label: 'Prevalentemente sereno', emoji: '🌤️' },
  2: { label: 'Parzialmente nuvoloso', emoji: '⛅' },
  3: { label: 'Nuvoloso', emoji: '☁️' },
  45: { label: 'Nebbia', emoji: '🌫️' },
  48: { label: 'Nebbia gelata', emoji: '🌫️' },
  51: { label: 'Pioggerella leggera', emoji: '🌦️' },
  53: { label: 'Pioggerella', emoji: '🌦️' },
  55: { label: 'Pioggerella intensa', emoji: '🌧️' },
  61: { label: 'Pioggia leggera', emoji: '🌧️' },
  63: { label: 'Pioggia', emoji: '🌧️' },
  65: { label: 'Pioggia intensa', emoji: '🌧️' },
  71: { label: 'Neve leggera', emoji: '🌨️' },
  73: { label: 'Neve', emoji: '❄️' },
  75: { label: 'Neve intensa', emoji: '❄️' },
  80: { label: 'Rovesci leggeri', emoji: '🌦️' },
  81: { label: 'Rovesci', emoji: '🌧️' },
  82: { label: 'Rovesci intensi', emoji: '⛈️' },
  95: { label: 'Temporale', emoji: '⛈️' },
  96: { label: 'Temporale con grandine', emoji: '⛈️' },
  99: { label: 'Temporale forte', emoji: '⛈️' },
};

const getWmo = (code) => WMO_ICONS[code] || { label: '?', emoji: '🌡️' };

export default function WeatherWidget({ citta, provincia, inline, indirizzo }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const location = citta || provincia;

  useEffect(() => {
    if (!location) return;
    loadWeather(location);
  }, [location]);

  const loadWeather = async (loc) => {
    setLoading(true);
    setError(null);
    try {
      // Geocoding
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1&language=it&format=json`
      );
      const geoData = await geoRes.json();
      const place = geoData.results?.[0];
      if (!place) { setError('Luogo non trovato'); setLoading(false); return; }

      // Forecast 7 giorni
      const meteoRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FRome&forecast_days=7`
      );
      const meteoData = await meteoRes.json();
      setWeather({ place, daily: meteoData.daily });
    } catch (e) {
      setError('Errore meteo');
    } finally {
      setLoading(false);
    }
  };

  if (!location) return null;

  if (loading) return (
    <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse">
      <span>🌤️</span><span>Caricamento...</span>
    </div>
  );

  if (error || !weather) return null;

  const { daily } = weather;
  const today = new Date(); today.setHours(0,0,0,0);

  // Modalità inline: 7 giorni che riempiono tutta la riga
  if (inline) {
    const todayWmo = getWmo(daily.weathercode[0]);
    const todayMax = Math.round(daily.temperature_2m_max[0]);
    const todayMin = Math.round(daily.temperature_2m_min[0]);
    return (
      <div className="hidden md:flex gap-2 w-full items-stretch">
        {/* Card oggi - più grande e colorata */}
        <div className="shrink-0 flex items-center gap-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl px-4 py-2.5 shadow-md min-w-[160px]">
          <span className="text-4xl leading-none">{todayWmo.emoji}</span>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-blue-100 uppercase tracking-wide">Oggi · {weather.place.name}</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-white leading-tight">{todayMax}°</span>
              <span className="text-sm font-medium text-blue-200">{todayMin}°</span>
            </div>
            <span className="text-xs text-blue-100 leading-tight">{todayWmo.label}</span>
          </div>
        </div>
        {/* Giorni successivi */}
        <div className="flex gap-1.5 flex-1">
          {daily.time.slice(1).map((dateStr, i) => {
            const idx = i + 1;
            const d = new Date(dateStr);
            const wmo = getWmo(daily.weathercode[idx]);
            const dayLabel = format(d, 'EEE d', { locale: it });
            const maxTemp = Math.round(daily.temperature_2m_max[idx]);
            const minTemp = Math.round(daily.temperature_2m_min[idx]);
            return (
              <div
                key={dateStr}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl bg-white border border-slate-200 shadow-sm"
              >
                <span className="text-xs font-semibold text-slate-500 capitalize">{dayLabel}</span>
                <span className="text-xl leading-none">{wmo.emoji}</span>
                <span className="text-sm font-bold text-slate-800">{maxTemp}°</span>
                <span className="text-xs text-slate-400">{minTemp}°</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <p className="text-xs text-slate-400 mb-1.5">📍 {weather.place.name}</p>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {daily.time.map((dateStr, i) => {
          const d = new Date(dateStr);
          const isToday = d.getTime() === today.getTime();
          const wmo = getWmo(daily.weathercode[i]);
          const dayLabel = isToday ? 'Oggi' : format(d, 'EEE', { locale: it });
          return (
            <div
              key={dateStr}
              className={`flex flex-col items-center min-w-[46px] px-1.5 py-1.5 rounded-lg border text-center shrink-0 ${
                isToday ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <p className={`text-xs font-semibold capitalize ${isToday ? 'text-blue-600' : 'text-slate-600'}`}>{dayLabel}</p>
              <span className="text-lg leading-tight">{wmo.emoji}</span>
              <p className="text-xs font-bold text-slate-800">{Math.round(daily.temperature_2m_max[i])}°</p>
              <p className="text-xs text-slate-400">{Math.round(daily.temperature_2m_min[i])}°</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}