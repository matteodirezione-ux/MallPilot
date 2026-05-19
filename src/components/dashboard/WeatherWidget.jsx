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

export default function WeatherWidget({ citta, provincia }) {
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
      <span>🌤️</span><span>Caricamento meteo...</span>
    </div>
  );

  if (error) return (
    <div className="text-xs text-slate-400">{error}</div>
  );

  if (!weather) return null;

  const { daily } = weather;
  const today = new Date(); today.setHours(0,0,0,0);

  // Solo il giorno di oggi inline
  const todayIdx = daily.time.findIndex(dateStr => new Date(dateStr).getTime() === today.getTime());
  const idx = todayIdx >= 0 ? todayIdx : 0;
  const wmo = getWmo(daily.weathercode[idx]);

  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
      <span>{wmo.emoji}</span>
      <span>{Math.round(daily.temperature_2m_max[idx])}° / {Math.round(daily.temperature_2m_min[idx])}°</span>
    </span>
  );
}