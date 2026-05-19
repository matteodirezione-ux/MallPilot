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

export default function WeatherWidget({ citta, provincia, inline }) {
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
    return (
      <div className="flex gap-2 w-full">
        {daily.time.map((dateStr, i) => {
          const d = new Date(dateStr);
          const isToday = d.getTime() === today.getTime();
          const wmo = getWmo(daily.weathercode[i]);
          const dayLabel = isToday ? 'Oggi' : format(d, 'EEE d', { locale: it });
          const maxTemp = Math.round(daily.temperature_2m_max[i]);
          const minTemp = Math.round(daily.temperature_2m_min[i]);
          return (
            <div
              key={dateStr}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-1.5 rounded-xl border text-center ${
                isToday ? 'bg-gradient-to-b from-blue-50 to-blue-100/50 border-blue-300 shadow-sm' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <span className={`text-xs font-bold uppercase tracking-tight ${isToday ? 'text-blue-700' : 'text-slate-600'}`}>{dayLabel}</span>
              <span className="text-2xl leading-none my-0.5">{wmo.emoji}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-slate-800">{maxTemp}°</span>
                <span className="text-xs font-medium text-slate-400">{minTemp}°</span>
              </div>
            </div>
          );
        })}
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