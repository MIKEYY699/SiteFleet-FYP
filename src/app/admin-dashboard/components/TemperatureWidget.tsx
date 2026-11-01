'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronDown, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentProject } from '@/lib/ProjectContext';
import { useRole } from '@/lib/RoleContext';
import { fetchWeather, geocodeLocation, weatherIcon, weatherLabel, WeatherSnapshot } from '@/lib/weather';

interface WeatherLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export default function TemperatureWidget() {
  const { currentProjectId, ready } = useCurrentProject();
  const { isOperator } = useRole();
  const [locations, setLocations] = useState<WeatherLocation[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready || !currentProjectId) return;
    const load = async () => {
      const { data } = await supabase
        .from('project_weather_locations')
        .select('*')
        .eq('project_id', currentProjectId)
        .order('created_at', { ascending: true });
      let rows = (data || []) as WeatherLocation[];
      // No saved weather locations: fall back to the project's own location, if any.
      if (rows.length === 0) {
        const { data: project } = await supabase.from('projects').select('location').eq('id', currentProjectId).maybeSingle();
        const geo = project?.location ? await geocodeLocation(project.location) : null;
        if (geo) rows = [{ id: 'project-location', name: geo.displayName, latitude: geo.latitude, longitude: geo.longitude }];
      }
      setLocations(rows);
      const storedId = localStorage.getItem(`skbequip_weather_selected_${currentProjectId}`);
      const initial = rows.find(r => r.id === storedId) || rows[0];
      setSelectedId(initial?.id || '');
    };
    load();
  }, [currentProjectId, ready]);

  const loadWeather = useCallback(async () => {
    const loc = locations.find(l => l.id === selectedId);
    if (!loc) { setLoading(false); return; }
    setLoading(true);
    const snap = await fetchWeather(loc.latitude, loc.longitude);
    if (snap) setSnapshot(snap);
    setLoading(false);
  }, [locations, selectedId]);

  useEffect(() => {
    if (!selectedId) { setLoading(false); return; }
    loadWeather();
    const interval = setInterval(loadWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedId, loadWeather]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-weather-widget]')) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const selectLocation = (id: string) => {
    setSelectedId(id);
    if (currentProjectId) localStorage.setItem(`skbequip_weather_selected_${currentProjectId}`, id);
  };

  if (!ready) return null;

  if (locations.length === 0) {
    // Only operators can open Settings, so viewers just get a hint.
    if (!isOperator) {
      return (
        <span
          title="No weather location set for this project"
          aria-label="No weather location set for this project"
          className="flex items-center px-2 py-1.5 text-muted-foreground/60"
        >
          <MapPin size={16} />
        </span>
      );
    }
    return (
      <Link
        href="/settings"
        title="Add a location in Settings to see live weather"
        aria-label="Add a weather location in Settings"
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <MapPin size={16} />
      </Link>
    );
  }

  const selected = locations.find(l => l.id === selectedId);
  const isNight = snapshot ? !snapshot.isDay : false;

  return (
    <div className="relative" data-weather-widget>
      <button
        onClick={() => setOpen(prev => !prev)}
        aria-label="Weather details"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
      >
        <span className="text-base leading-none">{loading || !snapshot ? '…' : weatherIcon(snapshot.weatherCode, snapshot.isDay)}</span>
        <span className="text-xs font-700 text-foreground font-tabular">
          {loading || !snapshot ? '—' : `${Math.round(snapshot.temperatureC)}°`}
        </span>
        <ChevronDown size={10} className="text-muted-foreground" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-60 rounded-xl overflow-hidden card-shadow-md text-white z-30"
          style={{
            background: isNight
              ? 'linear-gradient(135deg, #171d3d 0%, #262f5c 55%, #3a4574 100%)'
              : 'linear-gradient(135deg, #2c6fbb 0%, #4f92d6 55%, #8fc0ea 100%)',
          }}
        >
          <div className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-700 leading-none font-tabular">
                  {loading || !snapshot ? '—' : Math.round(snapshot.temperatureC)}
                </span>
                <span className="text-sm font-600 opacity-90">°C</span>
              </div>
              <div className="text-right">
                <span className="flex items-center justify-end gap-1 text-2xs font-600">
                  <MapPin size={10} />
                  <span className="truncate max-w-[100px]">{selected?.name.split(',')[0]}</span>
                </span>
                <p className="text-[10px] opacity-80 mt-0.5">
                  {loading || !snapshot ? 'Loading…' : weatherLabel(snapshot.weatherCode)}
                </p>
              </div>
            </div>

            {snapshot && snapshot.hourly.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-white/15 flex items-start justify-between gap-0.5">
                {snapshot.hourly.slice(0, 5).map((h, i) => (
                  <div key={`hour-${i}-${h.label}`} className="flex flex-col items-center gap-0.5 flex-1">
                    <span className="text-sm leading-none">{weatherIcon(h.weatherCode, h.isDay)}</span>
                    <span className="text-[10px] font-600 opacity-90">{Math.round(h.temperatureC)}°</span>
                    <span className="text-[9px] opacity-70">{h.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {locations.length > 1 && (
            <div className="border-t border-white/15 bg-black/10 py-1">
              {locations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => selectLocation(loc.id)}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors flex items-center gap-2 ${loc.id === selectedId ? 'font-700' : 'opacity-80'}`}
                >
                  <MapPin size={11} className="flex-shrink-0" />
                  <span className="truncate">{loc.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}